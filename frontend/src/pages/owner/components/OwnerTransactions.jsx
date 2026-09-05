import { useEffect, useState } from "react";
import { useOrderStore } from "@/store/useOrderStore";
import { usePaymentStore } from "@/store/usePaymentStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "./KpiCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  DollarSign,
  ShoppingCart,
  XCircle,
  Receipt,
  Wallet,
  CheckCircle,
  Banknote,
  CreditCard,
  Smartphone,
  Loader2,
} from "lucide-react";

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "TELEBIRR", label: "Telebirr", icon: Smartphone },
  { value: "CHAPA", label: "Chapa", icon: Smartphone },
  { value: "BANK_TRANSFER", label: "Bank", icon: Smartphone },
];

const OwnerTransactions = () => {
  const { orders, getOrders, isLoading } = useOrderStore();
  const { confirmCashierPayment } = usePaymentStore();
  const [filter, setFilter] = useState("all");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountReceived, setAmountReceived] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    getOrders({ limit: 200 });
  }, [getOrders]);

  const filteredOrders = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "completed") return o.orderStatus !== "CANCELLED";
    if (filter === "cancelled") return o.orderStatus === "CANCELLED";
    if (filter === "paid") return o.paymentStatus === "PAID";
    if (filter === "unpaid") return o.paymentStatus === "UNPAID" || o.paymentStatus === "PENDING";
    return true;
  });

  const totalRevenue = filteredOrders
    .filter((o) => o.orderStatus !== "CANCELLED")
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const totalTax = filteredOrders.reduce((sum, o) => sum + (o.tax || 0), 0);
  const completedCount = filteredOrders.filter((o) => o.orderStatus !== "CANCELLED").length;
  const cancelledCount = filteredOrders.filter((o) => o.orderStatus === "CANCELLED").length;

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
        getOrders({ limit: 200 });
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
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            icon={Receipt}
            label="Filtered Orders"
            value={filteredOrders.length}
          />
          <KpiCard
            icon={DollarSign}
            label="Total Revenue"
            value={`${totalRevenue.toLocaleString()} ETB`}
            iconBg="bg-green-500/10"
          />
          <KpiCard
            icon={Wallet}
            label="Tax Collected"
            value={`${totalTax.toLocaleString()} ETB`}
            iconBg="bg-blue-500/10"
          />
          <KpiCard
            icon={ShoppingCart}
            label="Completed"
            value={completedCount}
            iconBg="bg-green-500/10"
          />
          <KpiCard
            icon={XCircle}
            label="Cancelled"
            value={cancelledCount}
            iconBg="bg-red-500/10"
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Transactions</CardTitle>
              <div className="flex gap-2">
                {["all", "completed", "cancelled", "paid", "unpaid"].map((f) => (
                  <Badge
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-60" />
            ) : filteredOrders.length === 0 ? (
              <EmptyState title="No transactions" description="Transactions will appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Order ID</th>
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">Payment</th>
                      <th className="text-right py-2 px-2">Total</th>
                      <th className="text-right py-2 px-2">Tax</th>
                      <th className="text-right py-2 px-2">Date</th>
                      <th className="text-right py-2 px-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.slice(0, 50).map((order) => {
                      const canConfirm = ["UNPAID", "PENDING"].includes(order.paymentStatus);
                      return (
                        <tr key={order._id} className="border-b">
                          <td className="py-2 px-2 font-medium">#{order.orderNumber || order._id?.slice(-6)}</td>
                          <td className="py-2 px-2">
                            <Badge variant={order.orderStatus === "CANCELLED" ? "destructive" : "default"}>
                              {order.orderStatus}
                            </Badge>
                          </td>
                          <td className="py-2 px-2">
                            <Badge variant="outline">{order.paymentStatus}</Badge>
                          </td>
                          <td className="text-right py-2 px-2 font-bold">
                            {(order.total || 0).toLocaleString()} ETB
                          </td>
                          <td className="text-right py-2 px-2">{(order.tax || 0).toLocaleString()}</td>
                          <td className="text-right py-2 px-2 text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                          <td className="text-right py-2 px-2">
                            {canConfirm && (
                              <Button size="sm" onClick={() => handleOpenConfirm(order)} className="bg-green-600 hover:bg-green-700">
                                Confirm
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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

export default OwnerTransactions;
