import React, { useEffect, useCallback, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useTableStore } from "@/store/useTableStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "./StatusBadge";
import {
  ShoppingCart, Clock, ChefHat, CheckCircle2, Truck,
  RefreshCw, AlertCircle, Users, ArrowRight,
} from "lucide-react";

const TABLE_STATUS_META = {
  AVAILABLE: { label: "Available", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", icon: CheckCircle2 },
  OCCUPIED: { label: "Occupied", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", icon: Users },
  RESERVED: { label: "Reserved", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300", icon: Clock },
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

  // W1: Table has no assignedWaiterId in the backend model — see WaiterTables.
  // "My Tables" = every table in the branch; workload shows via active orders.
  const myTables = tables;
  const occupiedTables = myTables.filter(t => t.status === "OCCUPIED");

  const readyOrders = orders.filter(o => o.orderStatus === "READY");
  const preparingOrders = orders.filter(o => o.orderStatus === "PREPARING");
  const newOrders = orders.filter(o => o.orderStatus === "WAITING_FOR_PAYMENT" || o.orderStatus === "CONFIRMED");
  const takenOrders = orders.filter(o => o.orderStatus === "TAKEN_BY_WAITER");
  const servedOrders = orders.filter(o => o.orderStatus === "DELIVERED" || o.orderStatus === "COMPLETED");

  const stats = [
    {
      label: "My Active Tables",
      value: myTables.length,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      textColor: "text-blue-600 dark:text-blue-400",
      sub: `${occupiedTables.length} occupied`,
    },
    {
      label: "New Orders",
      value: newOrders.length,
      icon: ShoppingCart,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      textColor: "text-purple-600 dark:text-purple-400",
      sub: "waiting confirmation",
    },
    {
      label: "Ready to Serve",
      value: readyOrders.length,
      icon: Truck,
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      textColor: "text-green-600 dark:text-green-400",
      sub: "pick up & deliver",
      urgent: readyOrders.length > 0,
    },
    {
      label: "Payment Requests",
      value: orders.filter(o => o.paymentStatus === "PENDING").length,
      icon: Clock,
      color: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      textColor: "text-amber-600 dark:text-amber-400",
      sub: "bills to collect",
      urgent: orders.filter(o => o.paymentStatus === "PENDING").length > 0,
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Waiter Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Welcome, {authUser?.name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`size-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading && orders.length === 0 ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          stats.map((s) => (
            <Card key={s.label} className={`overflow-hidden ${s.urgent ? "ring-2 ring-green-500 ring-opacity-50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className={`size-10 rounded-xl ${s.bgColor} flex items-center justify-center`}>
                    <s.icon className={`size-5 ${s.textColor}`} />
                  </div>
                  {s.urgent && (
                    <span className="size-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{s.label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{s.value}</p>
                {s.sub && <p className="text-[10px] text-gray-400 mt-1">{s.sub}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Ready to Serve - Prominent Section */}
      {readyOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Truck className="size-5 text-green-600" /> Ready to Serve
            </h2>
            <Badge className="bg-green-500 text-white">{readyOrders.length}</Badge>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {readyOrders.slice(0, 6).map((o) => (
              <Card key={o._id} className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-900">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg">#{o.orderNumber || o._id?.slice(-4)}</span>
                    <Badge className="bg-green-500 text-white">Ready</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {o.tableId ? `Table ${o.tableId.tableNumber}` : "No Table"} • {o.source}
                  </p>
                  <div className="text-xs text-gray-500 mb-3">
                    {o.items?.slice(0, 2).map((it, i) => (
                      <p key={i}>{it.foodNameSnapshot} × {it.quantity}</p>
                    ))}
                    {o.items?.length > 2 && <p className="text-gray-400">+{o.items.length - 2} more</p>}
                  </div>
                  <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                    Mark as Served <ArrowRight className="size-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* My Tables Overview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="size-5 text-blue-600" /> My Tables
          </h2>
          <Button variant="ghost" size="sm">View All</Button>
        </div>
        {tablesLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : myTables.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="size-8 mx-auto mb-2 text-amber-400" />
              <p className="text-sm text-gray-500">No tables assigned to you yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {myTables.slice(0, 12).map((t) => {
              const tableOrders = orders.filter(o => o.tableId?._id === t._id || o.tableId === t._id);
              const hasActiveOrder = tableOrders.some(o => !["COMPLETED", "CANCELLED"].includes(o.orderStatus));
              const meta = TABLE_STATUS_META[t.status] || TABLE_STATUS_META.AVAILABLE;
              const Icon = meta.icon;

              return (
                <Card key={t._id} className="cursor-pointer hover:shadow-md transition-all">
                  <CardContent className="p-3 text-center">
                    <div className={`size-10 rounded-full ${meta.bgColor} mx-auto mb-2 flex items-center justify-center`}>
                      <Icon className={`size-5 ${meta.textColor}`} />
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white">Table {t.tableNumber}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{t.capacity} seats</p>
                    {hasActiveOrder && (
                      <Badge className="mt-2 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Recent Orders</h2>
        {loading && orders.length === 0 ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full mb-2" />)
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="size-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">No recent orders</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 5).map((o) => (
              <Card key={o._id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                      <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">
                        #{o.orderNumber || o._id?.slice(-4)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {o.tableId ? `Table ${o.tableId.tableNumber}` : "No Table"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {o.customerName || "Guest"} • {o.source}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={o.orderStatus} paymentStatus={o.paymentStatus} />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {(o.total || 0).toLocaleString()} ETB
                    </span>
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
