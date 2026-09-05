import React, { useEffect, useCallback, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useTableStore } from "@/store/useTableStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "./StatusBadge";
import { ShoppingCart, Truck, Clock, Users, RefreshCw } from "lucide-react";

const TABLE_STATUS_META = {
  AVAILABLE: { label: "Available", color: "bg-green-100 text-green-800" },
  OCCUPIED: { label: "Occupied", color: "bg-blue-100 text-blue-800" },
  RESERVED: { label: "Reserved", color: "bg-purple-100 text-purple-800" },
};

const WaiterDashboard = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;
  const waiterId = authUser?._id;
  const { orders, getBranchOrders, isLoading, setupSocketListeners, cleanupSocketListeners } = useOrderStore();
  const { tables, getTablesByBranch, isLoading: tablesLoading } = useTableStore();

  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    await Promise.all([
      getBranchOrders(branchId, { limit: 50 }),
      getTablesByBranch(branchId),
    ]);
    setLoading(false);
  }, [branchId, getBranchOrders, getTablesByBranch]);

  useEffect(() => {
    loadData();
    setupSocketListeners();
    return cleanupSocketListeners;
  }, [loadData, setupSocketListeners, cleanupSocketListeners]);

  const myTables = tables;
  const occupiedTables = myTables.filter(t => t.status === "OCCUPIED");
  const readyOrders = orders.filter(o => o.orderStatus === "READY");
  const preparingOrders = orders.filter(o => o.orderStatus === "PREPARING");
  const newOrders = orders.filter(o => o.orderStatus === "WAITING_FOR_PAYMENT" || o.orderStatus === "CONFIRMED");
  const pendingPayments = orders.filter(o => o.paymentStatus === "PENDING");

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {authUser?.name}</h1>
          <p className="text-sm text-muted-foreground">Waiter Dashboard</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`size-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <Users className="size-6 mx-auto mb-2 text-blue-600" />
            <p className="text-3xl font-bold text-blue-700">{myTables.length}</p>
            <p className="text-sm text-blue-600">My Tables</p>
            <p className="text-xs text-blue-500/80 mt-1">{occupiedTables.length} occupied</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <ShoppingCart className="size-6 mx-auto mb-2 text-purple-600" />
            <p className="text-3xl font-bold text-purple-700">{newOrders.length}</p>
            <p className="text-sm text-purple-600">New Orders</p>
          </CardContent>
        </Card>
        <Card className={`${readyOrders.length > 0 ? "bg-green-50 border-green-200" : "bg-muted"}`}>
          <CardContent className="p-4 text-center">
            <Truck className="size-6 mx-auto mb-2 text-green-600" />
            <p className="text-3xl font-bold text-green-700">{readyOrders.length}</p>
            <p className="text-sm text-green-600">Ready to Serve</p>
          </CardContent>
        </Card>
        <Card className={`${pendingPayments.length > 0 ? "bg-amber-50 border-amber-200" : "bg-muted"}`}>
          <CardContent className="p-4 text-center">
            <Clock className="size-6 mx-auto mb-2 text-amber-600" />
            <p className="text-3xl font-bold text-amber-700">{pendingPayments.length}</p>
            <p className="text-sm text-amber-600">Pending Payment</p>
          </CardContent>
        </Card>
      </div>

      {readyOrders.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Truck className="size-5 text-green-600" /> Ready to Serve
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {readyOrders.slice(0, 6).map((o) => (
              <Card key={o._id} className="border-2 border-green-200 bg-green-50/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-bold text-lg">#{o.orderNumber?.slice(-6) || o._id?.slice(-6)}</span>
                    <Badge className="bg-green-500 text-white">Ready</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {o.tableId ? `Table ${o.tableId.tableNumber}` : "No Table"}
                  </p>
                  <p className="text-lg font-bold">{(o.total || 0).toLocaleString()} ETB</p>
                  <Button size="sm" className="w-full mt-3 bg-green-600 hover:bg-green-700">
                    Mark Served
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold mb-3">My Tables</h2>
        {tablesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : myTables.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No tables assigned yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {myTables.slice(0, 12).map((t) => {
              const tableOrders = orders.filter(o => o.tableId?._id === t._id || o.tableId === t._id);
              const hasActiveOrder = tableOrders.some(o => !["COMPLETED", "CANCELLED"].includes(o.orderStatus));
              const meta = TABLE_STATUS_META[t.status] || TABLE_STATUS_META.AVAILABLE;

              return (
                <Card key={t._id} className="cursor-pointer hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-bold text-lg">T{t.tableNumber}</p>
                      <Badge variant="outline" className={meta.color}>{meta.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{t.capacity} seats</p>
                    {hasActiveOrder && (
                      <Badge className="mt-2 bg-amber-100 text-amber-700">Active</Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">Recent Orders</h2>
        {loading && orders.length === 0 ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 mb-2" />)
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No recent orders</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 5).map((o) => (
              <Card key={o._id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                      <span className="font-bold text-sm">#{o.orderNumber?.slice(-6) || o._id?.slice(-6)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{o.tableId ? `Table ${o.tableId.tableNumber}` : "No Table"}</p>
                      <p className="text-xs text-muted-foreground">{o.customerName || "Guest"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={o.orderStatus} paymentStatus={o.paymentStatus} />
                    <span className="font-bold">{(o.total || 0).toLocaleString()} ETB</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WaiterDashboard;
