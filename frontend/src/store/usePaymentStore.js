import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";

export const PAYMENT_METHODS = ['CASH', 'TELEBIRR', 'CARD', 'ONLINE'];

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

  clearVerifiedOrder: () => set({ verifiedOrder: null }),

  fetchTransactions: async ({ page = 1, limit = 50 } = {}) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/orders", { params: { page, limit } });
      const orders = res.data?.data || [];
      const paidOrders = orders.filter((o) => o.paymentStatus === "PAID");
      const byMethod = paidOrders.reduce((acc, o) => {
        const method = o.paymentMethod || "CASH";
        if (!acc[method]) acc[method] = { totalAmount: 0, count: 0 };
        acc[method].totalAmount += o.total || 0;
        acc[method].count += 1;
        return acc;
      }, {});
      const transactions = Object.entries(byMethod).map(([provider, data]) => ({
        provider,
        totalAmount: data.totalAmount,
        count: data.count,
      }));
      set({ transactions, isLoading: false });
      return transactions;
    } catch {
      set({ isLoading: false });
      return [];
    }
  },

  findBySecurityCode: async (code) => {
    try {
      const res = await axiosInstance.get("/orders", { params: { securityCode: code, limit: 5 } });
      const orders = res.data?.data || [];
      if (orders.length === 0) return { success: false, message: "No order found" };
      return { success: true, order: orders[0] };
    } catch (err) {
      return { success: false, message: err.backendMessage || "Not found" };
    }
  },

  confirmCashierPayment: async (orderId, { paymentMethod = "CASH" } = {}) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.post(
        `/orders/${orderId}/payment/confirm`,
        { paymentMethod }
      );
      set({ verifiedOrder: null, isLoading: false });
      toast.success("Payment confirmed");
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
}));
