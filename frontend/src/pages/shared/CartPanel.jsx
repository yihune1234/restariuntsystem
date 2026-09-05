import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, ShoppingCart, Loader2, CreditCard, Landmark, Smartphone, Wallet, Phone, Users, CheckCircle } from "lucide-react";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash", icon: Wallet },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "TELEBIRR", label: "Telebirr", icon: Smartphone },
  { value: "CHAPA", label: "Chapa", icon: Smartphone },
  { value: "BANK_TRANSFER", label: "Bank", icon: Landmark },
];

export const CartPanel = ({
  cart, addToCart, removeFromCart,
  tableId, setTableId, tables,
  total, placing, handlePlace,
  isCashier = false,
  paymentMethod,
  setPaymentMethod,
  amountReceived,
  setAmountReceived,
  handleConfirmPayment,
  isWalkIn = false,
  setIsWalkIn,
  walkInPhone,
  setWalkInPhone,
}) => {
  const isCash = paymentMethod === "CASH";
  const change = isCash && amountReceived
    ? Math.max(0, Number(amountReceived) - total)
    : 0;

  const canConfirm = cart.length > 0 && (
    isWalkIn ? walkInPhone.trim() : tableId
  ) && (
    isCash ? (amountReceived && Number(amountReceived) >= total) : true
  );

  return (
    <div>
      <Card className="sticky top-4">
        <CardContent className="p-4">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <ShoppingCart className="size-4" /> Current Order
          </h2>

          <div className="space-y-2 mb-4">
            {cart.length === 0 && <p className="text-sm text-muted-foreground">No items added yet.</p>}
            {cart.map((c) => (
              <div key={c.foodItemId} className="flex items-center justify-between gap-2 border-b pb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.foodName}</p>
                  <p className="text-xs text-muted-foreground">
                    {((c.unitPrice || 0) * c.quantity).toLocaleString()} ETB
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon-sm" onClick={() => removeFromCart(c.foodItemId)}>
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">{c.quantity}</span>
                  <Button variant="outline" size="icon-sm" onClick={() => addToCart(c)}>
                    <Plus className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {isCashier && (
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => { setIsWalkIn(false); setWalkInPhone(""); }}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  !isWalkIn
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted border-transparent"
                }`}
              >
                <Users className="size-3" /> Table
              </button>
              <button
                type="button"
                onClick={() => { setIsWalkIn(true); setTableId(""); }}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  isWalkIn
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted border-transparent"
                }`}
              >
                <Phone className="size-3" /> Walk-in
              </button>
            </div>
          )}

          {isWalkIn ? (
            <div className="mb-3">
              <Label className="text-xs font-medium block mb-1">Customer Phone *</Label>
              <Input
                type="tel"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                placeholder="09X XXX XXXX"
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Used as order reference for pickup</p>
            </div>
          ) : (
            <div className="mb-3">
              <Label className="text-xs font-medium block mb-1">Table</Label>
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full h-9 rounded-md border bg-transparent px-2 text-sm"
              >
                <option value="">Select a table...</option>
                {(tables || [])
                  .filter((t) => t.isActive !== false)
                  .map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.tableNumber} ({t.capacity} seats)
                    </option>
                  ))}
              </select>
            </div>
          )}

          {isCashier && (
            <div className="space-y-3 mb-3 p-3 rounded-lg bg-muted/30">
              <Label className="text-sm font-medium">Payment Method</Label>
              <div className="grid grid-cols-5 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={`px-2 py-2 rounded-lg border text-xs text-center transition-all ${
                      paymentMethod === m.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-muted"
                    }`}
                  >
                    <m.icon className="size-3 mx-auto mb-1" />
                    {m.label}
                  </button>
                ))}
              </div>

              {isCash && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-medium">Amount Received (ETB)</Label>
                    <Input
                      type="number"
                      min={total}
                      step="0.01"
                      value={amountReceived || ""}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      className="mt-1"
                      placeholder={`Min ${total.toLocaleString()}`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Change (ETB)</Label>
                    <div className="mt-1 h-9 rounded-md border bg-background px-3 flex items-center justify-center font-bold text-lg text-green-600">
                      {change.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              {!isCash && (
                <div className="p-2 rounded-md bg-green-50 border border-green-200 text-center">
                  <p className="text-xs text-green-700">
                    <CheckCircle className="size-3 inline mr-1" />
                    Payment will be recorded as {paymentMethod}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-2 mb-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">{total.toLocaleString()} ETB</span>
            </div>
          </div>

          <Button
            className="w-full h-11"
            onClick={isCashier && handleConfirmPayment ? handleConfirmPayment : handlePlace}
            disabled={placing || !canConfirm}
          >
            {placing ? (
              <><Loader2 className="animate-spin" /> Processing...</>
            ) : isCashier ? (
              <><CheckCircle className="size-4 mr-2" /> Confirm Payment & Send to Kitchen</>
            ) : (
              <><ShoppingCart className="size-4 mr-2" /> Place Order</>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            {isWalkIn
              ? "Order goes directly to kitchen. Customer shows pickup code."
              : "Tax & service charges are calculated by the restaurant."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CartPanel;
