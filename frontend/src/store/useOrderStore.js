import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";
import { getSocket } from "../config/socket.config";

export const useOrderStore = create(
  persist(
    (set, get) => ({
      cart: [],

      isLoading: false,
      error: null,
      lastOrder: null,
      orders: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },

      listenersActive: false,

      addToCart: (item) => {
        const { cart } = get();
        const id = item.foodItemId || item._id;
        const name = item.foodName || item.name;
        const price = item.unitPrice ?? item.price;
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
              { foodItemId: id, foodName: name, unitPrice: Number(price) || 0, quantity: 1 },
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
      resetLastOrder: () => set({ lastOrder: null }),
      getCartTotal: () =>
        get().cart.reduce((sum, c) => sum + (c.unitPrice || 0) * c.quantity, 0),

      getOrders: async ({ status, paymentStatus, date, page = 1, limit = 20 } = {}) => {
        set({ isLoading: true });
        try {
          const params = { page, limit };
          if (status) params.status = status;
          if (paymentStatus) params.paymentStatus = paymentStatus;
          if (date) params.date = date;
          const res = await axiosInstance.get("/orders", { params });
          const meta = res.data?.meta || {};
          set({
            orders: res.data?.data || [],
            pagination: {
              page: meta.page || page,
              limit: meta.limit || limit,
              total: meta.total || (res.data?.data?.length || 0),
              totalPages: meta.totalPages || 1,
            },
            isLoading: false,
          });
          return res.data?.data || [];
        } catch (err) {
          set({ isLoading: false, error: err.backendMessage || "Failed to fetch orders" });
          return [];
        }
      },

      getOrderById: async (orderId) => {
        try {
          const res = await axiosInstance.get(`/orders/${orderId}`);
          return res.data?.data;
        } catch (err) {
          toast.error(err.backendMessage || "Failed to fetch order");
          return null;
        }
      },

      placeOrder: async ({ tableId, items, source = "CASHIER", customerName }) => {
        set({ isLoading: true });
        try {
          const res = await axiosInstance.post("/orders", { tableId, items, source, customerName });
          const order = res.data?.data;
          set({ lastOrder: order, isLoading: false });
          toast.success(`Order #${order?.orderNumber || order?._id?.slice(-4)} placed`);
          return { success: true, order };
        } catch (err) {
          set({ isLoading: false });
          const msg = err.backendMessage || "Failed to place order";
          toast.error(msg);
          return { success: false, message: msg };
        }
      },

      cancelOrder: async (orderId, reason = "") => {
        try {
          const res = await axiosInstance.post(`/orders/${orderId}/cancel`, { reason });
          toast.success("Order cancelled");
          return { success: true, data: res.data?.data };
        } catch (err) {
          toast.error(err.backendMessage || "Cancel failed");
          return { success: false, message: err.backendMessage };
        }
      },

      completeOrder: async (orderId) => {
        try {
          const res = await axiosInstance.post(`/orders/${orderId}/complete`);
          toast.success("Order completed");
          return { success: true, data: res.data?.data };
        } catch (err) {
          toast.error(err.backendMessage || "Complete failed");
          return { success: false, message: err.backendMessage };
        }
      },

      startPreparation: async (orderId) => {
        try {
          const res = await axiosInstance.post(`/kitchen/orders/${orderId}/start`);
          toast.success("Order → PREPARING");
          return { success: true, data: res.data?.data };
        } catch (err) {
          toast.error(err.backendMessage || "Failed to start preparation");
          return { success: false, message: err.backendMessage };
        }
      },

      markReady: async (orderId) => {
        try {
          const res = await axiosInstance.post(`/kitchen/orders/${orderId}/ready`);
          toast.success("Order → READY");
          return { success: true, data: res.data?.data };
        } catch (err) {
          toast.error(err.backendMessage || "Failed to mark ready");
          return { success: false, message: err.backendMessage };
        }
      },

      setupSocketListeners: () => {
        const { listenersActive } = get();
        if (listenersActive) return;
        const socket = getSocket();

        const onUpdate = (payload) => {
          const order = payload?.order || payload;
          if (!order?._id) return;
          set({
            orders: get().orders.map((o) => (o._id === order._id ? { ...o, ...order } : o)),
          });
        };

        const onOrderCompleted = (payload) => {
          const order = payload?.order || payload;
          if (!order?._id) return;
          set({
            orders: get().orders.map((o) => (o._id === order._id ? { ...o, ...order } : o)),
          });
          toast.success(`Order ${order.orderNumber || ''} completed`);
        };

        const onOrderCancelled = (payload) => {
          const order = payload?.order || payload;
          if (!order?.orderId) return;
          set({
            orders: get().orders.map((o) => (o._id === order.orderId ? { ...o, orderStatus: 'CANCELLED' } : o)),
          });
          toast.info(`Order ${order.orderNumber || ''} was cancelled`);
        };

        const onPaymentConfirmed = (payload) => {
          if (!payload?.orderId) return;
          set({
            orders: get().orders.map((o) =>
              o._id === payload.orderId ? { ...o, paymentStatus: 'PAID' } : o
            ),
          });
        };

        socket.on("order:created", onUpdate);
        socket.on("order:confirmed", onUpdate);
        socket.on("order:preparing", onUpdate);
        socket.on("order:ready", onUpdate);
        socket.on("order:completed", onOrderCompleted);
        socket.on("order:cancelled", onOrderCancelled);
        socket.on("payment:confirmed", onPaymentConfirmed);

        set({ listenersActive: true });
      },

      cleanupSocketListeners: () => {
        const socket = getSocket();
        [
          "order:created",
          "order:confirmed",
          "order:preparing",
          "order:ready",
          "order:completed",
          "order:cancelled",
          "payment:confirmed",
        ].forEach((ev) => socket.off(ev));
        set({ listenersActive: false });
      },
    }),
    {
      name: "ts-order-storage",
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);
