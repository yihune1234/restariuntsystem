import { useEffect, useState } from "react";
import { useOrderStore } from "@/store/useOrderStore";
import { usePaymentStore } from "@/store/usePaymentStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import {
  DollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
} from "lucide-react";

const PAYMENT_METHOD_ICONS = {
  CASH: Banknote,
  CARD: CreditCard,
  TELEBIRR: Smartphone,
  CHAPA: Smartphone,
  CASHIER_CASH: Banknote,
  CASHIER_CARD: CreditCard,
};

const PAYMENT_STATUS_CONFIG = {
  PENDING: { color: "text-yellow-600", bg: "bg-yellow-50", icon: Clock, label: "Pending" },
  UNPAID: { color: "text-orange-600", bg: "bg-orange-50", icon: AlertCircle, label: "Unpaid" },
  COMPLETED: { color: "text-green-600", bg: "bg-green-50", icon: CheckCircle, label: "Paid" },
  PAID: { color: "text-green-600", bg: "bg-green-50", icon: CheckCircle, label: "Paid" },
  REFUNDED: { color: "text-red-600", bg: "bg-red-50", icon: XCircle, label: "Refunded" },
  PARTIAL: { color: "text-purple-600", bg: "bg-purple-50", icon: AlertCircle, label: "Partial" },
};

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "TELEBIRR", label: "Telebirr", icon: Smartphone },
  { value: "CHAPA", label: "Chapa", icon: Smartphone },
  { value: "BANK_TRANSFER", label: "Bank", icon: Smartphone },
];

const PaymentRow = ({ order, onConfirm }) => {
  const statusConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus] || PAYMENT_STATUS_CONFIG.UNPAID;
  const StatusIcon = statusConfig.icon;
  const MethodIcon = PAYMENT_METHOD_ICONS[order.paymentMethod] || DollarSign;
  const canConfirm = ["UNPAID", "PENDING"].includes(order.paymentStatus);

  return (
    <div className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/30">
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-lg ${statusConfig.bg} flex items-center justify-center`}>
          <StatusIcon className={`size-5 ${statusConfig.color}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">#{order.orderNumber || order._id?.slice(-6)}</span>
            <Badge variant={statusConfig.label === "Paid" ? "default" : "outline"} className="text-xs">
              {statusConfig.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MethodIcon className="size-3" />
            <span>{order.paymentMethod || "N/A"}</span>
            <span>•</span>
            <span>Table {order.tableId?.tableNumber || "—"}</span>
            <span>•</span>
            <span>{order.items?.length || 0} items</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-bold">{(order.total || 0).toLocaleString()} ETB</p>
          <p className="text-xs text-muted-foreground">
            {new Date(order.updatedAt || order.createdAt).toLocaleTimeString()}
          </p>
        </div>
        {canConfirm && (
          <Button size="sm" onClick={() => onConfirm(order)} className="bg-green-600 hover:bg-green-700">
            Confirm
          </Button>
        )}
      </div>
    </div>
  );
};

