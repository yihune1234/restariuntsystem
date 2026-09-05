import React, { useEffect, useCallback, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useTableStore } from "@/store/useTableStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderStatusBadge } from "./StatusBadge";
import { CheckCircle2, Clock, Users, Truck } from "lucide-react";

const TABLE_STATUS_CONFIG = {
  AVAILABLE: { label: "Available", color: "bg-green-100 text-green-800", border: "border-green-300" },
  OCCUPIED: { label: "Occupied", color: "bg-blue-100 text-blue-800", border: "border-blue-300" },
  RESERVED: { label: "Reserved", color: "bg-purple-100 text-purple-800", border: "border-purple-300" },
};

const WaiterTables = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;
  const waiterId = authUser?._id;
  const { orders, getBranchOrders, isLoading: ordersLoading } = useOrderStore();
  const { tables, getTablesByBranch, isLoading: tablesLoading } = useTableStore();

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedTable, setSelectedTable] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadData = useCallback(async () => {
    if (!branchId) return;
    await Promise.all([
      getBranchOrders(branchId, { limit: 100 }),
      getTablesByBranch(branchId),
    ]);
  }, [branchId, getBranchOrders, getTablesByBranch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const myTables = tables.filter((t) => {
    const assignedId = t.assignedWaiterId?._id || t.assignedWaiterId;
    return assignedId && String(assignedId) === String(waiterId);
  });

  const filteredTables = myTables.filter(t => {
    if (statusFilter === "ALL") return true;
    return t.status === statusFilter;
  });

  const getTableOrders = (tableId) => {
    return orders.filter(o => o.tableId?._id === tableId || o.tableId === tableId);
  };

  const getActiveOrders = (tableId) => {
    return getTableOrders(tableId).filter(o => !["COMPLETED", "CANCELLED"].includes(o.orderStatus));
  };

  const getReadyOrders = (tableId) => {
    return getTableOrders(tableId).filter(o => o.orderStatus === "READY");
  };

  const openTableDetail = (table) => {
    setSelectedTable(table);
    setShowDetail(true);
  };

  const statusCounts = {
    ALL: myTables.length,
    AVAILABLE: myTables.filter(t => t.status === "AVAILABLE").length,
    OCCUPIED: myTables.filter(t => t.status === "OCCUPIED").length,
    RESERVED: myTables.filter(t => t.status === "RESERVED").length,
  };

  const isLoading = ordersLoading || tablesLoading;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Tables</h1>
          <p className="text-sm text-muted-foreground">Your assigned tables</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: "ALL", label: "All" },
          { key: "AVAILABLE", label: "Available" },
          { key: "OCCUPIED", label: "Occupied" },
          { key: "RESERVED", label: "Reserved" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              statusFilter === f.key
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label} ({statusCounts[f.key] || 0})
          </button>
        ))}
      </div>

      {isLoading && tables.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : filteredTables.length === 0 ? (
        <EmptyState
          title="No tables found"
          description={statusFilter !== "ALL" ? "No tables with this status" : "No tables assigned to you"}
          icon={Users}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const config = TABLE_STATUS_CONFIG[table.status] || TABLE_STATUS_CONFIG.AVAILABLE;
            const activeOrders = getActiveOrders(table._id);
            const readyOrders = getReadyOrders(table._id);
            const hasReady = readyOrders.length > 0;

            return (
              <Card
                key={table._id}
                className={`cursor-pointer transition-all hover:shadow-lg border-2 ${config.border} ${
                  hasReady ? "ring-2 ring-green-500" : ""
                }`}
                onClick={() => openTableDetail(table)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-xl">Table {table.tableNumber}</p>
                      <p className="text-sm text-muted-foreground">{table.capacity} seats</p>
                    </div>
                    <Badge variant="outline" className={config.color}>{config.label}</Badge>
                  </div>

                  {activeOrders.length > 0 ? (
                    <div className="space-y-2 pt-3 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Order #{activeOrders[0].orderNumber?.slice(-6) || activeOrders[0]._id?.slice(-6)}</span>
                        {hasReady && (
                          <Badge className="bg-green-500 text-white text-xs">
                            <Truck className="size-3 mr-1" /> Ready
                          </Badge>
                        )}
                      </div>
                      <p className="text-lg font-bold">{(activeOrders[0].total || 0).toLocaleString()} ETB</p>
                    </div>
                  ) : (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground">No active orders</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Table {selectedTable?.tableNumber}</DialogTitle>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{selectedTable.capacity} seats</p>
                  <p className="text-sm text-muted-foreground">Status: {selectedTable.status}</p>
                </div>
                <Badge variant="outline" className={TABLE_STATUS_CONFIG[selectedTable.status]?.color}>
                  {TABLE_STATUS_CONFIG[selectedTable.status]?.label}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Orders</h4>
                {getTableOrders(selectedTable._id).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No orders</p>
                ) : (
                  <div className="space-y-2">
                    {getTableOrders(selectedTable._id).map((order) => (
                      <div key={order._id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">#{order.orderNumber?.slice(-6) || order._id?.slice(-6)}</p>
                          <p className="text-xs text-muted-foreground">{order.items?.length || 0} items</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{(order.total || 0).toLocaleString()} ETB</p>
                          <OrderStatusBadge status={order.orderStatus} paymentStatus={order.paymentStatus} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowDetail(false)}>
                  Close
                </Button>
                <Button className="flex-1">New Order</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaiterTables;
