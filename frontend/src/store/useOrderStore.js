import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";
import { getSocket } from "../config/socket.config";
import { getDefaultOrganizationId } from "../config/defaultOrg";

/**
 * Order store used by waiter, cashier, manager, owner dashboards.
 *
 * Backend contracts used:
 *   POST  /orders                                - create order (customer or staff)
 *   GET   /orders/:orderId                       - get single
 *   POST  /orders/:orderId/cancel                - cancel (owner/manager/cashier)
 *   GET   /branches/:branchId/orders             - paginated branch orders (filterable)
 *   POST  /orders/:orderId/payment/confirm       - cashier confirm cash/card
 *   POST  /orders/:orderId/payment/chapa/initiate
 *   GET   /kitchen/orders                        - KDS queue
 *   POST  /kitchen/orders/:orderId/start         - CONFIRMED -> PREPARING
 *   POST  /kitchen/orders/:orderId/ready         - PREPARING -> READY
 *   GET   /waiter/orders/ready                   - waiter's pickup queue
 *   POST  /waiter/orders/:orderId/take           - READY -> TAKEN_BY_WAITER
 *   POST  /waiter/orders/:orderId/deliver        - TAKEN_BY_WAITER -> DELIVERED+COMPLETED
 */
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

      getBranchOrders: async (
        branchId,
        { status, paymentStatus, date, tableId, source, page = 1, limit = 20 } = {}
      ) => {
        if (!branchId) {
          set({ orders: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
          return [];
        }
        set({ isLoading: true });
        try {
          const params = { page, limit };
          if (status) params.status = status;
          if (paymentStatus) params.paymentStatus = paymentStatus;
          if (date) params.date = date;
          if (tableId) params.tableId = tableId;
          if (source) params.source = source;
          const res = await axiosInstance.get(`/branches/${branchId}/orders`, { params });
          const meta = res.data?.meta || {};
          set({
            orders: res.data?.data || [],
            pagination: {
              page: meta.page || page,
              limit: meta.limit || limit,
              total: meta.total ?? (res.data?.data?.length || 0),
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

      getOrgOrders: async (organizationId, options = {}) => {
        // Support both call styles:
        //   getOrgOrders() / getOrgOrders({ limit, status, ... })  — org from default
        //   getOrgOrders(orgId, { limit, status, ... })            — explicit org
        let orgId = organizationId;
        let opts = options;
        if (orgId && typeof orgId === 'object' && !(orgId instanceof Date)) {
          // First arg is actually the options bag → derive org from defaults.
          opts = orgId;
          orgId = getDefaultOrganizationId();
        }
        if (!orgId) orgId = getDefaultOrganizationId();
        if (typeof orgId === 'object' && orgId) orgId = orgId?._id || orgId?.id;
        const {
          status, paymentStatus, date, limit = 100,
        } = opts;
        if (!orgId) {
          set({ orders: [], isLoading: false });
          return [];
        }
        set({ isLoading: true });
        try {
          const branchesRes = await axiosInstance.get(`/organizations/${orgId}/branches`);
          const branches = branchesRes.data?.data || [];
          const branchIds = branches.map(b => b._id).filter(Boolean);

          if (branchIds.length === 0) {
            set({ orders: [], isLoading: false });
            return [];
          }

          // Backend caps per-branch `limit` at 100. We want `limit` total
          // orders across all branches, so split evenly and cap at 100.
          // If the requested total is larger than 100, paginate branch by branch.
          const PER_BRANCH_MAX = 100;
          const allOrders = [];
          if (limit <= PER_BRANCH_MAX) {
            const perBranch = Math.max(1, Math.ceil(limit / branchIds.length));
            const params = { limit: perBranch };
            if (status) params.status = status;
            if (paymentStatus) params.paymentStatus = paymentStatus;
            if (date) params.date = date;
            const ordersRes = await Promise.all(
              branchIds.map(branchId =>
                axiosInstance.get(`/branches/${branchId}/orders`, { params: { ...params, page: 1 } })
                  .catch(() => ({ data: { data: [] } }))
              )
            );
            allOrders.push(...ordersRes.flatMap(res => res.data?.data || []));
          } else {
            // Total > 100 → paginate each branch until we have enough.
            let page = 1;
            const perBranch = PER_BRANCH_MAX;
            const baseParams = { limit: perBranch };
            if (status) baseParams.status = status;
            if (paymentStatus) baseParams.paymentStatus = paymentStatus;
            if (date) baseParams.date = date;
            while (allOrders.length < limit) {
              const params = { ...baseParams, page };
              const ordersRes = await Promise.all(
                branchIds.map(branchId =>
                  axiosInstance.get(`/branches/${branchId}/orders`, { params })
                    .catch(() => ({ data: { data: [] } }))
                )
              );
              const batch = ordersRes.flatMap(res => res.data?.data || []);
              if (batch.length === 0) break; // no more data
              allOrders.push(...batch);
              if (batch.length < perBranch * branchIds.length) break; // last page
              page += 1;
              if (page > 50) break; // safety
            }
          }

          allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          set({
            orders: allOrders.slice(0, limit),
            pagination: { page: 1, limit, total: allOrders.length, totalPages: 1 },
            isLoading: false,
          });
          return allOrders;
        } catch (err) {
          set({ isLoading: false, error: err.backendMessage || "Failed to fetch organization orders" });
          return [];
        }
      },

      placeOrder: async ({ branchId, tableId, items, source = "CASHIER" }) => {
        set({ isLoading: true });
        try {
          const res = await axiosInstance.post("/orders", { branchId, tableId, items, source });
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
          toast.success("Order → READY for pickup");
          return { success: true, data: res.data?.data };
        } catch (err) {
          toast.error(err.backendMessage || "Failed to mark ready");
          return { success: false, message: err.backendMessage };
        }
      },

      takeOrder: async (orderId) => {
        try {
          const res = await axiosInstance.post(`/waiter/orders/${orderId}/take`);
          toast.success("Order claimed");
          return { success: true, data: res.data?.data };
        } catch (err) {
          toast.error(err.backendMessage || "Failed to claim order");
          return { success: false, message: err.backendMessage };
        }
      },

      deliverOrder: async (orderId) => {
        try {
          const res = await axiosInstance.post(`/waiter/orders/${orderId}/deliver`);
          toast.success("Order delivered & completed");
          return { success: true, data: res.data?.data };
        } catch (err) {
          toast.error(err.backendMessage || "Failed to deliver order");
          return { success: false, message: err.backendMessage };
        }
      },

      setupSocketListeners: () => {
        const { listenersActive } = get();
        if (listenersActive) return;
        const socket = getSocket();

        const onNew = (payload) => {
          const order = payload?.order || payload;
          if (!order?._id) return;
          const exists = get().orders.some((o) => o._id === order._id);
          if (!exists) set({ orders: [order, ...get().orders] });
        };

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

        const onFoodSoldOut = (payload) => {
          if (!payload?.foodName) return;
          toast.warning(`${payload.foodName} is now sold out!`);
        };

        const onPaymentConfirmed = (payload) => {
          if (!payload?.orderId) return;
          set({
            orders: get().orders.map((o) =>
              o._id === payload.orderId ? { ...o, paymentStatus: 'PAID' } : o
            ),
          });
        };

        socket.on("order:created", onNew);
        socket.on("order:confirmed", onUpdate);
        socket.on("order:preparing", onUpdate);
        socket.on("order:ready", onUpdate);
        socket.on("order:taken", onUpdate);
        socket.on("order:delivered", onUpdate);
        socket.on("order:completed", onOrderCompleted);
        socket.on("order:cancelled", onOrderCancelled);
        socket.on("food:sold-out", onFoodSoldOut);
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
          "order:taken",
          "order:delivered",
          "order:completed",
          "order:cancelled",
          "food:sold-out",
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
