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
import { toast } from "sonner";
import {
  Truck, RefreshCw, Clock, ChefHat, CheckCircle2,
  Package, ArrowRight, Eye, MessageSquare,
} from "lucide-react";

const STATUS_TABS = [
  { key: "READY", label: "Ready to Pickup", icon: Truck, color: "green" },
  { key: "PREPARING", label: "Preparing", icon: ChefHat, color: "orange" },
  { key: "CONFIRMED", label: "Confirmed", icon: CheckCircle2, color: "blue" },
  { key: "TAKEN_BY_WAITER", label: "Being Served", icon: Package, color: "purple" },
];

const WaiterActiveOrders = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;
  const waiterId = authUser?._id;
  const { orders, getBranchOrders, isLoading, takeOrder, deliverOrder, setupSocketListeners, cleanupSocketListeners } = useOrderStore();
  const { tables, getTablesByBranch } = useTableStore();

  const [activeTab, setActiveTab] = useState("READY");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const loadOrders = useCallback(async () => {
    if (branchId) {
      await Promise.all([
        getBranchOrders(branchId, { limit: 100 }),
        getTablesByBranch(branchId),
      ]);
    }
  }, [branchId, getBranchOrders, getTablesByBranch]);

  useEffect(() => {
    loadOrders();
    setupSocketListeners();
    return cleanupSocketListeners;
  }, [loadOrders, setupSocketListeners, cleanupSocketListeners]);

  // A waiter sees ONLY orders belonging to their assigned tables (#8).
  const myTableIds = tables
    .filter((t) => {
      const assignedId = t.assignedWaiterId?._id || t.assignedWaiterId;
      return assignedId && String(assignedId) === String(waiterId);
    })
    .map((t) => t._id);
  const myOrders = orders.filter((o) => {
    const tid = o.tableId?._id || o.tableId;
    return myTableIds.length === 0 ? false : myTableIds.includes(String(tid));
  });

  const filteredOrders = myOrders.filter(o => {
    if (activeTab === "READY") return o.orderStatus === "READY";
    if (activeTab === "PREPARING") return o.orderStatus === "PREPARING";
    if (activeTab === "CONFIRMED") return o.orderStatus === "CONFIRMED" || o.orderStatus === "WAITING_FOR_PAYMENT";
    if (activeTab === "TAKEN_BY_WAITER") return o.orderStatus === "TAKEN_BY_WAITER";
    return false;
  });

  const tabCounts = {
    READY: myOrders.filter(o => o.orderStatus === "READY").length,
    PREPARING: myOrders.filter(o => o.orderStatus === "PREPARING").length,
    CONFIRMED: myOrders.filter(o => o.orderStatus === "CONFIRMED" || o.orderStatus === "WAITING_FOR_PAYMENT").length,
    TAKEN_BY_WAITER: myOrders.filter(o => o.orderStatus === "TAKEN_BY_WAITER").length,
  };

  /**
   * W2: honor the backend state machine — READY must first be claimed
   * (READY -> TAKEN_BY_WAITER via POST /waiter/orders/:id/take) before it can
   * be delivered (TAKEN_BY_WAITER -> DELIVERED -> COMPLETED). Delivering
   * straight from READY throws INVALID_STATUS_TRANSITION on the backend.
   */
  const handleTake = async (order) => {
    setActionLoading(order._id);
    try {
      const res = await takeOrder(order._id);
      if (res.success) {
        toast.success(`Order #${order.orderNumber || order._id?.slice(-4)} claimed — hand it to the customer to serve`);
        loadOrders();
      } else {
        toast.error(res.message || "Failed to claim order");
      }
    } catch (err) {
      toast.error("Failed to claim order");
    } finally {
      setActionLoading(null);
    }
  };

  const handleServe = async (order) => {
    setActionLoading(order._id);
    try {
      const res = await deliverOrder(order._id);
      if (res.success) {
        toast.success(`Order #${order.orderNumber || order._id?.slice(-4)} marked as delivered`);
        loadOrders();
      } else {
        toast.error(res.message || "Failed to mark as served");
      }
    } catch (err) {
      toast.error("Failed to mark as served");
    } finally {
      setActionLoading(null);
    }
  };

  const openDetail = (order) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  const getTimeSince = (date) => {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Active Orders</h1>
          <p className="text-sm text-gray-500">Track and serve orders in real time</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadOrders} disabled={isLoading}>
          <RefreshCw className={`size-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {STATUS_TABS.map((tab) => {
          const count = tabCounts[tab.key] || 0;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? `bg-${tab.color}-500 text-white shadow-lg`
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-gray-100 dark:bg-gray-700"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      {isLoading && orders.length === 0 ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title={`No ${STATUS_TABS.find(t => t.key === activeTab)?.label.toLowerCase() || "orders"}`}
          description="Orders will appear here when they reach this stage"
          icon={STATUS_TABS.find(t => t.key === activeTab)?.icon || Package}
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isProcessing = actionLoading === order._id;
            return (
              <Card
                key={order._id}
                className={`overflow-hidden transition-all hover:shadow-md ${
                  order.orderStatus === "READY" ? "border-2 border-green-200 dark:border-green-800" : ""
                }`}
              >
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`size-12 rounded-xl flex flex-col items-center justify-center ${
                        order.orderStatus === "READY"
                          ? "bg-green-100 dark:bg-green-900/30"
                          : order.orderStatus === "PREPARING"
                          ? "bg-orange-100 dark:bg-orange-900/30"
                          : "bg-blue-100 dark:bg-blue-900/30"
                      }`}>
                        <span className={`text-lg font-black ${
                          order.orderStatus === "READY"
                            ? "text-green-600"
                            : order.orderStatus === "PREPARING"
                            ? "text-orange-600"
                            : "text-blue-600"
                        }`}>
                          #{order.orderNumber || order._id?.slice(-4)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {order.tableId ? `Table ${order.tableId.tableNumber}` : "No Table"}
                          </p>
                          <Badge className="text-[10px]" variant="outline">{order.source}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="size-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{getTimeSince(order.createdAt)}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {(order.total || 0).toLocaleString()} ETB
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => openDetail(order)}>
                        <Eye className="size-4" />
                      </Button>
                      {order.orderStatus === "READY" && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleTake(order)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <RefreshCw className="size-4 animate-spin" />
                          ) : (
                            <>Take <ArrowRight className="size-3 ml-1" /></>
                          )}
                        </Button>
                      )}
                      {order.orderStatus === "TAKEN_BY_WAITER" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleServe(order)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <RefreshCw className="size-4 animate-spin" />
                          ) : (
                            <>Serve <ArrowRight className="size-3 ml-1" /></>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                    {order.items?.slice(0, 4).map((it, i) => (
                      <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                        {it.foodNameSnapshot} × {it.quantity}
                      </span>
                    ))}
                    {order.items?.length > 4 && (
                      <span className="text-xs text-gray-500">+{order.items.length - 4} more</span>
                    )}
                    {order.customerNote && (
                      <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-full" title={order.customerNote}>
                        <MessageSquare className="inline size-3 mr-1" /> Note
                      </span>
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
            <DialogTitle>
              Order #{selectedOrder?.orderNumber || selectedOrder?._id?.slice(-4)}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium">
                    {selectedOrder.tableId ? `Table ${selectedOrder.tableId.tableNumber}` : "No Table"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedOrder.customerName || "Guest"} • {selectedOrder.source}
                  </p>
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
                {selectedOrder.customerNote && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-xs font-semibold uppercase text-amber-700">Customer Note / Special Request</p>
                    <p className="text-sm text-amber-900 mt-1">{selectedOrder.customerNote}</p>
                  </div>
                )}
                <h4 className="text-sm font-semibold">Items</h4>
                {selectedOrder.items?.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{it.foodNameSnapshot} × {it.quantity}</span>
                    <span className="font-medium">
                      {((it.unitPriceSnapshot || 0) * it.quantity).toLocaleString()} ETB
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold border-t pt-3">
                <span>Total</span>
                <span>{(selectedOrder.total || 0).toLocaleString()} ETB</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowDetail(false)}>
                  Close
                </Button>
                {selectedOrder.orderStatus === "READY" && (
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      handleServe(selectedOrder);
                      setShowDetail(false);
                    }}
                  >
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

export default WaiterActiveOrders;
