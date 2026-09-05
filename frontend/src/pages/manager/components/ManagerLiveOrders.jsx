import { useEffect, useState, useMemo } from "react";
import { useOrderStore } from "@/store/useOrderStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Clock,
  ChefHat,
  CheckCircle,
  Truck,
  AlertTriangle,
  XCircle,
  ShoppingCart,
  Users,
  List,
  LayoutGrid,
  QrCode,
} from "lucide-react";
import OrderDetailsDrawer from "./OrderDetailsDrawer";
import ConfirmOrderPaymentDialog from "../../shared/ConfirmOrderPaymentDialog";

const ORDER_STATUS_CONFIG = {
  WAITING_FOR_PAYMENT: { color: "bg-yellow-500", icon: Clock, label: "Waiting", variant: "outline" },
  CONFIRMED: { color: "bg-blue-500", icon: Clock, label: "Confirmed", variant: "secondary" },
  PREPARING: { color: "bg-orange-500", icon: ChefHat, label: "Preparing", variant: "secondary" },
  READY: { color: "bg-green-500", icon: CheckCircle, label: "Ready", variant: "default" },
  TAKEN_BY_WAITER: { color: "bg-purple-500", icon: Truck, label: "Taken", variant: "default" },
  DELIVERED: { color: "bg-green-600", icon: CheckCircle, label: "Delivered", variant: "default" },
  COMPLETED: { color: "bg-green-700", icon: CheckCircle, label: "Completed", variant: "default" },
  CANCELLED: { color: "bg-red-500", icon: XCircle, label: "Cancelled", variant: "destructive" },
};

const SOURCE_CONFIG = {
  CUSTOMER_QR: { label: "QR", icon: QrCode },
  CUSTOMER_ONLINE: { label: "Online", icon: ShoppingCart },
  WAITER: { label: "Waiter", icon: Users },
  CASHIER: { label: "Cashier", icon: ShoppingCart },
};

const PaymentBadge = ({ status }) => {
  const config = {
    PENDING: { variant: "secondary", label: "Pending" },
    UNPAID: { variant: "outline", label: "Unpaid", color: "text-red-600" },
    PAID: { variant: "default", label: "Paid", color: "text-green-600" },
    COMPLETED: { variant: "default", label: "Paid", color: "text-green-600" },
    REFUNDED: { variant: "destructive", label: "Refunded" },
    PARTIAL: { variant: "outline", label: "Partial" },
  };
  const { variant = "outline", label = status, color = "" } = config[status] || {};
  return <Badge variant={variant} className={color}>{label}</Badge>;
};

