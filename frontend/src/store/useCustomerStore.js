import { create } from "zustand";
import { persist } from "zustand/middleware";
import axiosInstance, { STORAGE_KEYS } from "../axios/axiosInstace";
import { toast } from "sonner";
import { connectSocket, getSocket, trackOrder } from "../config/socket.config";
import { applyDefaultBrand, DEFAULT_RESTAURANT } from "../config/restaurant";

/**
 * Public customer experience - NO account, NO login, NO phone required.
 *
 * Backend flow (QR paperless ordering):
 *   1. Customer scans QR -> /customer/qr/:branchId?token=<qrToken>
 *   2. Frontend POSTs /customer-sessions { qrToken } -> gets sessionToken
 *   3. Frontend stores sessionToken in localStorage + sends x-session-token header
 *   4. GET /public/branches/:branchId/menu  - menu tree w/ live stock
 *   5. POST /orders with header x-session-token -> order created (UNPAID)
 *   6. Cashier verifies code, confirms cash/card -> order CONFIRMED -> kitchen cooks
 *   7. Customer tracks via /orders/:id (or socket 'order:track')
 */
export const useCustomerStore = create(
  persist(
    (set, get) => ({
      branch: null,
      menuTree: [],
      flatItems: [],
      cart: [],
      lastPlacedOrder: null,
      session: null,
      canOrder: false,
      isLoading: false,
      error: null,
      customerName: null,
      customerNote: '',

      /**
       * Resolve the real branch for a table QR token via the public endpoint
       * (GET /public/qr/:qrToken -> table + branch). Used as a self-healing
       * fallback when a printed QR encodes the token where the branchId belongs,
       * or when the customer lands on the menu with an unknown branch id.
       */
      resolveBranchFromToken: async (qrToken) => {
        if (!qrToken) return null;
        try {
          const res = await axiosInstance.get(`/public/qr/${qrToken}`);
          const data = res.data?.data || {};
          const branchId = data.branch?.id || data.branchId;
          if (!branchId) return null;
          set({ branch: applyDefaultBrand(data.branch || get().branch) });
          return { branchId, table: data.table || data, tableNumber: data.tableNumber };
        } catch (err) {
          return null;
        }
      },

      startSession: async (qrToken) => {
        set({ isLoading: true, error: null });
        try {
          const res = await axiosInstance.post("/customer-sessions", { qrToken });
          const data = res.data?.data || {};
          const sessionToken = data.sessionToken;
          if (sessionToken) {
            localStorage.setItem(STORAGE_KEYS.customerSessionToken, sessionToken);
          }
          set({
            session: data,
            branch: applyDefaultBrand(data.branch),
            canOrder: true,
            isLoading: false,
          });
          connectSocket();
          return { success: true, session: data };
        } catch (err) {
          set({ isLoading: false });
          toast.error(err.backendMessage || "Invalid QR code");
          return { success: false, message: err.backendMessage };
        }
      },

      closeSession: async () => {
        try {
          await axiosInstance.post("/customer-sessions/close");
        } catch { /* ignore */ }
        localStorage.removeItem(STORAGE_KEYS.customerSessionToken);
        const socket = getSocket();
        socket?.disconnect();
        set({
          session: null,
          branch: null,
          canOrder: false,
          cart: [],
          lastPlacedOrder: null,
        });
      },

      fetchMenu: async (branchId, mealPeriodId) => {
        if (!branchId) return null;
        set({ isLoading: true, error: null });
        try {
          const params = mealPeriodId ? { mealPeriodId } : {};
          const res = await axiosInstance.get(`/public/branches/${branchId}/menu`, { params });
          const data = res.data?.data || {};
          const menuTree = data.menu || [];
          const flat = [];
          menuTree.forEach((mp) => {
            (mp.categories || []).forEach((cat) => {
              const catId = String(cat._id || cat.id);
              (cat.foodItems || []).forEach((f) =>
                // Tag each flattened item with its category so the
                // per-category filter in Menu.jsx can match correctly.
                flat.push({ ...f, categoryId: catId })
              );
            });
          });
          set({
            branch: applyDefaultBrand(data.branch || get().branch),
            menuTree,
            flatItems: flat,
            isLoading: false,
          });
          return data;
        } catch (err) {
          set({
            branch: applyDefaultBrand(null),
            menuTree: [],
            flatItems: [],
            isLoading: false,
            error: err.backendMessage || "Failed to load menu. Please ensure the backend is running.",
          });
          return null;
        }
      },

      addToCart: (item) => {
        const { cart } = get();
        const id = item.id || item._id || item.foodItemId;
        const existing = cart.find((c) => c.foodItemId === id);
        if (existing) {
          set({
            cart: cart.map((c) =>
              c.foodItemId === id ? { ...c, quantity: c.quantity + 1 } : c
            ),
          });
        } else {
          set({
            cart: [
              ...cart,
              {
                foodItemId: id,
                foodName: item.name,
                unitPrice: item.price,
                quantity: 1,
              },
            ],
          });
        }
      },

      removeFromCart: (foodItemId) => {
        const { cart } = get();
        const existing = cart.find((c) => c.foodItemId === foodItemId);
        if (existing && existing.quantity > 1) {
          set({
            cart: cart.map((c) =>
              c.foodItemId === foodItemId ? { ...c, quantity: c.quantity - 1 } : c
            ),
          });
        } else {
          set({ cart: cart.filter((c) => c.foodItemId !== foodItemId) });
        }
      },

      clearCart: () => set({ cart: [] }),
      setCustomerName: (name) => set({ customerName: name }),
      setCustomerNote: (note) => set({ customerNote: note }),
      getCartTotal: () =>
        get().cart.reduce((s, c) => s + (c.unitPrice || 0) * c.quantity, 0),

      placeOrder: async () => {
        const { cart, session, canOrder, customerName, customerNote } = get();
        if (!canOrder || !session) {
          toast.error("Please scan the QR code first.");
          return { success: false, message: "no_session" };
        }
        if (cart.length === 0) {
          toast.error("Your cart is empty.");
          return { success: false, message: "empty_cart" };
        }

        set({ isLoading: true });
        try {
          const items = cart.map((c) => ({
            foodItemId: c.foodItemId,
            quantity: c.quantity,
            notes: c.notes || "",
          }));
          const res = await axiosInstance.post("/orders", {
            branchId: session.branchId,
            tableId: session.tableId,
            customerName: customerName || null,
            customerNote: (customerNote || "").slice(0, 500),
            items,
            source: "CUSTOMER_QR",
          });
          const order = res.data?.data;
          set({ lastPlacedOrder: order, cart: [], isLoading: false, customerName: null, customerNote: '' });
          toast.success("Order placed!");
          trackOrder(order._id);
          return { success: true, order };
        } catch (err) {
          set({ isLoading: false });
          toast.error(err.backendMessage || "Failed to place order");
          return { success: false, message: err.backendMessage };
        }
      },

      fetchOrder: async (orderId) => {
        try {
          const res = await axiosInstance.get(`/orders/${orderId}`);
          return { success: true, order: res.data?.data };
        } catch (err) {
          return { success: false, message: err.backendMessage || "Order not found" };
        }
      },

      /**
       * PUBLIC fallback: track an order by its 4-digit pickup code (no auth).
       * Used when the tracking link is lost. Requires socket re-tracking so
       * live updates continue for the resolved order.
       */
      findOrderByCode: async (code) => {
        try {
          const res = await axiosInstance.get(`/orders/public/code/${code}`);
          const order = res.data?.data;
          if (order?._id) trackOrder(order._id);
          return { success: true, order };
        } catch (err) {
          return { success: false, message: err.backendMessage || "No order found with that code" };
        }
      },

      resetOrder: () => set({ lastPlacedOrder: null }),
    }),
    {
      name: "ts-customer-storage",
      partialize: (state) => ({ cart: state.cart, lastPlacedOrder: state.lastPlacedOrder }),
    }
  )
);
