import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";
import { getSocket } from "../config/socket.config";

/**
 * Daily stock store. Real backend contracts:
 *   GET    /branches/:branchId/stock/today        - all of today's stock rows
 *   POST   /branches/:branchId/stock             - set/update prepared qty
 *   POST   /branches/:branchId/stock/bulk        - bulk set prepared qty
 *   PATCH  /stock/:stockId                       - update existing row
 *
 * Stock rows are (branchId, foodItemId, businessDate YYYY-MM-DD) unique.
 * The backend deduces status (AVAILABLE/LOW_STOCK/SOLD_OUT) from remaining qty.
 */
export const useInventoryStore = create((set, get) => ({
    items: [],
    stats: null,
    isLoading: false,
    error: null,

    /** Subscribe to real-time stock updates */
    subscribeToStockUpdates: (branchId) => {
        const socket = getSocket();
        const onStockUpdate = (payload) => {
            if (!payload?.foodItemId) return;
            set((state) => {
                const idx = state.items.findIndex(
                    (s) => s.foodItemId?._id === payload.foodItemId || s.foodItemId === payload.foodItemId
                );
                if (idx >= 0) {
                    const next = [...state.items];
                    next[idx] = {
                        ...next[idx],
                        remainingQuantity: payload.remainingQuantity,
                        status: payload.status,
                    };
                    return { items: next };
                }
                return state;
            });
        };
        const onFoodSoldOut = (payload) => {
            if (!payload?.foodItemId) return;
            toast.warning(`${payload.foodName || 'Item'} is now sold out!`);
            set((state) => {
                const idx = state.items.findIndex(
                    (s) => s.foodItemId?._id === payload.foodItemId || s.foodItemId === payload.foodItemId
                );
                if (idx >= 0) {
                    const next = [...state.items];
                    next[idx] = { ...next[idx], status: 'SOLD_OUT', remainingQuantity: 0 };
                    return { items: next };
                }
                return state;
            });
        };
        socket.on("stock:updated", onStockUpdate);
        socket.on("food:sold-out", onFoodSoldOut);
        return () => {
            socket.off("stock:updated", onStockUpdate);
            socket.off("food:sold-out", onFoodSoldOut);
        };
    },

    fetchTodayStock: async (branchId) => {
        set({ isLoading: true, error: null });
        try {
            const res = await axiosInstance.get(`/branches/${branchId}/stock/today`);
            set({ items: res.data?.data || [], isLoading: false });
            return res.data?.data || [];
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Error fetching stock" });
            return [];
        }
    },

    setDailyStock: async (branchId, payload) => {
        try {
            const res = await axiosInstance.post(
                `/branches/${branchId}/stock`,
                payload
            );
            const stock = res.data?.data;
            // Update or insert into local list
            set((state) => {
                const idx = state.items.findIndex(
                    (s) => s.foodItemId?._id === payload.foodItemId || s.foodItemId === payload.foodItemId
                );
                if (idx >= 0) {
                    const next = [...state.items];
                    next[idx] = stock;
                    return { items: next };
                }
                return { items: [...state.items, stock] };
            });
            toast.success("Daily stock updated");
            return { success: true, data: stock };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to update stock");
            return { success: false, message: err.backendMessage };
        }
    },

    bulkSetDailyStock: async (branchId, items, businessDate) => {
        try {
            const res = await axiosInstance.post(
                `/branches/${branchId}/stock/bulk`,
                { items, businessDate }
            );
            toast.success("Bulk stock updated");
            // Refresh local list
            get().fetchTodayStock(branchId);
            return { success: true, data: res.data?.data };
        } catch (err) {
            toast.error(err.backendMessage || "Bulk update failed");
            return { success: false, message: err.backendMessage };
        }
    },

    updateStock: async (stockId, payload) => {
        try {
            const res = await axiosInstance.patch(`/stock/${stockId}`, payload);
            const stock = res.data?.data;
            set((state) => ({
                items: state.items.map((s) => (s._id === stockId ? stock : s)),
            }));
            toast.success("Stock updated");
            return { success: true, data: stock };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to update stock");
            return { success: false, message: err.backendMessage };
        }
    },
}));