const OrderCard = ({ order, onClick, onConfirm }) => {
  const statusConfig = ORDER_STATUS_CONFIG[order.orderStatus] || ORDER_STATUS_CONFIG.CONFIRMED;
  const StatusIcon = statusConfig.icon;
  const orderAge = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
  const isDelayed = orderAge > 20 && !["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(order.orderStatus);
  const sourceConfig = SOURCE_CONFIG[order.source] || SOURCE_CONFIG.CASHIER;
  const SourceIcon = sourceConfig.icon;
  const canConfirm = ["UNPAID", "PENDING"].includes(order.paymentStatus) && order.orderStatus !== "CANCELLED";

  return (
    <Card
      className={`${isDelayed ? "border-orange-300 bg-orange-50" : ""} ${
        order.orderStatus === "READY" ? "border-green-300 bg-green-50" : ""
      } hover:shadow-md transition-shadow cursor-pointer`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">#{order.orderNumber || order._id?.slice(-6)}</span>
            <SourceIcon className="size-3 text-muted-foreground" />
            {isDelayed && <AlertTriangle className="size-4 text-orange-500" />}
          </div>
          <div className="flex items-center gap-1">
            <StatusIcon className={`size-3 ${statusConfig.color.replace("bg-", "text-")}`} />
            <Badge variant={statusConfig.variant} className={`text-xs ${statusConfig.color.replace("bg-", "bg-")}`}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            {order.tableId?.tableNumber ? `Table ${order.tableId.tableNumber}` : "No Table"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {orderAge}m ago
          </span>
        </div>

        <div className="space-y-1 mb-3">
          {order.items?.slice(0, 3).map((item, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span>{item.quantity}× {item.foodNameSnapshot || item.foodName}</span>
              <span className="text-muted-foreground">
                {(item.unitPriceSnapshot * item.quantity).toLocaleString()} ETB
              </span>
            </div>
          ))}
          {order.items?.length > 3 && (
            <p className="text-xs text-muted-foreground">+{order.items.length - 3} more items</p>
          )}
          {order.customerNote && (
            <div className="mt-1 p-1.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] line-clamp-2" title={order.customerNote}>
              <span className="font-semibold uppercase text-[9px]">Note:</span> {order.customerNote}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <PaymentBadge status={order.paymentStatus} />
          <div className="flex items-center gap-2">
            {canConfirm && (
              <Button
                size="sm"
                className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onConfirm) onConfirm(order);
                }}
              >
                Confirm Payment
              </Button>
            )}
            <span className="font-bold">{(order.total || 0).toLocaleString()} ETB</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TableOrderGroup = ({ tableId, tableNumber, orders, onOrderClick }) => {
  const tableTotal = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const hasUnpaid = orders.some(o => ["UNPAID", "PENDING"].includes(o.paymentStatus));
  const hasDelayed = orders.some(o => {
    if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false;
    return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000;
  });
  const latestOrderAge = orders.length > 0
    ? Math.floor((Date.now() - new Date(orders[orders.length - 1].createdAt).getTime()) / 60000)
    : 0;

  return (
    <Card className={`${hasUnpaid ? "border-red-200" : hasDelayed ? "border-orange-200" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="size-4" />
            Table {tableNumber || tableId?.slice(-4)}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasDelayed && <AlertTriangle className="size-4 text-orange-500" />}
            {hasUnpaid && <Badge variant="destructive" className="text-xs">Unpaid</Badge>}
            <Badge variant="outline" className="text-xs">{orders.length} orders</Badge>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{latestOrderAge}m since last order</span>
          <span className="font-bold text-foreground">{tableTotal.toLocaleString()} ETB</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {orders.map(order => {
          const statusConfig = ORDER_STATUS_CONFIG[order.orderStatus] || ORDER_STATUS_CONFIG.CONFIRMED;
          const StatusIcon = statusConfig.icon;
          const orderAge = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);

          return (
            <div
              key={order._id}
              className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onOrderClick(order)}
            >
              <div className={`size-2 rounded-full ${statusConfig.color}`} />
              <span className="text-xs font-medium w-16">
                #{order.orderNumber || order._id?.slice(-6)}
              </span>
              <span className="text-xs text-muted-foreground flex-1">
                {order.items?.slice(0, 2).map(i => `${i.quantity}× ${i.foodNameSnapshot || i.foodName}`).join(", ")}
                {order.items?.length > 2 && ` +${order.items.length - 2}`}
              </span>
              <span className="text-xs text-muted-foreground w-12 text-right">
                {orderAge}m
              </span>
              <Badge variant={statusConfig.variant} className={`text-xs ${statusConfig.color.replace("bg-", "bg-")} text-white`}>
                {statusConfig.label}
              </Badge>
              <span className="font-bold text-sm w-20 text-right">
                {(order.total || 0).toLocaleString()}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

const ManagerLiveOrders = ({ orders: propOrders, title = "Live Orders" }) => {
  const { orders: storeOrders, getOrders, isLoading, setupSocketListeners, cleanupSocketListeners } = useOrderStore();
  const orders = propOrders || storeOrders;

  const [localFilter, setLocalFilter] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmOrder, setConfirmOrder] = useState(null);

  useEffect(() => {
    if (!propOrders) {
      getOrders({ limit: 50 });
    }
    setupSocketListeners();
    return () => cleanupSocketListeners();
  }, [propOrders, getOrders, setupSocketListeners, cleanupSocketListeners]);

  const filteredOrders = useMemo(() => {
    let filtered = orders.filter(o => !["COMPLETED", "CANCELLED"].includes(o.orderStatus));
    if (localFilter) {
      if (localFilter === "delayed") {
        filtered = filtered.filter(o => {
          if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false;
          return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000;
        });
      } else if (localFilter === "unpaid") {
        filtered = filtered.filter(o => ["UNPAID", "PENDING"].includes(o.paymentStatus));
      } else {
        filtered = filtered.filter(o => o.orderStatus === localFilter);
      }
    }
    return filtered;
  }, [orders, localFilter]);

  const statusCounts = useMemo(() => {
    const active = orders.filter(o => !["COMPLETED", "CANCELLED"].includes(o.orderStatus));
    const delayed = active.filter(o => {
      if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false;
      return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000;
    }).length;
    const unpaid = active.filter(o => ["UNPAID", "PENDING"].includes(o.paymentStatus)).length;

    return {
      all: active.length,
      new: active.filter(o => o.orderStatus === "WAITING_FOR_PAYMENT" || o.orderStatus === "CONFIRMED").length,
      preparing: active.filter(o => o.orderStatus === "PREPARING").length,
      ready: active.filter(o => o.orderStatus === "READY").length,
      taken: active.filter(o => o.orderStatus === "TAKEN_BY_WAITER").length,
      delivered: active.filter(o => o.orderStatus === "DELIVERED").length,
      delayed,
      unpaid,
    };
  }, [orders]);

  const groupedByTable = useMemo(() => {
    const groups = {};
    filteredOrders.forEach(order => {
      const tableKey = order.tableId?._id || "no-table";
      if (!groups[tableKey]) {
        groups[tableKey] = {
          tableId: order.tableId?._id,
          tableNumber: order.tableId?.tableNumber,
          orders: [],
        };
      }
      groups[tableKey].orders.push(order);
    });
    return Object.values(groups).sort((a, b) => {
      const aLatest = a.orders[0]?.createdAt || "";
      const bLatest = b.orders[0]?.createdAt || "";
      return new Date(bLatest) - new Date(aLatest);
    });
  }, [filteredOrders]);

  const statusTabs = [
    { key: "", label: `All`, count: statusCounts.all },
    { key: "WAITING_FOR_PAYMENT", label: `New`, count: statusCounts.new },
    { key: "PREPARING", label: `Preparing`, count: statusCounts.preparing },
    { key: "READY", label: `Ready`, count: statusCounts.ready },
    { key: "TAKEN_BY_WAITER", label: `Taken`, count: statusCounts.taken },
    { key: "DELIVERED", label: `Delivered`, count: statusCounts.delivered },
    { key: "delayed", label: `Delayed`, count: statusCounts.delayed, highlight: statusCounts.delayed > 0 },
    { key: "unpaid", label: `Unpaid`, count: statusCounts.unpaid, highlight: statusCounts.unpaid > 0 },
  ];

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="size-4" />
              {title}
            </CardTitle>
            <div className="flex gap-2">
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-2 ${viewMode === "grid" ? "bg-muted" : ""}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-2 ${viewMode === "table" ? "bg-muted" : ""}`}
                  onClick={() => setViewMode("table")}
                >
                  <List className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-1 flex-wrap mt-2 overflow-x-auto pb-1">
            {statusTabs.map(tab => (
              <Badge
                key={tab.key || "all"}
                variant={localFilter === tab.key ? "default" : "outline"}
                className={`cursor-pointer text-xs whitespace-nowrap ${
                  tab.highlight ? "border-red-500 text-red-600" : ""
                }`}
                onClick={() => setLocalFilter(tab.key)}
              >
                {tab.label} ({tab.count})
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading && orders.length === 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : filteredOrders.length === 0 ? (
            <EmptyState title="No orders" description="Orders will appear here in real-time." />
          ) : viewMode === "table" ? (
            <div className="space-y-4">
              {groupedByTable.map(group => (
                <TableOrderGroup
                  key={group.tableId || "no-table"}
                  tableId={group.tableId}
                  tableNumber={group.tableNumber}
                  orders={group.orders}
                  onOrderClick={setSelectedOrder}
                />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredOrders.slice(0, 24).map(order => (
                <OrderCard
                  key={order._id}
                  order={order}
                  onClick={() => setSelectedOrder(order)}
                  onConfirm={setConfirmOrder}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <OrderDetailsDrawer
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />

      <ConfirmOrderPaymentDialog
        order={confirmOrder}
        open={!!confirmOrder}
        onClose={() => setConfirmOrder(null)}
        onConfirmed={() => getOrders({ limit: 50 })}
      />
    </>
  );
};

export default ManagerLiveOrders;
