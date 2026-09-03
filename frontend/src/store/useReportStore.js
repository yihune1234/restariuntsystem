import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";
import { getDefaultOrganizationId } from "../config/defaultOrg";

/**
 * Report store for manager/owner dashboards.
 *
 * Backend contracts:
 *   GET /branches/:branchId/reports/sales       - sales summary
 *   GET /branches/:branchId/reports/orders      - order stats
 *   GET /branches/:branchId/reports/payments    - payment stats
 *   GET /branches/:branchId/reports/food        - food/item stats
 *   GET /branches/:branchId/reports/operations  - kitchen operations
 *   GET /branches/:branchId/reports/inventory   - inventory levels
 */
const useReportStore = create((set, get) => ({
  sales: null,
  orders: null,
  payments: null,
  food: null,
  operations: null,
  inventory: null,
  comparison: [],
  wastageMap: {},
  lowStockMap: {},
  organizationInventory: null,

  isLoading: false,
  error: null,

  fetchReportPeriod: async (branchId, { startDate, endDate } = {}) => {
    if (!branchId) return;
    set({ isLoading: true, error: null });

    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    try {
      const [salesRes, operationsRes, inventoryRes] = await Promise.all([
        axiosInstance.get(`/branches/${branchId}/reports/sales`, { params }).catch(() => ({ data: { data: null } })),
        axiosInstance.get(`/branches/${branchId}/reports/operations`, { params }).catch(() => ({ data: { data: null } })),
        axiosInstance.get(`/branches/${branchId}/reports/inventory`, { params }).catch(() => ({ data: { data: null } })),
      ]);

      set({
        sales: salesRes.data?.data || null,
        operations: operationsRes.data?.data || null,
        inventory: inventoryRes.data?.data || null,
        isLoading: false,
      });
    } catch (err) {
      const msg = err.backendMessage || "Failed to fetch reports";
      set({ isLoading: false, error: msg });
      toast.error(msg);
    }
  },

  fetchBranchComparisonReport: async (organizationId) => {
    const orgId = organizationId || getDefaultOrganizationId();
    if (!orgId) return;
    set({ isLoading: true, error: null });
    try {
      const res = await axiosInstance.get(`/organizations/${orgId}/reports/comparison`);
      // The backend wraps the result as { comparison: [], wastageMap: {}, lowStockMap: {} }
      // under res.data.data. Normalize it so the store always holds an array in `comparison`.
      const payload = res.data?.data || {};
      const data = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload.comparison) ? payload.comparison : []);
      set({ comparison: data, isLoading: false });

      const wastage = payload.wastageMap && typeof payload.wastageMap === 'object'
        ? { ...payload.wastageMap }
        : {};
      const lowStock = payload.lowStockMap && typeof payload.lowStockMap === 'object'
        ? { ...payload.lowStockMap }
        : {};
      data.forEach((branch) => {
        if (branch._id) {
          const key = branch._id.toString();
          if (wastage[key] === undefined) wastage[key] = branch.wastage || 0;
          if (lowStock[key] === undefined) lowStock[key] = branch.lowStockCount || 0;
        }
      });
      set({ wastageMap: wastage, lowStockMap: lowStock });
    } catch (err) {
      set({ isLoading: false, error: err.backendMessage || "Failed to fetch comparison" });
    }
  },

  fetchOrganizationInventoryOverview: async (organizationId) => {
    const orgId = organizationId || getDefaultOrganizationId();
    if (!orgId) return;
    set({ isLoading: true, error: null });
    try {
      const res = await axiosInstance.get(`/organizations/${orgId}/reports/inventory-overview`);
      set({ organizationInventory: res.data?.data || null, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.backendMessage || "Failed to fetch inventory overview" });
    }
  },

  clearReports: () => {
    set({
      sales: null,
      orders: null,
      payments: null,
      food: null,
      operations: null,
      inventory: null,
      comparison: [],
      wastageMap: {},
      lowStockMap: {},
      organizationInventory: null,
      isLoading: false,
      error: null,
    });
  },
}));

export { useReportStore };
