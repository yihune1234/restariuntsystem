import { useMemo } from "react";
import { useOrderStore } from "@/store/useOrderStore";
import { useUserStore } from "@/store/useUserStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Users,
  Clock,
  QrCode,
  User,
  CheckCircle,
  ChefHat,
  Truck,
  DollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  History,
  AlertCircle,
  Circle,
} from "lucide-react";

const PAYMENT_METHOD_ICONS = {
  CASH: Banknote,
  CARD: CreditCard,
  TELEBIRR: Smartphone,
  CHAPA: Smartphone,
};

const getTableStatus = (table, tableOrders) => {
  if (!table) return { key: "unknown", label: "Unknown", color: "bg-gray-500", textColor: "text-gray-500" };
  if (table.status === "AVAILABLE") return { key: "available", label: "Available", color: "bg-green-500", textColor: "text-green-600" };
  if (table.status === "RESERVED") return { key: "reserved", label: "Reserved", color: "bg-yellow-500", textColor: "text-yellow-600" };
  if (table.status === "CLEANING") return { key: "cleaning", label: "Cleaning", color: "bg-gray-500", textColor: "text-gray-500" };

  const hasDelayed = tableOrders.some(o => {
    if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false;
    return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000;
  });
  const hasUnpaid = tableOrders.some(o =>
    ["UNPAID", "PENDING"].includes(o.paymentStatus) &&
    ["COMPLETED", "DELIVERED", "TAKEN_BY_WAITER"].includes(o.orderStatus)
  );
  const isPreparing = tableOrders.some(o => ["CONFIRMED", "PREPARING"].includes(o.orderStatus));
  const isReady = tableOrders.some(o => o.orderStatus === "READY");
  const isServed = tableOrders.some(o => ["TAKEN_BY_WAITER", "DELIVERED"].includes(o.orderStatus));

  if (hasDelayed || (hasUnpaid && isServed)) return { key: "attention", label: "Needs Attention", color: "bg-pink-500", textColor: "text-pink-600" };
  if (hasUnpaid && isServed) return { key: "payment_pending", label: "Payment Pending", color: "bg-red-500", textColor: "text-red-600" };
  if (isReady) return { key: "ready", label: "Ready", color: "bg-purple-500", textColor: "text-purple-600" };
  if (isPreparing) return { key: "preparing", label: "Preparing", color: "bg-orange-500", textColor: "text-orange-600" };
  if (isServed) return { key: "served", label: "Served", color: "bg-indigo-500", textColor: "text-indigo-600" };
  if (tableOrders.length > 0 && table.qrToken) return { key: "ordering", label: "Ordering", color: "bg-yellow-500", textColor: "text-yellow-600" };
  if (tableOrders.length > 0) return { key: "occupied", label: "Occupied", color: "bg-blue-500", textColor: "text-blue-600" };
  return { key: "available", label: "Available", color: "bg-green-500", textColor: "text-green-600" };
};

const getOrderStatusConfig = (status) => {
  const config = {
    WAITING_FOR_PAYMENT: { color: "bg-yellow-500", label: "Waiting for Payment" },
    CONFIRMED: { color: "bg-blue-500", label: "Confirmed" },
    PREPARING: { color: "bg-orange-500", label: "Preparing" },
    READY: { color: "bg-green-500", label: "Ready" },
    TAKEN_BY_WAITER: { color: "bg-purple-500", label: "Taken by Waiter" },
    DELIVERED: { color: "bg-indigo-500", label: "Delivered" },
    COMPLETED: { color: "bg-gray-500", label: "Completed" },
    CANCELLED: { color: "bg-red-500", label: "Cancelled" },
  };
  return config[status] || { color: "bg-gray-500", label: status };
};

