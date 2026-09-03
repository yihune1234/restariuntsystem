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
import {
  Users, RefreshCw, Clock, CheckCircle2, AlertCircle,
  ShoppingBag, Truck, Eye,
} from "lucide-react";

const TABLE_STATUS_CONFIG = {
  AVAILABLE: {
    label: "Available",
    color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    borderColor: "border-green-200 dark:border-green-800",
    icon: CheckCircle2,
  },
  OCCUPIED: {
    label: "Occupied",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: Users,
  },
  RESERVED: {
    label: "Reserved",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    borderColor: "border-purple-200 dark:border-purple-800",
    icon: Clock,
  },
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

  // A waiter's working area shows ONLY the tables assigned to them.
  // Table.assignedWaiterId is set by Manager/Owner via the assignment hub.
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
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Tables</h1>
          <p className="text-sm text-gray-500">Manage your assigned tables</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
          <RefreshCw className={`size-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { key: "ALL", label: "All" },
          { key: "AVAILABLE", label: "Available" },
          { key: "OCCUPIED", label: "Occupied" },
          { key: "RESERVED", label: "Reserved" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              statusFilter === f.key
                ? "bg-amber-500 text-white shadow-lg"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
            }`}
          >
            {f.label}
            <span className={`ml-1.5 text-xs ${statusFilter === f.key ? "opacity-80" : "text-gray-400"}`}>
              {statusCounts[f.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Tables Grid */}
      {isLoading && tables.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : filteredTables.length === 0 ? (
        <EmptyState
          title="No tables found"
          description={statusFilter !== "ALL" ? "No tables with this status" : "You don't have any tables assigned"}
          icon={Users}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredTables.map((table) => {
            const config = TABLE_STATUS_CONFIG[table.status] || TABLE_STATUS_CONFIG.AVAILABLE;
            const Icon = config.icon;
            const activeOrders = getActiveOrders(table._id);
            const readyOrders = getReadyOrders(table._id);
            const hasReady = readyOrders.length > 0;

            return (
              <Card
                key={table._id}
                className={`cursor-pointer transition-all hover:shadow-lg overflow-hidden ${
                  hasReady ? "ring-2 ring-green-500 ring-opacity-50" : ""
                } ${config.borderColor}`}
                onClick={() => openTableDetail(table)}
              >
                <CardContent className="p-4 text-center">
                  <div className={`size-14 rounded-full ${config.color} mx-auto mb-3 flex items-center justify-center`}>
                    <Icon className="size-6" />
                  </div>
                  <p className="font-bold text-lg text-gray-900 dark:text-white">Table {table.tableNumber}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{table.capacity} seats</p>
                  <Badge className={`mt-2 text-[10px] ${config.color}`}>
                    {config.label}
                  </Badge>
                  {activeOrders.length > 0 && (
                    <div className="mt-3 border-t pt-2 text-left">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                        Current Order: #{activeOrders[0].orderNumber || activeOrders[0]._id?.slice(-4)}
                        {activeOrders.length > 1 && ` (+${activeOrders.length - 1} more)`}
                      </p>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">Order:</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{activeOrders[0].orderStatus}</Badge>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">Payment:</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{activeOrders[0].paymentStatus}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">Waiter:</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[80px]">{activeOrders[0].createdBy?.name || "Unassigned"}</span>
                      </div>
                    </div>
                  )}
                  {hasReady && (
                    <Badge className="mt-2 bg-green-500 text-white text-[10px]">
                      <Truck className="size-2.5 mr-0.5" /> Ready to serve
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Table Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Table {selectedTable?.tableNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-4">
              {/* Table Info */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">{selectedTable.capacity} seats</p>
                  <p className="text-xs text-gray-500">
                    {(() => {
                      const active = getActiveOrders(selectedTable._id);
                      if (active.length === 0) return "No active orders";
                      return active.some(o => String(o.assignedWaiterId) === String(waiterId))
                        ? "You are serving this table"
                        : "Being served";
                    })()}
                  </p>
                </div>
                <Badge className={TABLE_STATUS_CONFIG[selectedTable.status]?.color}>
                  {TABLE_STATUS_CONFIG[selectedTable.status]?.label || selectedTable.status}
                </Badge>
              </div>

              {/* Orders */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Orders</h4>
                {getTableOrders(selectedTable._id).length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No orders for this table</p>
                ) : (
                  <div className="space-y-2">
                    {getTableOrders(selectedTable._id).map((order) => (
                      <div key={order._id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">
                            #{order.orderNumber || order._id?.slice(-4)} • {order.source}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.items?.length || 0} items • {(order.total || 0).toLocaleString()} ETB
                          </p>
                        </div>
                        <OrderStatusBadge status={order.orderStatus} paymentStatus={order.paymentStatus} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowDetail(false)}>
                  Close
                </Button>
                <Button className="flex-1" onClick={() => { setShowDetail(false); }}>
                  <ShoppingBag className="size-4 mr-2" /> New Order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaiterTables;
