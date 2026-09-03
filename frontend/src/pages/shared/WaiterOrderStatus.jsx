import React, { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrderStore } from "@/store/useOrderStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  RefreshCw, Clock, CheckCircle2, ChefHat, Truck,
  Package, AlertTriangle, WifiOff, Wifi,
} from "lucide-react";

const STATUS_STEPS = [
  { key: "WAITING_FOR_PAYMENT", label: "Received", icon: Clock, color: "amber" },
  { key: "CONFIRMED", label: "Confirmed", icon: CheckCircle2, color: "blue" },
  { key: "PREPARING", label: "Preparing", icon: ChefHat, color: "orange" },
  { key: "READY", label: "Ready", icon: Truck, color: "green" },
  { key: "TAKEN_BY_WAITER", label: "Served", icon: Package, color: "teal" },
];

const WaiterOrderStatus = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;
  const { orders, getBranchOrders, isLoading, deliverOrder, setupSocketListeners, cleanupSocketListeners } = useOrderStore();

  const [socketConnected, setSocketConnected] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter] = useState("ACTIVE");

  const loadOrders = useCallback(async () => {
    if (branchId) await getBranchOrders(branchId, { limit: 100 });
  }, [branchId, getBranchOrders]);

  useEffect(() => {
    loadOrders();
    setupSocketListeners();
    const socket = window.__socket;
    if (socket) {
      socket.on("connect", () => setSocketConnected(true));
      socket.on("disconnect", () => setSocketConnected(false));
    }
    return cleanupSocketListeners;
  }, [loadOrders, setupSocketListeners, cleanupSocketListeners]);

  const activeOrders = orders.filter(o => {
    if (filter === "ACTIVE") return !["COMPLETED", "CANCELLED"].includes(o.orderStatus);
    if (filter === "READY") return o.orderStatus === "READY";
    if (filter === "PREPARING") return o.orderStatus === "PREPARING";
    return true;
  });

  const handleServe = async (order) => {
    setActionLoading(order._id);
    try {
      const res = await deliverOrder(order._id);
      if (res.success) {
        toast.success(`Order #${order.orderNumber || order._id?.slice(-4)} delivered`);
        loadOrders();
      } else {
        toast.error(res.message || "Failed");
      }
    } catch (err) {
      toast.error("Failed to mark as served");
    } finally {
      setActionLoading(null);
    }
  };

  const getStepIndex = (status) => STATUS_STEPS.findIndex(s => s.key === status);

  const openDetail = (order) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order Status</h1>
          <p className="text-sm text-gray-500">Real-time order tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs ${socketConnected ? "text-green-600" : "text-amber-500"}`}>
            {socketConnected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {socketConnected ? "Live" : "Offline"}
          </div>
          <Button variant="outline" size="sm" onClick={loadOrders} disabled={isLoading}>
            <RefreshCw className={`size-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex gap-2">
        {[
          { key: "ACTIVE", label: "Active" },
          { key: "READY", label: "Ready" },
          { key: "PREPARING", label: "Preparing" },
          { key: "ALL", label: "All" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === f.key
                ? "bg-amber-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders */}
      {isLoading && orders.length === 0 ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : activeOrders.length === 0 ? (
        <EmptyState
          title="No active orders"
          description="Orders will appear here in real time"
          icon={Package}
        />
      ) : (
        <div className="space-y-3">
          {activeOrders.map((order) => {
            const currentStep = getStepIndex(order.orderStatus);
            const isProcessing = actionLoading === order._id;
            const isReady = order.orderStatus === "READY";

            return (
              <Card key={order._id} className={`overflow-hidden ${isReady ? "border-2 border-green-300 dark:border-green-700" : ""}`}>
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`size-12 rounded-xl flex flex-col items-center justify-center ${
                        isReady ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"
                      }`}>
                        <span className={`text-lg font-black ${isReady ? "text-green-600" : "text-gray-600 dark:text-gray-400"}`}>
                          #{order.orderNumber || order._id?.slice(-4)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {order.tableId ? `Table ${order.tableId.tableNumber}` : "No Table"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.customerName || "Guest"} • {order.source} • {new Date(order.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {(order.total || 0).toLocaleString()} ETB
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => openDetail(order)}>
                        <Package className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Status Progress */}
                  <div className="flex items-center justify-between mb-3">
                    {STATUS_STEPS.map((step, i) => {
                      const done = i <= currentStep;
                      const isCurrent = i === currentStep;
                      const Icon = step.icon;
                      return (
                        <div key={step.key} className="flex flex-col items-center flex-1">
                          <div className={`size-8 rounded-full flex items-center justify-center mb-1 transition-all ${
                            done
                              ? step.color === "green"
                                ? "bg-green-500 text-white"
                                : step.color === "amber"
                                ? "bg-amber-500 text-white"
                                : step.color === "blue"
                                ? "bg-blue-500 text-white"
                                : step.color === "orange"
                                ? "bg-orange-500 text-white"
                                : "bg-teal-500 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                          } ${isCurrent ? "ring-2 ring-offset-2 ring-amber-400" : ""}`}>
                            <Icon className="size-4" />
                          </div>
                          <span className={`text-[9px] font-medium text-center ${
                            done ? "text-gray-900 dark:text-white" : "text-gray-400"
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Items Preview + Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {order.items?.slice(0, 3).map((it, i) => (
                        <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                          {it.foodNameSnapshot} × {it.quantity}
                        </span>
                      ))}
                      {order.items?.length > 3 && (
                        <span className="text-xs text-gray-500">+{order.items.length - 3} more</span>
                      )}
                    </div>
                    {isReady && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 ml-2"
                        onClick={() => handleServe(order)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <RefreshCw className="size-4 animate-spin" /> : "Mark Served"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.orderNumber || selectedOrder?._id?.slice(-4)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">{selectedOrder.tableId ? `Table ${selectedOrder.tableId.tableNumber}` : "No Table"}</p>
                  <p className="text-xs text-gray-500">{selectedOrder.customerName || "Guest"}</p>
                </div>
                <Badge className={
                  selectedOrder.orderStatus === "READY" ? "bg-green-500" :
                  selectedOrder.orderStatus === "PREPARING" ? "bg-orange-500" :
                  "bg-blue-500"
                }>
                  {selectedOrder.orderStatus}
                </Badge>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Items</h4>
                {selectedOrder.items?.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{it.foodNameSnapshot} × {it.quantity}</span>
                    <span>{((it.unitPriceSnapshot || 0) * it.quantity).toLocaleString()} ETB</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold border-t pt-3">
                <span>Total</span>
                <span>{(selectedOrder.total || 0).toLocaleString()} ETB</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowDetail(false)}>Close</Button>
                {selectedOrder.orderStatus === "READY" && (
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => { handleServe(selectedOrder); setShowDetail(false); }}>
                    Mark as Served
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaiterOrderStatus;