const OrderTimeline = ({ order }) => {
  const events = [
    { time: order.createdAt, label: "Order Created", icon: Clock },
    order.confirmedAt && { time: order.confirmedAt, label: "Confirmed", icon: CheckCircle },
    order.preparedAt && { time: order.preparedAt, label: "Kitchen Started", icon: ChefHat },
    order.readyAt && { time: order.readyAt, label: "Ready for Pickup", icon: CheckCircle },
    order.deliveredAt && { time: order.deliveredAt, label: "Delivered", icon: Truck },
  ].filter(Boolean);

  return (
    <div className="space-y-2">
      {events.map((event, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className={`size-4 rounded-full bg-green-500 flex items-center justify-center`}>
            <event.icon className="size-2 text-white" />
          </div>
          <span className="text-muted-foreground">{event.label}</span>
          <span className="ml-auto text-muted-foreground">
            {new Date(event.time).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
};

const TableDetailsDrawer = ({ table, orders, open, onClose, onOrderClick }) => {
  const { staff, fetchStaffByBranch } = useUserStore();

  const tableOrders = useMemo(() =>
    orders.filter(o => o.tableId?._id === table?._id && !["COMPLETED", "CANCELLED"].includes(o.orderStatus)),
    [orders, table]
  );

  const allTableOrders = useMemo(() =>
    orders.filter(o => o.tableId?._id === table?._id),
    [orders, table]
  );

  const status = useMemo(() => getTableStatus(table, tableOrders), [table, tableOrders]);

  const tableStats = useMemo(() => {
    const total = tableOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const paid = tableOrders
      .filter(o => ["COMPLETED", "PAID"].includes(o.paymentStatus))
      .reduce((sum, o) => sum + (o.total || 0), 0);
    const unpaid = tableOrders
      .filter(o => ["UNPAID", "PENDING"].includes(o.paymentStatus))
      .reduce((sum, o) => sum + (o.total || 0), 0);
    const occupiedMinutes = tableOrders.length > 0
      ? Math.floor((Date.now() - new Date(tableOrders[0].createdAt).getTime()) / 60000)
      : 0;

    return { total, paid, unpaid, occupiedMinutes };
  }, [tableOrders]);

  const waiter = useMemo(() => {
    if (!tableOrders.length) return null;
    const waiterId = tableOrders[0].assignedWaiterId;
    if (!waiterId) return null;
    return staff.find(s => s._id === waiterId);
  }, [tableOrders, staff]);

  const sourceLabel = useMemo(() => {
    if (!tableOrders.length) return "None";
    const sources = new Set(tableOrders.map(o => o.source));
    if (sources.has("CUSTOMER_QR")) return "QR Order";
    if (sources.has("WAITER")) return "Waiter Order";
    if (sources.has("CASHIER")) return "Cashier Order";
    return [...sources].join(", ");
  }, [tableOrders]);

  if (!table) return null;

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()} direction="right">
      <DrawerContent className="max-w-md">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>Table {table.tableNumber}</DrawerTitle>
              <DrawerDescription>{table.area || "Main Dining"} • {table.capacity || 4} seats</DrawerDescription>
            </div>
            <Badge className={`${status.color} text-white`}>{status.label}</Badge>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {/* Table Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Table Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <QrCode className="size-3" /> QR Status
                  </span>
                  <Badge variant={table.qrToken ? "default" : "outline"}>
                    {table.qrToken ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="size-3" /> Occupied
                  </span>
                  <span className="font-medium">{tableStats.occupiedMinutes} min</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Users className="size-3" /> Active Orders
                  </span>
                  <span className="font-medium">{tableOrders.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Order Source</span>
                  <span className="font-medium">{sourceLabel}</span>
                </div>
              </CardContent>
            </Card>

            {/* Assigned Waiter */}
            {waiter && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Assigned Waiter</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="size-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{waiter.name}</p>
                      <p className="text-xs text-muted-foreground">{waiter.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Orders */}
            {tableOrders.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Active Orders ({tableOrders.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tableOrders.map(order => {
                    const statusConfig = getOrderStatusConfig(order.orderStatus);
                    return (
                      <div
                        key={order._id}
                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => onOrderClick?.(order)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">
                            #{order.orderNumber || order._id?.slice(-6)}
                          </span>
                          <Badge className={`${statusConfig.color} text-white text-xs`}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {order.items?.slice(0, 3).map(item => (
                            <div key={item._id}>
                              {item.quantity}× {item.foodNameSnapshot || item.foodName}
                            </div>
                          ))}
                          {order.items?.length > 3 && (
                            <div>+{order.items.length - 3} more items</div>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant={["UNPAID", "PENDING"].includes(order.paymentStatus) ? "destructive" : "default"} className="text-xs">
                            {order.paymentStatus}
                          </Badge>
                          <span className="font-bold text-sm">{(order.total || 0).toLocaleString()} ETB</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Payment Summary */}
            {allTableOrders.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Table Total</span>
                    <span className="font-bold">{tableStats.total.toLocaleString()} ETB</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="font-medium text-green-600">{tableStats.paid.toLocaleString()} ETB</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Unpaid</span>
                    <span className={`font-medium ${tableStats.unpaid > 0 ? "text-red-600" : ""}`}>
                      {tableStats.unpaid.toLocaleString()} ETB
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity Timeline */}
            {allTableOrders.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="size-4" /> Activity Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allTableOrders.slice(0, 3).map(order => (
                    <div key={order._id} className="mb-4 last:mb-0">
                      <p className="text-xs font-medium mb-2">Order #{order.orderNumber || order._id?.slice(-6)}</p>
                      <OrderTimeline order={order} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <DrawerFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default TableDetailsDrawer;
