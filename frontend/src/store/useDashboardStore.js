import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";
import { getDefaultOrganizationId } from "../config/defaultOrg";

const useDashboardStore = create((set, get) => ({
    dashboardData: null,
    ownerKPIs: null,
    fraudAlerts: [],
    isLoading: false,
    error: null,

    fetchDashboardSummary: async (organizationId) => {
        const orgId = organizationId || getDefaultOrganizationId();
        if (!orgId) return;
        set({ isLoading: true });
        try {
            const res = await axiosInstance.get(
                `/organizations/${orgId}/reports/overview`
            );
            set({ dashboardData: res.data?.data, isLoading: false });
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Failed to load dashboard" });
            toast.error(err.backendMessage || "Dashboard load failed");
        }
    },

    fetchOwnerKPIs: async (organizationId, branchId = null) => {
        const orgId = organizationId || getDefaultOrganizationId();
        if (!orgId) return;
        set({ isLoading: true });
        try {
            const params = branchId ? { branchId } : {};
            const res = await axiosInstance.get(
                `/organizations/${orgId}/reports/owner-dashboard`,
                { params }
            );
            set({ ownerKPIs: res.data?.data, isLoading: false });
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Failed to load KPIs" });
            toast.error(err.backendMessage || "KPIs load failed");
        }
    },

    fetchFraudAlerts: async (branchId, days = 7) => {
        if (!branchId) return;
        set({ isLoading: true });
        try {
            const res = await axiosInstance.get(
                `/branches/${branchId}/fraud-detection/summary`,
                { params: { days } }
            );
            set({ fraudAlerts: res.data?.data || [], isLoading: false });
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Failed to load fraud alerts" });
        }
    },

    fetchBranchDailyClosing: async (branchId) => {
        try {
            const res = await axiosInstance.get(
                `/branches/${branchId}/daily-closing/today-metrics`
            );
            return res.data?.data;
        } catch (err) {
            console.error("Failed to fetch daily closing:", err);
            return null;
        }
    },
}));

export default useDashboardStore;