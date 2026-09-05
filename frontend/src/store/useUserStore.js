import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";

export const useUserStore = create((set, get) => ({
    staff: [],
    isLoading: false,
    error: null,

    fetchStaff: async ({ role, isActive } = {}) => {
        set({ isLoading: true, error: null });
        try {
            const params = {};
            if (role) params.role = role;
            if (isActive !== undefined) params.isActive = isActive;
            const res = await axiosInstance.get("/users", { params });
            set({ staff: res.data?.data || [], isLoading: false });
            return res.data?.data || [];
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Failed to fetch staff" });
            return [];
        }
    },

    fetchStaffByBranch: async (branchId, { role, isActive } = {}) => {
        return get().fetchStaff({ role, isActive });
    },

    fetchUser: async (userId) => {
        set({ isLoading: true });
        try {
            const res = await axiosInstance.get(`/users/${userId}`);
            return res.data?.data;
        } catch (err) {
            toast.error(err.backendMessage || "Failed to fetch user");
            return null;
        } finally {
            set({ isLoading: false });
        }
    },

    createStaff: async (payload) => {
        set({ isLoading: true });
        try {
            const res = await axiosInstance.post("/users", payload);
            const user = res.data?.data;
            set((state) => ({ staff: [...state.staff, user], isLoading: false }));
            toast.success("Staff user created");
            return { success: true, user };
        } catch (err) {
            set({ isLoading: false });
            const msg = err.backendMessage || "Failed to create staff";
            toast.error(msg);
            return { success: false, message: msg };
        }
    },

    updateStaff: async (userId, payload) => {
        set({ isLoading: true });
        try {
            const res = await axiosInstance.patch(`/users/${userId}`, payload);
            const user = res.data?.data;
            set((state) => ({
                staff: state.staff.map((s) => (s._id === userId ? user : s)),
                isLoading: false,
            }));
            toast.success("Staff updated");
            return { success: true, user };
        } catch (err) {
            set({ isLoading: false });
            toast.error(err.backendMessage || "Failed to update staff");
            return { success: false, message: err.backendMessage };
        }
    },

    deleteStaff: async (userId) => {
        try {
            const res = await axiosInstance.delete(`/users/${userId}`);
            set((state) => ({
                staff: state.staff.map((s) =>
                    s._id === userId ? { ...s, isActive: false, deletedAt: new Date().toISOString() } : s
                ),
            }));
            toast.success(res.data?.message || "Staff deactivated");
            return { success: true };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to deactivate staff");
            return { success: false, message: err.backendMessage };
        }
    },
}));

export default useUserStore;
