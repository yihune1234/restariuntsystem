import { create } from "zustand";
import axiosInstance from "../axios/axiosInstace";

export const useMenuStore = create((set, get) => ({
  restaurant: null,
  categories: [],
  isLoading: false,
  error: null,

  fetchMenu: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await axiosInstance.get("/public/menu");
      const data = res.data?.data || {};
      set({
        restaurant: data.restaurant,
        categories: data.categories || [],
        isLoading: false,
      });
      return data;
    } catch (err) {
      set({
        isLoading: false,
        error: err.backendMessage || "Failed to load menu",
      });
      return null;
    }
  },
}));
