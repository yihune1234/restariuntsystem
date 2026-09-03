import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";

/**
 * Shift store. Real backend contracts:
 *   POST  /shifts/start                          - open a shift (branchId in body)
 *   POST  /shifts/end                            - close current shift (closingCash + notes in body)
 *   GET   /shifts/active                         - my currently open shift
 *   GET   /branches/:branchId/shifts?status=&page=&limit=  - manager view of branch shifts
 *
 * The backend creates the shift for the logged-in user at their assigned
 * branch — so /shifts/start does NOT need a branchId. The branchId is read
 * from req.user.branchId server-side.
 */
export const useShiftStore = create((set, _get) => ({
  activeShift: null,
  myShifts: [],
  branchShifts: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  isLoading: false,
  error: null,

  fetchActiveShift: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/shifts/active");
      set({ activeShift: res.data?.data || null, isLoading: false, error: null });
    } catch {
      // 404 (no active shift) is normal
      set({ activeShift: null, isLoading: false });
    }
  },

  fetchBranchShifts: async (branchId, { status, page = 1, limit = 20 } = {}) => {
    if (!branchId) {
      set({ branchShifts: [] });
      return [];
    }
    set({ isLoading: true });
    try {
      const params = { page, limit };
      if (status) params.status = status;
      const res = await axiosInstance.get(`/branches/${branchId}/shifts`, { params });
      const meta = res.data?.meta || {};
      set({
        branchShifts: res.data?.data || [],
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
      set({ isLoading: false, error: err.backendMessage || "Error fetching shifts" });
      return [];
    }
  },

  startShift: async ({ startingCash = 0, notes = "" } = {}) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.post("/shifts/start", { startingCash, notes });
      const shift = res.data?.data;
      set({ activeShift: shift, isLoading: false });
      toast.success("Shift started");
      return { success: true, shift };
    } catch (err) {
      set({ isLoading: false });
      const msg = err.backendMessage || "Failed to start shift";
      toast.error(msg);
      return { success: false, message: msg };
    }
  },

  endShift: async ({ closingCash, notes = "" } = {}) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.post("/shifts/end", { closingCash, notes });
      set({ activeShift: null, isLoading: false });
      toast.success("Shift closed");
      return { success: true, shift: res.data?.data };
    } catch (err) {
      set({ isLoading: false });
      const msg = err.backendMessage || "Failed to end shift";
      toast.error(msg);
      return { success: false, message: msg };
    }
  },
}));