import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTableStore } from "@/store/useTableStore";
import axiosInstance from "@/axios/axiosInstace";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users, UserCheck, CheckCircle, MoreVertical, UserPlus, X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TABLE_STATUS_META = {
  AVAILABLE: { label: "Available", color: "bg-green-100 text-green-800", border: "border-green-300" },
  OCCUPIED: { label: "Occupied", color: "bg-blue-100 text-blue-800", border: "border-blue-300" },
  RESERVED: { label: "Reserved", color: "bg-purple-100 text-purple-800", border: "border-purple-300" },
};

const TableCard = ({ table, canManage, onUpdate }) => {
  const [busy, setBusy] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedWaiter, setSelectedWaiter] = useState("");
  const [waiters, setWaiters] = useState([]);

  const status = TABLE_STATUS_META[table.status] || TABLE_STATUS_META.AVAILABLE;
  const occupancyPct = table.capacity > 0
    ? Math.min(100, Math.round(((table.currentOccupancy || 0) / table.capacity) * 100))
    : 0;

  useEffect(() => {
    const loadWaiters = async () => {
      try {
        const res = await axiosInstance.get(`/branches/${table.branchId}/users`, { params: { role: "WAITER" } });
        setWaiters(res.data?.data || []);
      } catch {
        setWaiters([]);
      }
    };
    if (showAssign) loadWaiters();
  }, [showAssign, table.branchId]);

  const handleAssignWaiter = async () => {
    if (!selectedWaiter) return;
    setBusy(true);
    try {
      await axiosInstance.post(`/tables/${table._id}/assign-waiter`, { waiterId: selectedWaiter });
      toast.success("Waiter assigned");
      setShowAssign(false);
      onUpdate?.();
    } catch (err) {
      toast.error(err.backendMessage || "Failed to assign waiter");
    } finally {
      setBusy(false);
    }
  };

  const handleUnassignWaiter = async () => {
    setBusy(true);
    try {
      await axiosInstance.post(`/tables/${table._id}/assign-waiter`, { unassign: true });
      toast.success("Waiter unassigned");
      onUpdate?.();
    } catch (err) {
      toast.error(err.backendMessage || "Failed to unassign waiter");
    } finally {
      setBusy(false);
    }
  };

  const handleClearTable = async () => {
    if (!window.confirm("Confirm customer has left and table is clear?")) return;
    setBusy(true);
    try {
      await axiosInstance.post(`/tables/${table._id}/clear`);
      toast.success("Table cleared");
      onUpdate?.();
    } catch (err) {
      toast.error(err.backendMessage || "Failed to clear table");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={`border ${status.border} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">Table {table.tableNumber}</span>
            <Badge variant="outline" className={status.color}>{status.label}</Badge>
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowAssign(!showAssign)}>
                  <UserPlus className="size-4 mr-2" /> Assign Waiter
                </DropdownMenuItem>
                {table.assignedWaiterId && (
                  <DropdownMenuItem onClick={handleUnassignWaiter} disabled={busy}>
                    <UserCheck className="size-4 mr-2" /> Unassign
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleClearTable} disabled={busy} className="text-green-600">
                  <CheckCircle className="size-4 mr-2" /> Clear Table
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">
              <Users className="size-3 inline mr-1" />
              {table.currentOccupancy || 0}/{table.capacity} guests
            </span>
            <span className="font-medium">{occupancyPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${occupancyPct >= 100 ? "bg-red-500" : occupancyPct >= 75 ? "bg-amber-500" : "bg-blue-500"}`}
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <UserCheck className="size-4" />
            <span className="truncate">
              {table.assignedWaiterId?.name || "No waiter"}
            </span>
          </div>
          {table.status === "OCCUPIED" && (
            <span className="text-xs text-blue-600 font-medium">Active</span>
          )}
        </div>

        {showAssign && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <select
              value={selectedWaiter}
              onChange={(e) => setSelectedWaiter(e.target.value)}
              className="w-full h-9 rounded-md border bg-white text-sm px-2"
            >
              <option value="">Select waiter...</option>
              {waiters.map((w) => (
                <option key={w._id} value={w._id}>{w.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowAssign(false)} className="flex-1">
                Cancel
              </Button>
              <Button size="sm" onClick={handleAssignWaiter} disabled={busy || !selectedWaiter} className="flex-1">
                Assign
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const TableCapacityOverview = ({ branchId: propBranchId, canManage = false }) => {
  const { authUser } = useAuthStore();
  const branchId = propBranchId || authUser?.branchId;
  const { tables, getTablesByBranch } = useTableStore();

  useEffect(() => {
    if (branchId) {
      getTablesByBranch(branchId);
    }
  }, [branchId, getTablesByBranch]);

  if (!branchId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No branch assigned.</p>
        </CardContent>
      </Card>
    );
  }

  const totalTables = tables?.length || 0;
  const availableTables = tables?.filter((t) => t.status === "AVAILABLE").length || 0;
  const occupiedTables = tables?.filter((t) => t.status === "OCCUPIED").length || 0;
  const totalGuests = tables?.reduce((s, t) => s + (t.currentOccupancy || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-slate-700">{totalTables}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Tables</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{availableTables}</p>
            <p className="text-sm text-muted-foreground mt-1">Available</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{occupiedTables}</p>
            <p className="text-sm text-muted-foreground mt-1">Occupied</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{totalGuests}</p>
            <p className="text-sm text-muted-foreground mt-1">Guests Seated</p>
          </CardContent>
        </Card>
      </div>

      {!tables || tables.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No tables configured yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <TableCard
              key={table._id}
              table={table}
              canManage={canManage}
              onUpdate={() => getTablesByBranch(branchId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TableCapacityOverview;
