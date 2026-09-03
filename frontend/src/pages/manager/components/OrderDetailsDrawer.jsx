import { useMemo } from "react";
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
} from "@/components/ui/drawer";
import {
  Clock,
  ChefHat,
  CheckCircle,
  Truck,
  XCircle,
  User,
  QrCode,
  Smartphone,
  Users,
  DollarSign,
  CreditCard,
  Banknote,
  History,
  Utensils,
  MessageSquare,
} from "lucide-react";

const ORDER_STATUS_CONFIG = {
  WAITING_FOR_PAYMENT: { color: "bg-yellow-500", label: "Waiting for Payment", icon: Clock },
  CONFIRMED: { color: "bg-blue-500", label: "Confirmed", icon: CheckCircle },
  PREPARING: { color: "bg-orange-500", label: "Preparing", icon: ChefHat },
  READY: { color: "bg-green-500", label: "Ready", icon: CheckCircle },
  TAKEN_BY_WAITER: { color: "bg-purple-500", label: "Taken by Waiter", icon: Truck },
  DELIVERED: { color: "bg-indigo-500", label: "Delivered", icon: Truck },
  COMPLETED: { color: "bg-gray-500", label: "Completed", icon: CheckCircle },
  CANCELLED: { color: "bg-red-500", label: "Cancelled", icon: XCircle },
};

const PAYMENT_STATUS_CONFIG = {
  UNPAID: { color: "bg-red-500", label: "Unpaid" },
  PENDING: { color: "bg-yellow-500", label: "Pending" },
  PAID: { color: "bg-green-500", label: "Paid" },
  COMPLETED: { color: "bg-green-500", label: "Completed" },
  REFUNDED: { color: "bg-purple-500", label: "Refunded" },
  FAILED: { color: "bg-red-500", label: "Failed" },
};

const SOURCE_CONFIG = {
  CUSTOMER_QR: { label: "QR Order", icon: QrCode, color: "text-blue-600" },
  CUSTOMER_ONLINE: { label: "Online Order", icon: Smartphone, color: "text-blue-600" },
  WAITER: { label: "Waiter Order", icon: Users, color: "text-green-600" },
  CASHIER: { label: "Cashier Order", icon: CreditCard, color: "text-purple-600" },
  KIOSK: { label: "Kiosk Order", icon: CreditCard, color: "text-orange-600" },
  ONLINE: { label: "Online Order", icon: Smartphone, color: "text-blue-600" },
  DELIVERY: { label: "Delivery", icon: Truck, color: "text-indigo-600" },
};

const PAYMENT_METHOD_CONFIG = {
  CASH: { label: "Cash", icon: Banknote },
  CARD: { label: "Card", icon: CreditCard },
  TELEBIRR: { label: "Telebirr", icon: Smartphone },
  CHAPA: { label: "Chapa", icon: Smartphone },
};

const OrderTimeline = ({ order }) => {
  const events = [
    { time: order.createdAt, label: "Order Created", icon: Clock, color: "bg-green-500" },
    order.confirmedAt && { time: order.confirmedAt, label: "Confirmed", icon: CheckCircle, color: "bg-blue-500" },
    order.preparedAt && { time: order.preparedAt, label: "Kitchen Started", icon: ChefHat, color: "bg-orange-500" },
    order.readyAt && { time: order.readyAt, label: "Ready for Pickup", icon: CheckCircle, color: "bg-green-500" },
    order.takenAt && { time: order.takenAt, label: "Taken by Waiter", icon: Truck, color: "bg-purple-500" },
    order.deliveredAt && { time: order.deliveredAt, label: "Delivered", icon: Truck, color: "bg-indigo-500" },
    order.completedAt && { time: order.completedAt, label: "Completed", icon: CheckCircle, color: "bg-gray-500" },
    order.cancelledAt && { time: order.cancelledAt, label: "Cancelled", icon: XCircle, color: "bg-red-500" },
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      {events.map((event, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className={`size-6 rounded-full ${event.color} flex items-center justify-center shrink-0`}>
            <event.icon className="size-3 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{event.label}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(event.time).toLocaleString()}
            </p>
          </div>
          {i < events.length - 1 && (
            <div className="absolute left-3 top-8 w-0.5 h-4 bg-border -translate-y-2" />
          )}
        </div>
      ))}
    </div>
  );
};

