import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";

/**
 * Menu store wired to the real backend.
 *
 * Backend exposes a strict hierarchy: MealPeriod -> Category -> FoodItem.
 * All are branch-scoped.
 *
 *   MealPeriods:
 *     GET/POST/PATCH/DELETE /branches/:branchId/meal-periods
 *   Categories:
 *     GET/POST/PATCH/DELETE /branches/:branchId/categories
 *   Food items:
 *     GET/POST/PATCH/DELETE /branches/:branchId/food-items
 *     GET/PATCH/DELETE /food-items/:foodId
 *     POST /food-items/:foodId/image   (multipart image upload)
 *     DELETE /food-items/:foodId/image
 *
 * For customer browsing (no auth):
 *   GET /public/branches/:branchId/menu   - full structured menu with stock
 */
export const useMenuStore = create((set) => ({
    isLoading: false,
    error: null,

    menu: [],
    category: [],
    mealTypes: [],

    publicMenu: null,
    publicBranch: null,

    auditLogs: [],
    auditPagination: null,

    // --- Meal Periods ---

    getMealPeriodsByBranch: async (branchId, { activeOnly = false } = {}) => {
        set({ isLoading: true, error: null });
        try {
            const res = await axiosInstance.get(
                `/branches/${branchId}/meal-periods`,
                { params: activeOnly ? { activeOnly: true } : {} }
            );
            const list = res.data?.data || [];
            set({ mealTypes: list, isLoading: false });
            return list;
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Error fetching meal periods" });
            return [];
        }
    },

    createMealPeriod: async (branchId, payload) => {
        try {
            const res = await axiosInstance.post(
                `/branches/${branchId}/meal-periods`,
                payload
            );
            const mp = res.data?.data;
            set((state) => ({ mealTypes: [...state.mealTypes, mp] }));
            toast.success("Meal period created");
            return { success: true, data: mp };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to create meal period");
            return { success: false, message: err.backendMessage };
        }
    },

    updateMealPeriod: async (mealPeriodId, payload) => {
        try {
            const res = await axiosInstance.patch(`/meal-periods/${mealPeriodId}`, payload);
            const mp = res.data?.data;
            set((state) => ({
                mealTypes: state.mealTypes.map((m) => (m._id === mealPeriodId ? mp : m)),
            }));
            toast.success("Meal period updated");
            return { success: true, data: mp };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to update meal period");
            return { success: false, message: err.backendMessage };
        }
    },

    deleteMealPeriod: async (mealPeriodId) => {
        try {
            await axiosInstance.delete(`/meal-periods/${mealPeriodId}`);
            set((state) => ({
                mealTypes: state.mealTypes.filter((m) => m._id !== mealPeriodId),
            }));
            toast.success("Meal period deleted");
            return { success: true };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to delete meal period");
            return { success: false, message: err.backendMessage };
        }
    },

    // --- Categories ---

    getCategoriesByBranch: async (branchId, { mealPeriodId, activeOnly = false } = {}) => {
        set({ isLoading: true, error: null });
        try {
            const params = {};
            if (mealPeriodId) params.mealPeriodId = mealPeriodId;
            if (activeOnly) params.activeOnly = true;
            const res = await axiosInstance.get(
                `/branches/${branchId}/categories`,
                { params }
            );
            const list = res.data?.data || [];
            set({ category: list, isLoading: false });
            return list;
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Error fetching categories" });
            return [];
        }
    },

    createCategory: async (branchId, payload) => {
        try {
            const res = await axiosInstance.post(
                `/branches/${branchId}/categories`,
                payload
            );
            const cat = res.data?.data;
            set((state) => ({ category: [...state.category, cat] }));
            toast.success("Category created");
            return { success: true, data: cat };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to create category");
            return { success: false, message: err.backendMessage };
        }
    },

    updateCategory: async (categoryId, payload) => {
        try {
            const res = await axiosInstance.patch(`/categories/${categoryId}`, payload);
            const cat = res.data?.data;
            set((state) => ({
                category: state.category.map((c) => (c._id === categoryId ? cat : c)),
            }));
            toast.success("Category updated");
            return { success: true, data: cat };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to update category");
            return { success: false, message: err.backendMessage };
        }
    },

    deleteCategory: async (categoryId) => {
        try {
            await axiosInstance.delete(`/categories/${categoryId}`);
            set((state) => ({
                category: state.category.filter((c) => c._id !== categoryId),
            }));
            toast.success("Category deleted");
            return { success: true };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to delete category");
            return { success: false, message: err.backendMessage };
        }
    },

    // --- Food Items ---

    getFoodItemsByBranch: async (
        branchId,
        { categoryId, availableOnly = false, activeOnly = false } = {}
    ) => {
        set({ isLoading: true, error: null });
        try {
            const params = {};
            if (categoryId) params.categoryId = categoryId;
            if (availableOnly) params.availableOnly = true;
            if (activeOnly) params.activeOnly = true;
            const res = await axiosInstance.get(
                `/branches/${branchId}/food-items`,
                { params }
            );
            const list = res.data?.data || [];
            set({ menu: list, isLoading: false });
            return list;
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Error fetching food items" });
            return [];
        }
    },

    getFoodItemById: async (foodId) => {
        try {
            const res = await axiosInstance.get(`/food-items/${foodId}`);
            return res.data?.data;
        } catch (err) {
            toast.error(err.backendMessage || "Failed to fetch food item");
            return null;
        }
    },

    createFoodItem: async (branchId, payload) => {
        try {
            const res = await axiosInstance.post(
                `/branches/${branchId}/food-items`,
                payload
            );
            const item = res.data?.data;
            set((state) => ({ menu: [...state.menu, item] }));
            toast.success("Food item created");
            return { success: true, data: item };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to create food item");
            return { success: false, message: err.backendMessage };
        }
    },

    updateFoodItem: async (foodId, payload) => {
        try {
            const res = await axiosInstance.patch(`/food-items/${foodId}`, payload);
            const item = res.data?.data;
            set((state) => ({
                menu: state.menu.map((m) => (m._id === foodId ? item : m)),
            }));
            toast.success("Food item updated");
            return { success: true, data: item };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to update food item");
            return { success: false, message: err.backendMessage };
        }
    },

    deleteFoodItem: async (foodId) => {
        try {
            await axiosInstance.delete(`/food-items/${foodId}`);
            set((state) => ({
                menu: state.menu.filter((m) => m._id !== foodId),
            }));
            toast.success("Food item deleted");
            return { success: true };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to delete food item");
            return { success: false, message: err.backendMessage };
        }
    },

    uploadFoodImage: async (foodId, file) => {
        try {
            const fd = new FormData();
            fd.append("image", file);
            const res = await axiosInstance.post(
                `/food-items/${foodId}/image`,
                fd,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            toast.success("Image uploaded");
            return { success: true, data: res.data?.data };
        } catch (err) {
            toast.error(err.backendMessage || "Image upload failed");
            return { success: false, message: err.backendMessage };
        }
    },

    removeFoodImage: async (foodId) => {
        try {
            await axiosInstance.delete(`/food-items/${foodId}/image`);
            toast.success("Image removed");
            return { success: true };
        } catch (err) {
            toast.error(err.backendMessage || "Image removal failed");
            return { success: false, message: err.backendMessage };
        }
    },

    // --- Public menu (no auth, used by customer pages) ---

    fetchPublicMenu: async (branchId, mealPeriodId) => {
        set({ isLoading: true, error: null });
        try {
            const params = mealPeriodId ? { mealPeriodId } : {};
            const res = await axiosInstance.get(
                `/public/branches/${branchId}/menu`,
                { params }
            );
            const data = res.data?.data || {};
            set({
                publicBranch: data.branch,
                publicMenu: data.menu || [],
                isLoading: false,
            });
            return data;
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Failed to load menu" });
            return null;
        }
    },

    // --- Audit Logs (Owner/Manager activity tracking) ---

    fetchAuditLogs: async (branchId, { action, entityType, userId, page = 1, limit = 50 } = {}) => {
        set({ isLoading: true, error: null });
        try {
            const params = { page, limit };
            if (action) params.action = action;
            if (entityType) params.entityType = entityType;
            if (userId) params.userId = userId;
            const res = await axiosInstance.get(
                `/branches/${branchId}/audit-logs`,
                { params }
            );
            const logs = res.data?.data || [];
            const pagination = res.data?.meta || null;
            set({ auditLogs: logs, auditPagination: pagination, isLoading: false });
            return { logs, pagination };
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Failed to load audit logs" });
            return { logs: [], pagination: null };
        }
    },
}));
