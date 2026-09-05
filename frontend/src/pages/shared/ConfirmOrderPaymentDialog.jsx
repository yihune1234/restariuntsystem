import { useState } from "react";
import { toast } from "sonner";
import { usePaymentStore } from "@/store/usePaymentStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
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

const ConfirmOrderPaymentDialog = ({ order, open, onClose, onConfirmed }) => {
  const { confirmCashierPayment, isLoading } = usePaymentStore();
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountReceived, setAmountReceived] = useState("");

  const total = order?.total || 0;
  const change =
    paymentMethod === "CASH" && amountReceived
      ? Math.max(0, Number(amountReceived) - total)
      : 0;

  const handleConfirm = async () => {
    if (!order) return;
    if (paymentMethod === "CASH" && (!amountReceived || Number(amountReceived) < total)) {
      toast.error("Enter valid amount received");
      return;
    }
    const res = await confirmCashierPayment(order._id, { paymentMethod });
    if (res.success) {
      toast.success(`Payment confirmed for order #${order.orderNumber || order._id?.slice(-6)}`);
      onClose();
      if (onConfirmed) onConfirmed();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Payment</DialogTitle>
        </DialogHeader>
        {order && (
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-semibold">Order #{order.orderNumber || order._id?.slice(-6)}</p>
              <p className="text-sm text-muted-foreground">
                Table {order.tableId?.tableNumber || "—"} • {order.items?.length || 0} items
              </p>
              <p className="text-xl font-bold mt-2">{total.toLocaleString()} ETB</p>
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
                    min={total}
                    step="0.01"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="mt-1"
                    placeholder={`Min ${total.toLocaleString()}`}
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle className="size-4 mr-2" />}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmOrderPaymentDialog;