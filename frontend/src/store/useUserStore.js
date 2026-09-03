import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";

/**
 * Staff user store. Real backend contracts:
 *   GET    /branches/:branchId/users          - list branch staff
 *   POST   /branches/:branchId/users          - create staff
 *   GET    /users/:userId                     - get single
 *   PATCH  /users/:userId                     - update name/role/phone/isActive
 *   DELETE /users/:userId                     - deactivate (soft delete)
 */
export const useUserStore = create((set) => ({
    staff: [],
    isLoading: false,
    error: null,

    /** Fetch staff assigned to a specific branch. */
    fetchStaffByBranch: async (branchId, { role, isActive } = {}) => {
        set({ isLoading: true, error: null });
        try {
            const params = {};
            if (role) params.role = role;
            if (isActive !== undefined) params.isActive = isActive;
            const res = await axiosInstance.get(`/branches/${branchId}/users`, { params });
            set({ staff: res.data?.data || [], isLoading: false });
            return res.data?.data || [];
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Failed to fetch staff" });
            return [];
        }
    },

    /** Fetch a single user by id (any staff can view their own). */
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

    /** Create new staff for a branch (Manager/Owner only). */
    createStaff: async (branchId, payload) => {
        set({ isLoading: true });
        try {
            const res = await axiosInstance.post(`/branches/${branchId}/users`, payload);
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

    /** Update a user's profile / role / active status. */
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

    /** Soft-delete (deactivate) a staff user. */
    deleteStaff: async (userId) => {
        try {
            const res = await axiosInstance.delete(`/users/${userId}`);
            // Backend marks isActive=false & deletedAt=now.
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
