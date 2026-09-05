import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";
import { getSocket, connectSocket } from "../config/socket.config";

const useDashboardStore = create((set, get) => ({
  ownerKPIs: null,
  hourlySales: [],
  foodReport: { topSellingFood: [] },
  ordersReport: { byStatus: [], bySource: [] },
  categoryReport: { categories: [] },
  isLoading: false,
  isFetchingCharts: false,
  error: null,
  lastUpdated: null,

  fetchOwnerKPIs: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/reports/dashboard");
      set({ ownerKPIs: res.data?.data, isLoading: false, lastUpdated: new Date(), error: null });
      return res.data?.data;
    } catch (err) {
      set({ isLoading: false, error: err.backendMessage || "Failed to load KPIs" });
      return null;
    }
  },

  fetchHourlySales: async () => {
    try {
      const res = await axiosInstance.get("/reports/hourly-sales");
      const data = res.data?.data || {};
      set({ hourlySales: data.hourlyData || [] });
      return data;
    } catch (err) {
      return null;
    }
  },

  fetchFoodReport: async ({ startDate, endDate } = {}) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await axiosInstance.get("/reports/food", { params });
      const data = res.data?.data || {};
      const categoryBreakdown = (data.categoryBreakdown || []).sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0));
      const topSellingFood = (data.topSellingFood || []).slice(0, 15);
      set({ foodReport: { topSellingFood, categoryBreakdown } });
      return data;
    } catch (err) {
      return null;
    }
  },

  fetchOrdersReport: async ({ startDate, endDate } = {}) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await axiosInstance.get("/reports/orders", { params });
      const data = res.data?.data || {};
      set({ ordersReport: { byStatus: data.byStatus || [], bySource: data.bySource || [] } });
      return data;
    } catch (err) {
      return null;
    }
  },

  fetchAllDashboardData: async () => {
    set({ isFetchingCharts: true });
    await Promise.all([
      get().fetchOwnerKPIs(),
      get().fetchHourlySales(),
      get().fetchFoodReport(),
      get().fetchOrdersReport(),
    ]);
    set({ isFetchingCharts: false });
  },

  listenForRealTimeUpdates: () => {
    const socket = getSocket();
    if (!socket) {
      connectSocket();
    }
    const s = getSocket();

    const handleUpdate = () => {
      get().fetchOwnerKPIs();
      get().fetchHourlySales();
      get().fetchFoodReport();
    };

    s.on("order:created", handleUpdate);
    s.on("order:confirmed", handleUpdate);
    s.on("order:ready", handleUpdate);
    s.on("order:completed", handleUpdate);
    s.on("order:delivered", handleUpdate);
    s.on("order:cancelled", handleUpdate);
    s.on("payment:confirmed", handleUpdate);

    return () => {
      s.off("order:created", handleUpdate);
      s.off("order:confirmed", handleUpdate);
      s.off("order:ready", handleUpdate);
      s.off("order:completed", handleUpdate);
      s.off("order:delivered", handleUpdate);
      s.off("order:cancelled", handleUpdate);
      s.off("payment:confirmed", handleUpdate);
    };
  },
}));

export default useDashboardStore;