const OrderDetailsDrawer = ({ order, open, onClose }) => {
  const { staff, fetchStaffByBranch } = useUserStore();

  const statusConfig = ORDER_STATUS_CONFIG[order?.orderStatus] || ORDER_STATUS_CONFIG.WAITING_FOR_PAYMENT;
  const StatusIcon = statusConfig.icon;

  const paymentStatusConfig = PAYMENT_STATUS_CONFIG[order?.paymentStatus] || { color: "bg-gray-500", label: order?.paymentStatus };
  const sourceConfig = SOURCE_CONFIG[order?.source] || SOURCE_CONFIG.CASHIER;
  const SourceIcon = sourceConfig.icon;

  const paymentMethodConfig = PAYMENT_METHOD_CONFIG[order?.paymentMethod] || { label: order?.paymentMethod, icon: CreditCard };
  const PaymentIcon = paymentMethodConfig.icon;

  const waiter = useMemo(() => {
    if (!order?.assignedWaiterId) return null;
    return staff.find(s => s._id === order.assignedWaiterId);
  }, [order, staff]);

  const orderAge = useMemo(() => {
    if (!order) return 0;
    return Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
  }, [order]);

  const isDelayed = useMemo(() => {
    if (!order) return false;
    if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(order.orderStatus)) return false;
    return orderAge > 20;
  }, [order, orderAge]);

  if (!order) return null;

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()} direction="right">
      <DrawerContent className="max-w-md">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>Order #{order.orderNumber || order._id?.slice(-6)}</DrawerTitle>
              <DrawerDescription>
                {order.tableId?.tableNumber ? `Table ${order.tableId.tableNumber}` : "No Table"}
                {" • "}
                {orderAge}m ago
              </DrawerDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className={`${statusConfig.color} text-white`}>
                <StatusIcon className="size-3 mr-1" />
                {statusConfig.label}
              </Badge>
              {isDelayed && (
                <Badge variant="destructive" className="text-xs">
                  Delayed
                </Badge>
              )}
            </div>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {/* Order Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <SourceIcon className={`size-3 ${sourceConfig.color}`} />
                    Source
                  </span>
                  <span className="font-medium">{sourceConfig.label}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{order.customerName || "Anonymous"}</span>
                </div>
                {order.tableId?.tableNumber && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Table</span>
                    <span className="font-medium">Table {order.tableId.tableNumber}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Order Type</span>
                  <Badge variant="outline">{order.orderType || "TABLE"}</Badge>
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

            {/* Customer Note / Special Request (order-level) */}
            {order.customerNote && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                    <MessageSquare className="size-4" /> Customer Note / Special Request
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-amber-900 whitespace-pre-wrap">{order.customerNote}</p>
                </CardContent>
              </Card>
            )}

            {/* Items */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Items ({order.items?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.items?.map((item, i) => (
                  <div key={item._id || i} className="flex items-start gap-3">
                    <div className="size-6 rounded bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold">{item.quantity}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.foodNameSnapshot || item.foodName}</p>
                      <p className="text-xs text-muted-foreground">
                        {(item.unitPriceSnapshot || item.unitPrice || 0).toLocaleString()} ETB each
                      </p>
                      {item.notes && (
                        <p className="text-xs text-orange-600 mt-1">Note: {item.notes}</p>
                      )}
                    </div>
                    <p className="font-medium text-sm">
                      {((item.unitPriceSnapshot || item.unitPrice || 0) * item.quantity).toLocaleString()} ETB
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className={`${paymentStatusConfig.color} text-white text-xs`}>
                    {paymentStatusConfig.label}
                  </Badge>
                </div>
                {order.paymentMethod && order.paymentMethod !== "UNSET" && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <PaymentIcon className="size-3" />
                      Method
                    </span>
                    <span className="font-medium">{paymentMethodConfig.label}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{(order.subtotal || 0).toLocaleString()} ETB</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{(order.discount || 0).toLocaleString()} ETB</span>
                    </div>
                  )}
                  {order.tax > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{(order.tax || 0).toLocaleString()} ETB</span>
                    </div>
                  )}
                  {order.serviceCharge > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Service Charge</span>
                      <span>{(order.serviceCharge || 0).toLocaleString()} ETB</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between font-bold pt-1 border-t">
                    <span>Total</span>
                    <span>{(order.total || 0).toLocaleString()} ETB</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="size-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTimeline order={order} />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DrawerFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default OrderDetailsDrawer;
