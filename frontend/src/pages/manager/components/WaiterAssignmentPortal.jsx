import React, { useEffect, useCallback, useMemo, useState } from "react";
import { useTableStore } from "@/store/useTableStore";
import { useUserStore } from "@/store/useUserStore";
import { useOrderStore } from "@/store/useOrderStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getSocket } from "@/config/socket.config";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Users, UserCheck, UserX, LayoutGrid, RefreshCw, Check,
  ChevronRight, Eye, Loader2,
} from "lucide-react";

const TABLE_STATUS_BADGE = {
  AVAILABLE: "bg-green-100 text-green-800 border-green-200",
  OCCUPIED: "bg-blue-100 text-blue-800 border-blue-200",
  RESERVED: "bg-purple-100 text-purple-800 border-purple-200",
};

const WaiterAssignmentPortal = ({ branchId }) => {
  const { tables, getTablesByBranch, assignTables, unassignTables, subscribeToTableUpdates } = useTableStore();
  const { staff, fetchStaffByBranch } = useUserStore();
  const { orders, getBranchOrders } = useOrderStore();
  const navigate = useNavigate();

  const [selectedWaiter, setSelectedWaiter] = useState("");
  const [selectedTables, setSelectedTables] = useState([]);
  const [tablePicker, setTablePicker] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewWaiter, setViewWaiter] = useState(null);

  const waiters = staff.filter((u) => u.role === "WAITER" && u.isActive !== false);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      await Promise.all([
        getTablesByBranch(branchId).catch(() => {}),
        fetchStaffByBranch(branchId).catch(() => {}),
        getBranchOrders(branchId, { limit: 200 }).catch(() => {}),
      ]);
    } finally {
      setLoading(false);
    }
  }, [branchId, getTablesByBranch, fetchStaffByBranch, getBranchOrders]);

  useEffect(() => {
    load();
    const unsubscribe = subscribeToTableUpdates();
    const socket = getSocket();
    socket.on("table:assignment-changed", () => {});
    return () => {
      if (unsubscribe) unsubscribe();
      socket.off("table:assignment-changed");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const assignedOf = (t) => {
    const id = t.assignedWaiterId?._id || t.assignedWaiterId;
    return id ? String(id) : null;
  };
  const waiterNameOf = (t) => t.assignedWaiterId?.name || null;

  const activeOrdersByTable = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (["COMPLETED", "CANCELLED"].includes(o.orderStatus)) return;
      const tid = o.tableId?._id || o.tableId;
      if (!tid) return;
      map[String(tid)] = (map[String(tid)] || 0) + 1;
    });
    return map;
  }, [orders]);

  const toggleTable = (id) => {
    setSelectedTables((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
      if (!selectedWaiter) return toast.error("Select a waiter first");
      let tableIds;
      if (selectedTables.length > 0) {
        // Waiter -> multi-select tables flow.
        tableIds = selectedTables;
      } else if (tablePicker) {
        // Table -> waiter flow.
        tableIds = [tablePicker];
      } else {
        return toast.error("Select at least one table");
      }
      setLoading(true);
      await assignTables(branchId, { waiterId: selectedWaiter, tableIds });
      setLoading(false);
      setSelectedTables([]);
      setTablePicker("");
  };

  const handleUnassign = async (tableId) => {
    setLoading(true);
    await unassignTables(branchId, { tableIds: [tableId] });
    setLoading(false);
  };

  const handleClearSelection = () => setSelectedTables([]);

  const unassignedTables = tables.filter((t) => !assignedOf(t));
  const assignedTables = tables.filter((t) => assignedOf(t));

  const waiterTableCounts = useMemo(() => {
    const map = {};
    assignedTables.forEach((t) => {
      const w = assignedOf(t);
      if (w) map[w] = (map[w] || 0) + 1;
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables]);

  const byWaiter = useMemo(() => {
    const map = {};
    waiters.forEach((w) => { map[String(w._id)] = []; });
    assignedTables.forEach((t) => {
      const w = assignedOf(t);
      if (w && map[w]) map[w].push(t);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, waiters]);

  const visibleWaiters = viewWaiter ? waiters.filter((w) => String(w._id) === String(viewWaiter)) : waiters;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="size-5 text-primary" /> Waiter & Table Assignment
          </h2>
          <p className="text-sm text-muted-foreground">Select a waiter, tick one or more tables, then Assign. Changes appear instantly.</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`size-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <LayoutGrid className="size-5 mx-auto mb-1 text-gray-600" />
          <p className="text-2xl font-bold">{tables.length}</p>
          <p className="text-xs text-muted-foreground">All Tables</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <UserCheck className="size-5 mx-auto mb-1 text-blue-600" />
          <p className="text-2xl font-bold">{assignedTables.length}</p>
          <p className="text-xs text-muted-foreground">Assigned</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <UserX className="size-5 mx-auto mb-1 text-amber-600" />
          <p className="text-2xl font-bold">{unassignedTables.length}</p>
          <p className="text-xs text-muted-foreground">Unassigned</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Users className="size-5 mx-auto mb-1 text-green-600" />
          <p className="text-2xl font-bold">{waiters.length}</p>
          <p className="text-xs text-muted-foreground">Active Waiters</p>
        </CardContent></Card>
      </div>
{/* Waiter -> multi-select tables assignment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="size-4" /> Assign a Waiter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Waiter</label>
              <select
                className="w-full h-9 rounded-md border bg-transparent px-3 text-sm"
                value={selectedWaiter}
                onChange={(e) => setSelectedWaiter(e.target.value)}
              >
                <option value="">Select waiter...</option>
                {waiters.map((w) => (
                  <option key={w._id} value={w._id}>{w.name} ({waiterTableCounts[String(w._id)] || 0} tables)</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAssign} disabled={loading || !selectedWaiter || selectedTables.length === 0}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Assign {selectedTables.length > 0 ? `(${selectedTables.length})` : ""}
              </Button>
              {selectedTables.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleClearSelection}>Clear</Button>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Tick tables to assign ({selectedTables.length} selected)</p>
              <Badge variant="outline">{unassignedTables.length} unassigned</Badge>
            </div>
            {tables.length === 0 && !loading ? (
              <EmptyState title="No tables" description="Create tables to assign waiters." icon={LayoutGrid} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {tables.map((t) => {
                  const checked = selectedTables.includes(t._id);
                  const wName = waiterNameOf(t);
                  return (
                    <label
                      key={t._id}
                      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer text-sm ${
                        checked ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30"
                      }`}
                    >
                      <input type="checkbox" className="mt-0.5" checked={checked} onChange={() => toggleTable(t._id)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium">{t.tableNumber}</span>
                          <Badge className={TABLE_STATUS_BADGE[t.status] || TABLE_STATUS_BADGE.AVAILABLE}>{t.status}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Seats {t.capacity} · {activeOrdersByTable[String(t._id)] || 0} orders</p>
                        <p className="text-[11px] text-muted-foreground">
                          Waiter: {wName || <span className="text-amber-600 font-medium">Unassigned</span>}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
{/* Table -> Waiter quick assign */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="size-4" /> Table → Assign Waiter
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Table</label>
            <select className="w-full h-9 rounded-md border bg-transparent px-3 text-sm" value={tablePicker} onChange={(e) => setTablePicker(e.target.value)}>
              <option value="">Select table...</option>
              {tables.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.tableNumber} — {waiterNameOf(t) || "Unassigned"}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Assign waiter</label>
            <select className="w-full h-9 rounded-md border bg-transparent px-3 text-sm" value={selectedWaiter} onChange={(e) => setSelectedWaiter(e.target.value)}>
              <option value="">Select waiter...</option>
              {waiters.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
            </select>
          </div>
          <Button size="sm" onClick={handleAssign} disabled={loading || !tablePicker || !selectedWaiter}>
            <Check className="size-4" /> Assign
          </Button>
        </CardContent>
      </Card>

      {/* Waiter tracking view */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4" /> Waiters & Their Tables
            </CardTitle>
            {viewWaiter && <Button size="sm" variant="outline" onClick={() => setViewWaiter(null)}>Show All</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {waiters.length === 0 ? (
            <EmptyState title="No waiters" description="Create WAITER users to assign them." icon={Users} />
          ) : (
            <div className="space-y-3">
              {visibleWaiters.map((w) => {
                const wid = String(w._id);
                const wTables = byWaiter[wid] || [];
                const totalOrders = wTables.reduce((s, t) => s + (activeOrdersByTable[String(t._id)] || 0), 0);
                return (
                  <div key={w._id} className="p-3 rounded-lg border border-muted">
                    <div className="flex items-center justify-between mb-2">
                      <button className="flex items-center gap-2 font-medium hover:text-primary" onClick={() => setViewWaiter(viewWaiter === w._id ? null : w._id)}>
                        <ChevronRight className={`size-4 transition-transform ${viewWaiter === w._id ? "rotate-90" : ""}`} />
                        {w.name}
                      </button>
                      <Badge variant="outline">{wTables.length} tables · {totalOrders} orders</Badge>
                    </div>
                    {viewWaiter === w._id && (
                      wTables.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No tables assigned.</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {wTables.map((t) => (
                            <div key={t._id} className="p-2 rounded-md border border-muted text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{t.tableNumber}</span>
                                <Badge className={TABLE_STATUS_BADGE[t.status] || TABLE_STATUS_BADGE.AVAILABLE}>{t.status}</Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {activeOrdersByTable[String(t._id)] || 0} order{activeOrdersByTable[String(t._id)] === 1 ? "" : "s"} · seats {t.capacity}
                              </p>
                              <div className="flex gap-1 mt-1">
                                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => navigate(`/manager/orders`)}>
                                  <Eye className="size-3" /> View
                                </Button>
                                <Button size="sm" variant="outline" className="h-6 text-[10px] text-red-600" onClick={() => handleUnassign(t._id)}>
                                  <UserX className="size-3" /> Unassign
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WaiterAssignmentPortal;