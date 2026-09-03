import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";
import { getSocket } from "../config/socket.config";

/**
 * Kitchen Display store. Real backend contracts:
 *   GET  /kitchen/orders                - paid & confirmed/preparing orders (branch scoped)
 *   POST /kitchen/orders/:orderId/start - CONFIRMED -> PREPARING
 *   POST /kitchen/orders/:orderId/ready - PREPARING -> READY
 *
 * The branch is implicit (from req.user.branchId).
 */
const useKitchenStore = create((set, get) => ({
    kitchenOrders: [],
    isLoading: false,

    fetchKitchenOrders: async () => {
        set({ isLoading: true });
        try {
            const res = await axiosInstance.get("/kitchen/orders");
            set({ kitchenOrders: res.data?.data || [], isLoading: false });
        } catch (err) {
            console.error("Fetch Kitchen Orders Error:", err);
            set({ isLoading: false });
            toast.error(err.backendMessage || "Failed to fetch kitchen orders");
        }
    },

    startPreparation: async (orderId) => {
        try {
            const res = await axiosInstance.post(`/kitchen/orders/${orderId}/start`);
            toast.success("Started preparation");
            get().fetchKitchenOrders();
            return { success: true, data: res.data?.data };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to start preparation");
            return { success: false, message: err.backendMessage };
        }
    },

    markReady: async (orderId) => {
        try {
            const res = await axiosInstance.post(`/kitchen/orders/${orderId}/ready`);
            toast.success("Ready for pickup");
            get().fetchKitchenOrders();
            return { success: true, data: res.data?.data };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to mark ready");
            return { success: false, message: err.backendMessage };
        }
    },

    /** Subscribe to live kitchen events. */
    subscribeKitchenEvents: () => {
        const socket = getSocket();
        const refresh = () => get().fetchKitchenOrders();
        socket.on("order:confirmed", refresh);
        socket.on("order:preparing", refresh);
        socket.on("order:ready", refresh);
        socket.on("order:completed", refresh);
        socket.on("order:cancelled", refresh);
        return () => {
            socket.off("order:confirmed", refresh);
            socket.off("order:preparing", refresh);
            socket.off("order:ready", refresh);
            socket.off("order:completed", refresh);
            socket.off("order:cancelled", refresh);
        };
    },
}));

export default useKitchenStore;
