import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";

export const useTableStore = create((set, get) => ({
    tables: [],
    currentTable: null,
    isLoading: false,
    error: null,

    getTables: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await axiosInstance.get("/tables");
            set({ tables: res.data?.data || [], isLoading: false });
            return res.data?.data || [];
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Error fetching tables" });
            return [];
        }
    },

    getTablesByBranch: async (branchId) => {
        return get().getTables();
    },

    getTableById: async (tableId) => {
        set({ isLoading: true, error: null });
        try {
            const res = await axiosInstance.get(`/tables/${tableId}`);
            const t = res.data?.data;
            set({ currentTable: t, isLoading: false });
            return t;
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Error fetching table" });
            return null;
        }
    },

    createTable: async (payload) => {
        try {
            const res = await axiosInstance.post("/tables", payload);
            const table = res.data?.data;
            set((state) => ({ tables: [...state.tables, table] }));
            toast.success("Table created");
            return { success: true, data: table };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to create table");
            return { success: false, message: err.backendMessage };
        }
    },

    updateTable: async (tableId, payload) => {
        try {
            const res = await axiosInstance.patch(`/tables/${tableId}`, payload);
            const t = res.data?.data;
            set((state) => ({
                tables: state.tables.map((x) => (x._id === tableId ? t : x)),
                currentTable: t,
            }));
            toast.success("Table updated");
            return { success: true, data: t };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to update table");
            return { success: false, message: err.backendMessage };
        }
    },

    deleteTable: async (tableId) => {
        try {
            await axiosInstance.delete(`/tables/${tableId}`);
            set((state) => ({
                tables: state.tables.filter((t) => t._id !== tableId),
            }));
            toast.success("Table deleted");
            return { success: true };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to delete table");
            return { success: false, message: err.backendMessage };
        }
    },

    regenerateQr: async (tableId) => {
        try {
            const res = await axiosInstance.post(`/tables/${tableId}/regenerate-qr`);
            const t = res.data?.data;
            set((state) => ({
                tables: state.tables.map((x) => (x._id === tableId ? t : x)),
            }));
            toast.success("QR token regenerated");
            return { success: true, data: t };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to regenerate QR");
            return { success: false, message: err.backendMessage };
        }
    },

    validateQr: async (qrToken) => {
        try {
            const res = await axiosInstance.get(`/public/qr/${qrToken}`);
            return { success: true, data: res.data?.data };
        } catch (err) {
            return { success: false, message: err.backendMessage || "Invalid QR code" };
        }
    },
}));
