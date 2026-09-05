import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";

export const useReportStore = create((set, get) => ({
  sales: null,
  orders: null,
  payments: null,
  food: null,
  dashboard: null,
  hourlyData: [],

  isLoading: false,
  error: null,

  fetchSalesReport: async ({ startDate, endDate } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await axiosInstance.get("/reports/sales", { params });
      set({ sales: res.data?.data || null, isLoading: false });
      return res.data?.data;
    } catch (err) {
      set({ isLoading: false, error: err.backendMessage || "Failed to fetch sales" });
      toast.error(err.backendMessage || "Failed to fetch sales report");
      return null;
    }
  },

  fetchOrdersReport: async ({ startDate, endDate } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await axiosInstance.get("/reports/orders", { params });
      set({ orders: res.data?.data || null, isLoading: false });
      return res.data?.data;
    } catch (err) {
      set({ isLoading: false, error: err.backendMessage || "Failed to fetch orders" });
      toast.error(err.backendMessage || "Failed to fetch orders report");
      return null;
    }
  },

  fetchPaymentsReport: async ({ startDate, endDate } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await axiosInstance.get("/reports/payments", { params });
      set({ payments: res.data?.data || null, isLoading: false });
      return res.data?.data;
    } catch (err) {
      set({ isLoading: false, error: err.backendMessage || "Failed to fetch payments" });
      toast.error(err.backendMessage || "Failed to fetch payments report");
      return null;
    }
  },

  fetchFoodReport: async ({ startDate, endDate } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await axiosInstance.get("/reports/food", { params });
      set({ food: res.data?.data || null, isLoading: false });
      return res.data?.data;
    } catch (err) {
      set({ isLoading: false, error: err.backendMessage || "Failed to fetch food" });
      toast.error(err.backendMessage || "Failed to fetch food report");
      return null;
    }
  },

  fetchDashboardKPIs: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await axiosInstance.get("/reports/dashboard");
      set({ dashboard: res.data?.data || null, isLoading: false });
      return res.data?.data;
    } catch (err) {
      set({ isLoading: false, error: err.backendMessage || "Failed to fetch dashboard" });
      toast.error(err.backendMessage || "Failed to fetch dashboard");
      return null;
    }
  },

  fetchHourlySales: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await axiosInstance.get("/reports/hourly-sales");
      set({ hourlyData: res.data?.data?.hourlyData || [], isLoading: false });
      return res.data?.data;
    } catch (err) {
      set({ isLoading: false, error: err.backendMessage || "Failed to fetch hourly data" });
      return null;
    }
  },

  clearReports: () => {
    set({
      sales: null,
      orders: null,
      payments: null,
      food: null,
      dashboard: null,
      hourlyData: [],
      isLoading: false,
      error: null,
    });
  },
}));
