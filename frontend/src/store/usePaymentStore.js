import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";
import { PAYMENT_METHODS } from "../config/paymentMethods";

/**
 * Cashier payment store. Real backend contracts:
 *   POST /orders/:orderId/payment/confirm         - confirm cash/card in person
 *   POST /orders/:orderId/payment/chapa/initiate  - start Chapa redirect
 *   GET  /orders/:orderId/payment                  - read payment for an order
 *   POST /payments/chapa/verify                    - server-side Chapa verification
 *   POST /payments/chapa/webhook                   - Chapa IPN (server-to-server)
 *
 * Payment methods are sourced from ../config/paymentMethods (single source of truth).
 */
export { PAYMENT_METHODS };
export const usePaymentStore = create((set, _get) => ({
  verifiedOrder: null,
  transactions: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  isLoading: false,

  fetchOrderForPayment: async (orderId) => {
    set({ isLoading: true, verifiedOrder: null });
    try {
      const res = await axiosInstance.get(`/orders/${orderId}`);
      const order = res.data?.data;
      set({ verifiedOrder: order, isLoading: false });
      return { success: true, order };
    } catch (err) {
      set({ isLoading: false });
      toast.error(err.backendMessage || "Order not found");
      return { success: false, message: err.backendMessage };
    }
  },

  /** Find an unpaid order by 4-digit securityCode within a branch. */
  findBySecurityCode: async (branchId, code) => {
    set({ isLoading: true, verifiedOrder: null });
    try {
      const res = await axiosInstance.get(`/branches/${branchId}/orders/code/${code}`);
      const matches = res.data?.data || [];
      const order = matches[0] || null;
      if (!order) {
        set({ isLoading: false });
        toast.error("No active order found with that code");
        return { success: false, message: "Not found" };
      }
      set({ verifiedOrder: order, isLoading: false });
      return { success: true, order, matches };
    } catch (err) {
      set({ isLoading: false });
      toast.error(err.backendMessage || "Lookup failed");
      return { success: false, message: err.backendMessage };
    }
  },

  clearVerifiedOrder: () => set({ verifiedOrder: null }),

  confirmCashierPayment: async (orderId, { paymentMethod = "CASH" } = {}) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.post(
        `/orders/${orderId}/payment/confirm`,
        { paymentMethod }
      );
      set({ verifiedOrder: null, isLoading: false });
      toast.success("Payment confirmed \u2022 sent to kitchen");
      return { success: true, data: res.data?.data };
    } catch (err) {
      set({ isLoading: false });
      toast.error(err.backendMessage || "Failed to confirm payment");
      return { success: false, message: err.backendMessage };
    }
  },

  initiateChapa: async (orderId, { email, firstName } = {}) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.post(
        `/orders/${orderId}/payment/chapa/initiate`,
        { email, firstName }
      );
      set({ isLoading: false });
      return { success: true, data: res.data?.data };
    } catch (err) {
      set({ isLoading: false });
      toast.error(err.backendMessage || "Chapa initiation failed");
      return { success: false, message: err.backendMessage };
    }
  },

  fetchOrderPayment: async (orderId) => {
    try {
      const res = await axiosInstance.get(`/orders/${orderId}/payment`);
      return res.data?.data;
    } catch (err) {
      toast.error(err.backendMessage || "Failed to fetch payment");
      return null;
    }
  },

  fetchTransactions: async (branchId, { startDate, endDate } = {}) => {
    if (!branchId) {
      set({ transactions: [] });
      return [];
    }
    set({ isLoading: true });
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await axiosInstance.get(
        `/branches/${branchId}/reports/payments`,
        { params }
      );
      const raw = res.data?.data || {};
      const rows = [];
      // The backend returns: { branchId, period, breakdown: [{_id: 'PROVIDER',
      // totalAmount, transactionCount}] }. Normalise the breakdown array into
      // the shape the UI expects ({ provider, totalAmount, count }).
      Object.entries(raw).forEach(([key, val]) => {
        if (key === "branchId" || key === "period" || key === "totals") return;
        if (Array.isArray(val)) {
          val.forEach((p) =>
            rows.push({
              provider: p._id || p.provider,
              totalAmount: p.totalAmount || p.amount || 0,
              count: p.transactionCount || p.count || p.totalCount || 0,
            })
          );
        } else if (val && typeof val === "object") {
          rows.push({ provider: key, ...val });
        }
      });
      set({ transactions: rows, isLoading: false });
      return rows;
    } catch (err) {
      set({ isLoading: false });
      toast.error(err.backendMessage || "Failed to fetch payments");
      return [];
    }
  },
}));
