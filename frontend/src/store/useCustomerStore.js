import { create } from "zustand";
import { persist } from "zustand/middleware";
import axiosInstance, { STORAGE_KEYS } from "../axios/axiosInstace";
import { toast } from "sonner";
import { connectSocket, getSocket, trackOrder } from "../config/socket.config";
import { applyDefaultBrand, DEFAULT_RESTAURANT } from "../config/restaurant";

let menuListenersRegistered = false;
let menuRefreshTimer = null;

const scheduleMenuRefresh = (refetch) => {
  if (menuRefreshTimer) clearTimeout(menuRefreshTimer);
  menuRefreshTimer = setTimeout(() => {
    menuRefreshTimer = null;
    refetch();
  }, 350);
};

const listenForMenuUpdates = (refetch) => {
  const socket = getSocket();
  if (!menuListenersRegistered) {
    socket.on("menu:item-updated", () => scheduleMenuRefresh(refetch));
    socket.on("menu:item-created", () => scheduleMenuRefresh(refetch));
    socket.on("menu:category-updated", () => scheduleMenuRefresh(refetch));
    menuListenersRegistered = true;
  }
  if (!socket.connected) socket.connect();
};

export const useCustomerStore = create(
  persist(
    (set, get) => ({
      branch: null,
      menuTree: [],
      flatItems: [],
      activeMealPeriodIds: [],
      cart: [],
      lastPlacedOrder: null,
      session: null,
      canOrder: false,
      isLoading: false,
      error: null,
      customerName: null,
      customerNote: '',

      resolveBranchFromToken: async (qrToken) => {
        if (!qrToken) return null;
        try {
          const res = await axiosInstance.get(`/public/qr/${qrToken}`);
          const data = res.data?.data || {};
          set({ branch: applyDefaultBrand(data) });
          return { branchId: data.tableId, table: data, tableNumber: data.tableNumber };
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
            branch: applyDefaultBrand(data.branch || { name: DEFAULT_RESTAURANT.nameEn, nameAm: DEFAULT_RESTAURANT.nameAm }),
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

      fetchMenu: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await axiosInstance.get("/public/menu");
          const data = res.data?.data || {};
          const menuTree = data.menu || [];
          const flat = [];
          const seen = new Set();
          menuTree.forEach((mp) => {
            (mp.categories || []).forEach((cat) => {
              const catId = String(cat._id || cat.id);
              (cat.foodItems || []).forEach((f) => {
                const fid = String(f.id ?? f._id);
                if (seen.has(fid)) return;
                seen.add(fid);
                flat.push({ ...f, categoryId: catId });
              });
            });
          });
          set({
            branch: applyDefaultBrand(data.restaurant ? { name: data.restaurant.name, nameAm: data.restaurant.nameAm } : null),
            menuTree,
            flatItems: flat,
            activeMealPeriodIds: (data.activeMealPeriodIds || []).map(String),
            isLoading: false,
          });
          connectSocket();
          listenForMenuUpdates(() => get().fetchMenu());
          return data;
        } catch (err) {
          set({
            branch: applyDefaultBrand(null),
            menuTree: [],
            flatItems: [],
            activeMealPeriodIds: [],
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
        const qty = item.quantity || 1;
        const variantTotal = item.selectedVariants
          ? Object.values(item.selectedVariants).reduce((s, o) => s + (o.priceModifier || 0), 0)
          : 0;
        const basePrice = Number(item.price || 0);
        const totalUnitPrice = basePrice + variantTotal;
        if (existing) {
          set({
            cart: cart.map((c) =>
              c.foodItemId === id
                ? {
                    ...c,
                    quantity: c.quantity + qty,
                    unitPrice: totalUnitPrice,
                    variantTotal,
                    selectedVariants: item.selectedVariants || c.selectedVariants,
                    specialInstructions: item.specialInstructions || c.specialInstructions,
                  }
                : c
            ),
          });
        } else {
          set({
            cart: [
              ...cart,
              {
                foodItemId: id,
                foodName: item.name || item.foodName,
                unitPrice: totalUnitPrice,
                quantity: qty,
                variantTotal,
                selectedVariants: item.selectedVariants || {},
                specialInstructions: item.specialInstructions || "",
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
        get().cart.reduce((s, c) => s + ((c.unitPrice || 0) + (c.variantTotal || 0)) * c.quantity, 0),

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
