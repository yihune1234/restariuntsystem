import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";

export const useMenuStore = create((set, get) => ({
    isLoading: false,
    error: null,

    categories: [],
    foodItems: [],
    mealPeriods: [],

    publicMenu: null,

    getCategories: async ({ activeOnly = false } = {}) => {
        set({ isLoading: true, error: null });
        try {
            const params = activeOnly ? { activeOnly: true } : {};
            const res = await axiosInstance.get("/categories", { params });
            const list = res.data?.data || [];
            set({ categories: list, isLoading: false });
            return list;
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Error fetching categories" });
            return [];
        }
    },

    getCategoriesByBranch: async (branchId, { mealPeriodId } = {}) => {
        return get().getCategories({ activeOnly: true });
    },

    getMealPeriodsByBranch: async (branchId) => {
        return [];
    },

    createCategory: async (payload) => {
        try {
            const res = await axiosInstance.post("/categories", payload);
            const cat = res.data?.data;
            set((state) => ({ categories: [...state.categories, cat] }));
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
                categories: state.categories.map((c) => (c._id === categoryId ? cat : c)),
            }));
            toast.success("Category updated");
            return { success: true, data: cat };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to update category");
            return { success: false, message: err.backendMessage };
        }
    },

    toggleCategoryActive: async (categoryId) => {
        const prev = get().categories.find((c) => c._id === categoryId || c.id === categoryId);
        if (!prev) return { success: false };
        const nextVal = prev.isActive === false;
        set((state) => ({
            categories: state.categories.map((c) =>
                (c._id === categoryId || c.id === categoryId) ? { ...c, isActive: nextVal } : c
            ),
        }));
        try {
            const res = await axiosInstance.patch(`/categories/${categoryId}`, { isActive: nextVal });
            const cat = res.data?.data;
            set((state) => ({
                categories: state.categories.map((c) =>
                    (c._id === categoryId || c.id === categoryId) ? cat : c
                ),
            }));
            return { success: true, data: cat };
        } catch (err) {
            set((state) => ({
                categories: state.categories.map((c) =>
                    (c._id === categoryId || c.id === categoryId) ? prev : c
                ),
            }));
            toast.error(err.backendMessage || "Failed to update category");
            return { success: false, message: err.backendMessage };
        }
    },

    toggleCategoryHidden: async (categoryId) => {
        const prev = get().categories.find((c) => c._id === categoryId || c.id === categoryId);
        if (!prev) return { success: false };
        const nextVal = !prev.isHidden;
        set((state) => ({
            categories: state.categories.map((c) =>
                (c._id === categoryId || c.id === categoryId) ? { ...c, isHidden: nextVal } : c
            ),
        }));
        try {
            const res = await axiosInstance.patch(`/categories/${categoryId}`, { isHidden: nextVal });
            const cat = res.data?.data;
            set((state) => ({
                categories: state.categories.map((c) =>
                    (c._id === categoryId || c.id === categoryId) ? cat : c
                ),
            }));
            return { success: true, data: cat };
        } catch (err) {
            set((state) => ({
                categories: state.categories.map((c) =>
                    (c._id === categoryId || c.id === categoryId) ? prev : c
                ),
            }));
            toast.error(err.backendMessage || "Failed to update category visibility");
            return { success: false, message: err.backendMessage };
        }
    },

    toggleCategoryAllDay: async (categoryId) => {
        const prev = get().categories.find((c) => c._id === categoryId || c.id === categoryId);
        if (!prev) return { success: false };
        const nextVal = !prev.isAllDay;
        set((state) => ({
            categories: state.categories.map((c) =>
                (c._id === categoryId || c.id === categoryId) ? { ...c, isAllDay: nextVal } : c
            ),
        }));
        try {
            const res = await axiosInstance.patch(`/categories/${categoryId}`, { isAllDay: nextVal });
            const cat = res.data?.data;
            set((state) => ({
                categories: state.categories.map((c) =>
                    (c._id === categoryId || c.id === categoryId) ? cat : c
                ),
            }));
            return { success: true, data: cat };
        } catch (err) {
            set((state) => ({
                categories: state.categories.map((c) =>
                    (c._id === categoryId || c.id === categoryId) ? prev : c
                ),
            }));
            toast.error(err.backendMessage || "Failed to update All-Day status");
            return { success: false, message: err.backendMessage };
        }
    },

    deleteCategory: async (categoryId) => {
        try {
            await axiosInstance.delete(`/categories/${categoryId}`);
            set((state) => ({
                categories: state.categories.filter((c) => c._id !== categoryId),
            }));
            toast.success("Category deleted");
            return { success: true };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to delete category");
            return { success: false, message: err.backendMessage };
        }
    },

    getFoodItems: async ({ categoryId, availableOnly = false, activeOnly = false } = {}) => {
        set({ isLoading: true, error: null });
        try {
            const params = {};
            if (categoryId) params.categoryId = categoryId;
            if (availableOnly) params.availableOnly = true;
            if (activeOnly) params.activeOnly = true;
            const res = await axiosInstance.get("/food-items", { params });
            const list = res.data?.data || [];
            set({ foodItems: list, isLoading: false });
            return list;
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Error fetching food items" });
            return [];
        }
    },

    getFoodItemsByBranch: async (branchId, { categoryId, availableOnly = false } = {}) => {
        return get().getFoodItems({ categoryId, availableOnly });
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

    createFoodItem: async (payload) => {
        try {
            const res = await axiosInstance.post("/food-items", payload);
            const item = res.data?.data;
            set((state) => ({ foodItems: [...state.foodItems, item] }));
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
                foodItems: state.foodItems.map((m) => (m._id === foodId ? item : m)),
            }));
            toast.success("Food item updated");
            return { success: true, data: item };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to update food item");
            return { success: false, message: err.backendMessage };
        }
    },

    toggleItemAvailability: async (foodId) => {
        const prev = get().foodItems.find((i) => i._id === foodId || i.id === foodId);
        if (!prev) return { success: false };
        const nextVal = prev.isAvailable === false;
        set((state) => ({
            foodItems: state.foodItems.map((i) =>
                (i._id === foodId || i.id === foodId) ? { ...i, isAvailable: nextVal } : i
            ),
        }));
        try {
            const res = await axiosInstance.patch(`/food-items/${foodId}`, { isAvailable: nextVal });
            const item = res.data?.data;
            set((state) => ({
                foodItems: state.foodItems.map((i) =>
                    (i._id === foodId || i.id === foodId) ? item : i
                ),
            }));
            return { success: true, data: item };
        } catch (err) {
            set((state) => ({
                foodItems: state.foodItems.map((i) =>
                    (i._id === foodId || i.id === foodId) ? prev : i
                ),
            }));
            toast.error(err.backendMessage || "Failed to update availability");
            return { success: false, message: err.backendMessage };
        }
    },

    toggleItemHidden: async (foodId) => {
        const prev = get().foodItems.find((i) => i._id === foodId || i.id === foodId);
        if (!prev) return { success: false };
        const nextVal = !prev.isHidden;
        set((state) => ({
            foodItems: state.foodItems.map((i) =>
                (i._id === foodId || i.id === foodId) ? { ...i, isHidden: nextVal } : i
            ),
        }));
        try {
            const res = await axiosInstance.patch(`/food-items/${foodId}`, { isHidden: nextVal });
            const item = res.data?.data;
            set((state) => ({
                foodItems: state.foodItems.map((i) =>
                    (i._id === foodId || i.id === foodId) ? item : i
                ),
            }));
            return { success: true, data: item };
        } catch (err) {
            set((state) => ({
                foodItems: state.foodItems.map((i) =>
                    (i._id === foodId || i.id === foodId) ? prev : i
                ),
            }));
            toast.error(err.backendMessage || "Failed to update visibility");
            return { success: false, message: err.backendMessage };
        }
    },

    toggleItemFeatured: async (foodId) => {
        const prev = get().foodItems.find((i) => i._id === foodId || i.id === foodId);
        if (!prev) return { success: false };
        const nextVal = !prev.isFeatured;
        set((state) => ({
            foodItems: state.foodItems.map((i) =>
                (i._id === foodId || i.id === foodId) ? { ...i, isFeatured: nextVal } : i
            ),
        }));
        try {
            const res = await axiosInstance.patch(`/food-items/${foodId}`, { isFeatured: nextVal });
            const item = res.data?.data;
            set((state) => ({
                foodItems: state.foodItems.map((i) =>
                    (i._id === foodId || i.id === foodId) ? item : i
                ),
            }));
            return { success: true, data: item };
        } catch (err) {
            set((state) => ({
                foodItems: state.foodItems.map((i) =>
                    (i._id === foodId || i.id === foodId) ? prev : i
                ),
            }));
            toast.error(err.backendMessage || "Failed to update featured status");
            return { success: false, message: err.backendMessage };
        }
    },

    deleteFoodItem: async (foodId) => {
        try {
            await axiosInstance.delete(`/food-items/${foodId}`);
            set((state) => ({
                foodItems: state.foodItems.filter((m) => m._id !== foodId),
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

    reorderCategories: async (orders) => {
        try {
            await axiosInstance.patch("/categories/reorder", { orders });
            return { success: true };
        } catch (err) {
            toast.error(err.backendMessage || "Reorder failed");
            return { success: false };
        }
    },

    reorderFoodItems: async (orders) => {
        try {
            await axiosInstance.patch("/food-items/reorder", { orders });
            return { success: true };
        } catch (err) {
            toast.error(err.backendMessage || "Reorder failed");
            return { success: false };
        }
    },

    fetchPublicMenu: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await axiosInstance.get("/public/menu");
            const data = res.data?.data || {};
            set({
                publicMenu: data.menu || [],
                isLoading: false,
            });
            return data;
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Failed to load menu" });
            return null;
        }
    },

    getMealPeriods: async ({ activeOnly = false } = {}) => {
        set({ isLoading: true, error: null });
        try {
            const params = activeOnly ? { activeOnly: true } : {};
            const res = await axiosInstance.get("/meal-periods", { params });
            const list = res.data?.data || [];
            set({ mealPeriods: list, isLoading: false });
            return list;
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Error fetching meal periods" });
            return [];
        }
    },

    createMealPeriod: async (payload) => {
        try {
            const res = await axiosInstance.post("/meal-periods", payload);
            const mp = res.data?.data;
            set((state) => ({ mealPeriods: [...state.mealPeriods, mp] }));
            toast.success("Meal type created");
            return { success: true, data: mp };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to create meal type");
            return { success: false, message: err.backendMessage };
        }
    },

    updateMealPeriod: async (id, payload) => {
        try {
            const res = await axiosInstance.patch(`/meal-periods/${id}`, payload);
            const mp = res.data?.data;
            set((state) => ({
                mealPeriods: state.mealPeriods.map((m) => (m._id === id ? mp : m)),
            }));
            toast.success("Meal type updated");
            return { success: true, data: mp };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to update meal type");
            return { success: false, message: err.backendMessage };
        }
    },

    deleteMealPeriod: async (id) => {
        try {
            await axiosInstance.delete(`/meal-periods/${id}`);
            set((state) => ({
                mealPeriods: state.mealPeriods.filter((m) => m._id !== id),
            }));
            toast.success("Meal type deleted");
            return { success: true };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to delete meal type");
            return { success: false, message: err.backendMessage };
        }
    },
}));