const ManagerPaymentsPanel = () => {
  const { orders, getOrders, isLoading } = useOrderStore();
  const { confirmCashierPayment } = usePaymentStore();
  const [filter, setFilter] = useState("all");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountReceived, setAmountReceived] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    getOrders({ limit: 100 });
  }, [getOrders]);

  const filteredOrders = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "paid") return ["COMPLETED", "PAID"].includes(o.paymentStatus);
    if (filter === "unpaid") return ["UNPAID", "PENDING"].includes(o.paymentStatus);
    if (filter === "refunded") return o.paymentStatus === "REFUNDED";
    return true;
  });

  const stats = {
    total: orders.reduce((sum, o) => sum + (o.total || 0), 0),
    paid: orders.filter((o) => ["COMPLETED", "PAID"].includes(o.paymentStatus)).reduce((sum, o) => sum + (o.total || 0), 0),
    unpaid: orders.filter((o) => ["UNPAID", "PENDING"].includes(o.paymentStatus)).reduce((sum, o) => sum + (o.total || 0), 0),
    cash: orders.filter((o) => o.paymentMethod?.includes("CASH") && ["COMPLETED", "PAID"].includes(o.paymentStatus)).reduce((sum, o) => sum + (o.total || 0), 0),
    card: orders.filter((o) => o.paymentMethod?.includes("CARD") && ["COMPLETED", "PAID"].includes(o.paymentStatus)).reduce((sum, o) => sum + (o.total || 0), 0),
    digital: orders.filter((o) => ["TELEBIRR", "CHAPA"].includes(o.paymentMethod) && ["COMPLETED", "PAID"].includes(o.paymentStatus)).reduce((sum, o) => sum + (o.total || 0), 0),
  };

  const filterTabs = [
    { key: "all", label: `All (${orders.length})` },
    { key: "paid", label: `Paid (${orders.filter((o) => ["COMPLETED", "PAID"].includes(o.paymentStatus)).length})` },
    { key: "unpaid", label: `Unpaid (${orders.filter((o) => ["UNPAID", "PENDING"].includes(o.paymentStatus)).length})` },
    { key: "refunded", label: `Refunded (${orders.filter((o) => o.paymentStatus === "REFUNDED").length})` },
  ];

  const handleOpenConfirm = (order) => {
    setConfirmDialog(order);
    setPaymentMethod("CASH");
    setAmountReceived("");
  };

  const handleConfirm = async () => {
    if (!confirmDialog) return;
    if (paymentMethod === "CASH" && (!amountReceived || Number(amountReceived) < confirmDialog.total)) {
      toast.error("Enter valid amount received");
      return;
    }
    setProcessing(true);
    try {
      const res = await confirmCashierPayment(confirmDialog._id, { paymentMethod });
      if (res.success) {
        toast.success(`Payment confirmed for order #${confirmDialog.orderNumber || confirmDialog._id?.slice(-6)}`);
        setConfirmDialog(null);
        getOrders({ limit: 100 });
      } else {
        toast.error(res.message || "Payment failed");
      }
    } catch (err) {
      toast.error(err.message || "Failed to confirm payment");
    } finally {
      setProcessing(false);
    }
  };

  const change = paymentMethod === "CASH" && amountReceived
    ? Math.max(0, Number(amountReceived) - (confirmDialog?.total || 0))
    : 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="size-4" />
            Payment Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-xl font-bold text-green-600">{stats.paid.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">ETB</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Unpaid</p>
              <p className="text-xl font-bold text-red-600">{stats.unpaid.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">ETB</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Cash</p>
              <p className="text-xl font-bold text-blue-600">{stats.cash.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">ETB</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Card/Digital</p>
              <p className="text-xl font-bold text-purple-600">{(stats.card + stats.digital).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">ETB</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            {filterTabs.map((tab) => (
              <Badge
                key={tab.key}
                variant={filter === tab.key ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFilter(tab.key)}
              >
                {tab.label}
              </Badge>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : filteredOrders.length === 0 ? (
            <EmptyState title="No payments" description="Payments will appear here." />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {filteredOrders.slice(0, 50).map((order) => (
                <PaymentRow key={order._id} order={order} onConfirm={handleOpenConfirm} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>
          {confirmDialog && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-semibold">Order #{confirmDialog.orderNumber || confirmDialog._id?.slice(-6)}</p>
                <p className="text-sm text-muted-foreground">
                  Table {confirmDialog.tableId?.tableNumber || "—"} • {confirmDialog.items?.length || 0} items
                </p>
                <p className="text-xl font-bold mt-2">{(confirmDialog.total || 0).toLocaleString()} ETB</p>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Payment Method</Label>
                <div className="grid grid-cols-5 gap-2">
                  {PAYMENT_METHOD_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setPaymentMethod(m.value)}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        paymentMethod === m.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-muted"
                      }`}
                    >
                      <m.icon className="size-4 mx-auto mb-1" />
                      <span className="text-xs">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === "CASH" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Amount Received (ETB)</Label>
                    <Input
                      type="number"
                      min={confirmDialog.total}
                      step="0.01"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      className="mt-1"
                      placeholder={`Min ${confirmDialog.total?.toLocaleString()}`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Change (ETB)</Label>
                    <div className="mt-1 h-10 rounded-md border bg-muted px-3 flex items-center justify-center font-bold text-lg text-green-600">
                      {change.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={processing}>
              {processing ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle className="size-4 mr-2" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManagerPaymentsPanel;
