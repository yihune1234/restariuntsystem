import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";

export const useBranchStore = create((set, get) => ({
  branches: [],
  currentBranch: null,
  isLoading: false,
  error: null,

  fetchPublicBranches: async () => {
    set({ isLoading: true, error: null });
    set({ branches: [], isLoading: false });
    return [];
  },

  fetchBranches: async () => {
    set({ isLoading: true, error: null });
    set({ branches: [], isLoading: false });
    return [];
  },

  fetchBranch: async () => {
    set({ currentBranch: null });
    return null;
  },

  createBranch: async () => {
    toast.error("Branch management not supported in single-restaurant mode");
    return { success: false, message: "Not supported" };
  },

  updateBranch: async () => {
    toast.error("Branch management not supported in single-restaurant mode");
    return { success: false, message: "Not supported" };
  },

  deleteBranch: async () => {
    toast.error("Branch management not supported in single-restaurant mode");
    return { success: false, message: "Not supported" };
  },

  generateQr: async (tableId) => {
    try {
      const res = await axiosInstance.post(`/tables/${tableId}/regenerate-qr`);
      const table = res.data?.data;
      return { success: true, qr: { url: `/customer/qr/${tableId}?t=${table.qrToken}` }, table };
    } catch (err) {
      const msg = err.backendMessage || "Failed to generate QR";
      toast.error(msg);
      return { success: false, message: msg };
    }
  },
}));
