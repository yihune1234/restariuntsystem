import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";
import { getSocket } from "../config/socket.config";

/**
 * Tables store. Real backend contracts:
 *   GET    /branches/:branchId/tables           - list tables
 *   POST   /branches/:branchId/tables           - create table
 *   GET    /tables/:tableId                     - get single
 *   PATCH  /tables/:tableId                     - update (status: AVAILABLE/OCCUPIED/RESERVED)
 *   DELETE /tables/:tableId                     - delete
 *   POST   /tables/:tableId/regenerate-qr       - rotate QR token
 *
 *   Public:
 *   GET    /public/qr/:qrToken                  - validate QR token
 *   POST   /customer-sessions                    - start session
 */
export const useTableStore = create((set, _get) => ({
    tables: [],
    currentTable: null,
    isLoading: false,
    error: null,

    /** Subscribe to real-time table status changes */
    subscribeToTableUpdates: () => {
        const socket = getSocket();
        const onTableUpdate = (payload) => {
            if (!payload?.tableId) return;
            set((state) => ({
                tables: state.tables.map((t) =>
                    t._id === payload.tableId
                        ? {
                            ...t,
                            status: payload.status ?? t.status,
                            currentOccupancy: payload.capacity ?? t.currentOccupancy,
                            assignedWaiterId: payload.assignedWaiterId ?? t.assignedWaiterId,
                            _assignedWaiterName: payload.waiterName ?? t._assignedWaiterName,
                        }
                        : t
                ),
            }));
        };
        const onAssignment = (payload) => {
            if (!payload?.tableId) return;
            set((state) => ({
                tables: state.tables.map((t) =>
                    t._id === payload.tableId
                        ? {
                            ...t,
                            assignedWaiterId: payload.assignedWaiterId,
                            _assignedWaiterName: payload.waiterName,
                        }
                        : t
                ),
            }));
        };
        socket.on("table:status-changed", onTableUpdate);
        socket.on("table:assignment-changed", onAssignment);
        return () => {
            socket.off("table:status-changed", onTableUpdate);
            socket.off("table:assignment-changed", onAssignment);
        };
    },

    /** Assign one waiter to one or MANY tables (Manager/Owner). */
    assignTables: async (branchId, { waiterId, tableIds }) => {
        try {
            const res = await axiosInstance.post(
                `/branches/${branchId}/tables/bulk-assign-waiters`,
                { waiterId, tableIds }
            );
            const updated = res.data?.data || [];
            set((state) => ({
                tables: state.tables.map((t) => {
                    const hit = updated.find((u) => u._id === t._id);
                    return hit ? { ...t, ...hit } : t;
                }),
            }));
            toast.success(`Assigned to ${updated.length} table(s)`);
            return { success: true, data: updated };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to assign tables");
            return { success: false, message: err.backendMessage };
        }
    },

    /** Unassign the waiter from one or many tables (Manager/Owner). */
    unassignTables: async (branchId, { tableIds }) => {
        try {
            const res = await axiosInstance.post(
                `/branches/${branchId}/tables/bulk-assign-waiters`,
                { tableIds, unassign: true }
            );
            const updated = res.data?.data || [];
            set((state) => ({
                tables: state.tables.map((t) => {
                    const hit = updated.find((u) => u._id === t._id);
                    return hit ? { ...t, ...hit } : t;
                }),
            }));
            toast.success(`Unassigned from ${updated.length} table(s)`);
            return { success: true, data: updated };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to unassign tables");
            return { success: false, message: err.backendMessage };
        }
    },

    getTablesByBranch: async (branchId) => {
        set({ isLoading: true, error: null });
        try {
            const res = await axiosInstance.get(`/branches/${branchId}/tables`);
            set({ tables: res.data?.data || [], isLoading: false });
            return res.data?.data || [];
        } catch (err) {
            set({ isLoading: false, error: err.backendMessage || "Error fetching tables" });
            return [];
        }
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

    createTable: async (branchId, payload) => {
        try {
            const res = await axiosInstance.post(
                `/branches/${branchId}/tables`,
                payload
            );
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
            const res = await axiosInstance.post(
                `/tables/${tableId}/regenerate-qr`
            );
            const t = res.data?.data;
            set((state) => ({
                tables: state.tables.map((x) => (x._id === tableId ? t : x)),
            }));
            toast.success("QR token rotated");
            return { success: true, data: t };
        } catch (err) {
            toast.error(err.backendMessage || "Failed to rotate QR");
            return { success: false, message: err.backendMessage };
        }
    },

    /** Validate a scanned QR token (public, no auth). */
    validateQr: async (qrToken) => {
        try {
            const res = await axiosInstance.get(`/public/qr/${qrToken}`);
            return { success: true, data: res.data?.data };
        } catch (err) {
            return { success: false, message: err.backendMessage || "Invalid QR code" };
        }
    },
}));
