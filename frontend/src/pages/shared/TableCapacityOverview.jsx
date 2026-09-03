import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTableStore } from "@/store/useTableStore";
import { useBranchStore } from "@/store/useBranchStore";
import { useUserStore } from "@/store/useUserStore";
import axiosInstance from "@/axios/axiosInstace";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Users, UserCheck, UserMinus, CheckCircle, AlertTriangle, RefreshCw, DoorOpen, UserPlus,
} from "lucide-react";

const TABLE_STATUS_META = {
  AVAILABLE: { label: "Available", color: "bg-green-100 text-green-800", icon: DoorOpen },
  OCCUPIED: { label: "Occupied", color: "bg-blue-100 text-blue-800", icon: Users },
  RESERVED: { label: "Reserved", color: "bg-purple-100 text-purple-800", icon: UserCheck },
};

const TableCapacityCard = ({ table, canManage, onUpdate }) => {
  const [occupancy, setOccupancy] = useState(table.currentOccupancy || 0);
  const [assignWaiterId, setAssignWaiterId] = useState(table.assignedWaiterId?._id || table.assignedWaiterId || "");
  const [busy, setBusy] = useState(false);

  const status = TABLE_STATUS_META[table.status] || TABLE_STATUS_META.AVAILABLE;
  const occupancyPct = table.capacity > 0 ? Math.min(100, Math.round((occupancy / table.capacity) * 100)) : 0;

  const updateOccupancy = async () => {
    setBusy(true);
    try {
      await axiosInstance.post(`/tables/${table._id}/occupancy`, { occupancy: parseInt(occupancy) || 0 });
      toast.success("Occupancy updated");
      onUpdate?.();
    } catch (err) {
      toast.error(err.backendMessage || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const assignWaiter = async () => {
    if (!assignWaiterId) return;
    setBusy(true);
    try {
      await axiosInstance.post(`/tables/${table._id}/assign-waiter`, { waiterId: assignWaiterId });
      toast.success("Waiter assigned");
      onUpdate?.();
    } catch (err) {
      toast.error(err.backendMessage || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const unassignWaiter = async () => {
    setBusy(true);
    try {
      await axiosInstance.post(`/tables/${table._id}/assign-waiter`, { unassign: true });
      toast.success("Waiter unassigned");
      setAssignWaiterId("");
      onUpdate?.();
    } catch (err) {
      toast.error(err.backendMessage || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const clearTable = async () => {
    if (!window.confirm("Confirm: customer has left and table is clear?")) return;
    setBusy(true);
    try {
      await axiosInstance.post(`/tables/${table._id}/clear`);
      toast.success("Table cleared and available");
      onUpdate?.();
    } catch (err) {
      toast.error(err.backendMessage || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Table {table.tableNumber}</span>
            <Badge variant="outline" className={status.color}>{status.label}</Badge>
          </div>
          <span className="text-xs text-slate-500">Cap: {table.capacity}</span>
        </div>

        {/* Occupancy bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-0.5">
            <span>Occupied: {occupancy}/{table.capacity}</span>
            <span>{occupancyPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${occupancyPct >= 100 ? "bg-red-500" : "bg-blue-500"}`}
              style={{ width: `${occupancyPct}%` }} />
          </div>
        </div>

        {/* Assigned waiter */}
        <div className="flex items-center gap-2 text-xs mb-2">
          <UserCheck className="size-3 text-slate-400" />
          <span className="text-slate-500">Waiter:</span>
          <span className="font-medium">{table.assignedWaiterId?.name || "Unassigned"}</span>
        </div>

        {canManage && (
          <div className="space-y-2">
            <div className="flex gap-1">
              <Input type="number" min={0} value={occupancy}
                onChange={(e) => setOccupancy(e.target.value)} className="h-7 text-xs" />
              <Button size="sm" variant="outline" onClick={updateOccupancy} disabled={busy}>
                Set
              </Button>
            </div>
            <div className="flex gap-1">
              <select value={assignWaiterId} onChange={(e) => setAssignWaiterId(e.target.value)}
                className="flex-1 h-7 rounded border bg-white text-xs px-1">
                <option value="">Assign waiter...</option>
                {table._waiters?.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
              <Button size="sm" variant="outline" onClick={assignWaiter} disabled={busy || !assignWaiterId}>
                <UserPlus className="size-3" />
              </Button>
              {table.assignedWaiterId && (
                <Button size="sm" variant="outline" onClick={unassignWaiter} disabled={busy}>
                  <UserMinus className="size-3" />
                </Button>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={clearTable} disabled={busy}
              className="w-full text-green-700 border-green-300 hover:bg-green-50">
              <CheckCircle className="size-3 mr-1" /> Customer Left / Clear Table
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TableCapacityOverview = ({ branchId, canManage = false }) => {
  const { tables, getTablesByBranch } = useTableStore();
  const { staff, fetchStaffByBranch } = useUserStore();

  useEffect(() => {
    if (branchId) {
      getTablesByBranch(branchId);
      fetchStaffByBranch(branchId, { role: "WAITER" });
    }
  }, [branchId, getTablesByBranch, fetchStaffByBranch]);

  // Attach waiters list to each table for the assign dropdown
  const tablesWithWaiters = tables?.map((t) => ({
    ...t,
    _waiters: staff?.filter((s) => s.role === "WAITER") || [],
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{tables?.filter((t) => t.status === "AVAILABLE").length || 0}</p>
          <p className="text-xs text-slate-500">Available</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{tables?.filter((t) => t.status === "OCCUPIED").length || 0}</p>
          <p className="text-xs text-slate-500">Occupied</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-slate-700">
            {tables?.reduce((s, t) => s + (t.currentOccupancy || 0), 0) || 0}
          </p>
          <p className="text-xs text-slate-500">Guests Seated</p>
        </CardContent></Card>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tablesWithWaiters?.map((table) => (
          <TableCapacityCard key={table._id} table={table} canManage={canManage}
            onUpdate={() => getTablesByBranch(branchId)} />
        ))}
      </div>
    </div>
  );
};

export default TableCapacityOverview;
