import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import axiosInstance, { STORAGE_KEYS } from "../axios/axiosInstace";
import { setDefaultIds, clearDefaultIds } from "../config/defaultOrg";
import { toast } from "sonner";

const normalizeUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    branchId: user.branchId?._id || user.branchId,
    organizationId: user.organizationId?._id || user.organizationId,
  };
};

export const useAuthStore = create(
  persist(
    (set, _get) => ({
      authUser: null,
      isLoading: false,
      isLoggingIn: false,
      isSigningUp: false,
      isCheckingAuth: true,

      checkAuth: async () => {
        set({ isCheckingAuth: true });
        const token = localStorage.getItem(STORAGE_KEYS.accessToken);
        if (!token) {
          set({ authUser: null, isCheckingAuth: false });
          return;
        }
        try {
          const res = await axiosInstance.get("/auth/me");
          const user = res.data?.data;
          if (user) {
            const normalized = normalizeUser(user);
            localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(normalized));
            // Single-branch mode: persist default IDs to localStorage
            setDefaultIds(normalized.organizationId, normalized.branchId);
            set({ authUser: normalized, isCheckingAuth: false });
          } else {
            set({ authUser: null, isCheckingAuth: false });
          }
        } catch {
          set({ authUser: null, isCheckingAuth: false });
        }
      },

      login: async ({ email, password }) => {
        set({ isLoggingIn: true });
        try {
          const res = await axiosInstance.post("/auth/login", { email, password });
          const data = res.data?.data || {};
          if (data.accessToken) {
            localStorage.setItem(STORAGE_KEYS.accessToken, data.accessToken);
          }
          if (data.refreshToken) {
            localStorage.setItem(STORAGE_KEYS.refreshToken, data.refreshToken);
          }
          if (data.user) {
            const normalized = normalizeUser(data.user);
            localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(normalized));
            // Single-branch mode: persist default IDs to localStorage
            setDefaultIds(normalized.organizationId, normalized.branchId);
            set({ authUser: normalized, isLoggingIn: false });
            toast.success(`Welcome back, ${normalized?.name || "user"}!`);
            return { success: true, user: normalized };
          }
          set({ isLoggingIn: false });
          return { success: false, message: "Login failed" };
        } catch (e) {
          set({ isLoggingIn: false });
          const msg = e.backendMessage || e.response?.data?.message || "Login failed";
          toast.error(msg);
          return { success: false, message: msg };
        }
      },

      signup: async (_formData) => {
        set({ isSigningUp: true });
        const msg =
          "Public signup is disabled. Staff accounts are created by an Owner or Manager from the dashboard.";
        toast.error(msg);
        set({ isSigningUp: false });
        return { success: false, message: msg };
      },

      changePassword: async ({ currentPassword, newPassword }) => {
        set({ isLoading: true });
        try {
          const res = await axiosInstance.post("/auth/change-password", {
            currentPassword,
            newPassword,
          });
          localStorage.removeItem(STORAGE_KEYS.accessToken);
          localStorage.removeItem(STORAGE_KEYS.refreshToken);
          set({ authUser: null, isLoading: false });
          toast.success(res.data?.message || "Password updated. Please log in again.");
          return { success: true };
        } catch (e) {
          set({ isLoading: false });
          toast.error(e.backendMessage || "Password change failed");
          return { success: false, message: e.backendMessage };
        }
      },

      updateProfile: async (profileData) => {
        set({ isLoading: true });
        try {
          const res = await axiosInstance.patch("/auth/profile", profileData);
          const updatedUser = normalizeUser(res.data?.data);
          if (updatedUser) {
            const currentUser = _get().authUser;
            const merged = { ...currentUser, ...updatedUser };
            localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(merged));
            set({ authUser: merged, isLoading: false });
          }
          toast.success("Profile updated successfully");
          return { success: true, user: updatedUser };
        } catch (e) {
          set({ isLoading: false });
          const msg = e.backendMessage || "Failed to update profile";
          toast.error(msg);
          return { success: false, message: msg };
        }
      },

      adminResetPassword: async (targetUserId, newPassword) => {
        set({ isLoading: true });
        try {
          const res = await axiosInstance.post("/auth/admin/reset-password", {
            targetUserId,
            newPassword,
          });
          set({ isLoading: false });
          toast.success(res.data?.message || "Password reset successfully");
          return { success: true, message: res.data?.message };
        } catch (e) {
          set({ isLoading: false });
          const msg = e.backendMessage || "Failed to reset password";
          toast.error(msg);
          return { success: false, message: msg };
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
          await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1"}/auth/logout`,
            refreshToken ? { refreshToken } : {}
          ).catch(() => {});
        } finally {
          localStorage.removeItem(STORAGE_KEYS.accessToken);
          localStorage.removeItem(STORAGE_KEYS.refreshToken);
          localStorage.removeItem(STORAGE_KEYS.user);
          localStorage.removeItem(STORAGE_KEYS.customerSessionToken);
          clearDefaultIds();
          set({ authUser: null, isLoading: false });
          toast.success("Logged out");
        }
      },

      createStaff: async (branchId, payload) => {
        try {
          const res = await axiosInstance.post(
            `/branches/${branchId}/users`,
            payload
          );
          toast.success("Staff user created");
          return { success: true, user: res.data?.data };
        } catch (e) {
          toast.error(e.backendMessage || "Failed to create staff");
          return { success: false, message: e.backendMessage };
        }
      },
    }),
    {
      name: "ts-auth-storage",
      partialize: (state) => ({ authUser: normalizeUser(state.authUser) }),
      onRehydrateStorage: () => (state) => {
        if (state?.authUser) {
          state.authUser = normalizeUser(state.authUser);
        }
      },
    }
  )
);
