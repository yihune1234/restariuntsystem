import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";
import { getDefaultOrganizationId } from "../config/defaultOrg";

/**
 * Customer feedback / complaints store. Real backend contracts:
 *   GET  /feedback/:branchId             - list feedback (OWNER/MANAGER)
 *   GET  /feedback/:branchId/stats       - aggregate stats (OWNER/MANAGER)
 *   PATCH /feedback/:feedbackId/resolve  - mark feedback resolved (OWNER/MANAGER)
 *
 * Used by the Manager "Customers" page (ManagerComplaints) to surface the
 * feedback customers actually submit via the QR flow instead of fabricated rows.
 */
export const useFeedbackStore = create((set, get) => ({
  feedbacks: [],
  stats: null,
  pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
  isLoading: false,

  fetchBranchFeedback: async (branchId, { includeResolved = false, page = 1, limit = 50 } = {}) => {
    if (!branchId) {
      set({ feedbacks: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
      return { success: false };
    }
    set({ isLoading: true });
    try {
      const params = { includeResolved, page, limit };
      const res = await axiosInstance.get(`/feedback/${branchId}`, { params });
      const data = res.data?.data || {};
      const feedbacks = Array.isArray(data.feedbacks) ? data.feedbacks : [];
      set({
        feedbacks,
        pagination: {
          page: data.page || page,
          limit: data.limit || limit,
          total: data.total || 0,
          totalPages: data.totalPages || 0,
        },
        isLoading: false,
      });
      return { success: true, data };
    } catch (err) {
      set({ isLoading: false, feedbacks: [] });
      toast.error(err.backendMessage || "Failed to load customer feedback");
      return { success: false, message: err.backendMessage };
    }
  },

  fetchBranchStats: async (branchId, days = 30) => {
    if (!branchId) return null;
    try {
      const res = await axiosInstance.get(`/feedback/${branchId}/stats`, { params: { days } });
      const stats = res.data?.data || null;
      set({ stats });
      return stats;
    } catch (err) {
      toast.error(err.backendMessage || "Failed to load feedback stats");
      return null;
    }
  },

  resolveFeedback: async (feedbackId, resolutionNotes = "Issue addressed and resolved") => {
    try {
      const res = await axiosInstance.patch(`/feedback/${feedbackId}/resolve`, { resolutionNotes });
      const updated = res.data?.data;
      // Remove the resolved item from the open list and refresh stats.
      set((state) => ({
        feedbacks: state.feedbacks.filter((f) => f._id !== feedbackId),
      }));
      get().refreshStats();
      toast.success("Feedback resolved");
      return { success: true, data: updated };
    } catch (err) {
      toast.error(err.backendMessage || "Failed to resolve feedback");
      return { success: false, message: err.backendMessage };
    }
  },

  updateFeedbackStatus: async (feedbackId, status) => {
    try {
      const res = await axiosInstance.patch(`/feedback/${feedbackId}/status`, { status });
      const updated = res.data?.data;
      set((state) => ({
        feedbacks: state.feedbacks.map((f) => (f._id === feedbackId ? { ...f, ...updated } : f)),
      }));
      get().refreshStats();
      toast.success(`Status updated to ${status.toLowerCase()}`);
      return { success: true, data: updated };
    } catch (err) {
      toast.error(err.backendMessage || "Failed to update status");
      return { success: false, message: err.backendMessage };
    }
  },

  /** OWNER-only org-wide analytics: averages, positive/negative %, ideas,
   *  complaints, distribution, daily trend. */
  fetchOrganizationAnalytics: async (organizationId, { days = 30, branchId = null } = {}) => {
    const orgId = organizationId || getDefaultOrganizationId();
    if (!orgId) return null;
    try {
      const params = { days };
      if (branchId) params.branchId = branchId;
      const res = await axiosInstance.get(
        `/feedback/organization/${orgId}/analytics`,
        { params }
      );
      return res.data?.data || null;
    } catch (err) {
      toast.error(err.backendMessage || "Failed to load feedback analytics");
      return null;
    }
  },

  refreshStats: () => {
    const branchId = get()._branchId;
    if (branchId) get().fetchBranchStats(branchId);
  },

  setBranchId: (branchId) => set({ _branchId: branchId }),
}));
