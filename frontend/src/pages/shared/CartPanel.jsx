import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, ShoppingCart, Loader2, CreditCard, Landmark, Smartphone, Wallet } from "lucide-react";

/**
 * Cart side panel shared by waiter/cashier Create Order pages.
 * For CASHIER: integrates payment method selection + confirmation in one step.
 * For WAITER: just places order (payment handled by cashier).
 */
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
}) => {
  const change = isCashier && paymentMethod === "CASH" && amountReceived
    ? Math.max(0, Number(amountReceived) - total)
    : 0;

  return (
    <div>
      <Card>
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

          <label className="text-xs font-medium block mb-1">Table</label>
          <select
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            className="w-full h-9 rounded-md border bg-transparent px-2 text-sm mb-3"
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

          {isCashier && (
            <div className="space-y-3 mb-3 p-3 rounded-lg bg-muted/30">
              <Label className="text-sm font-medium">Payment Method</Label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { value: "CASH", label: "Cash", icon: Wallet },
                  { value: "CARD", label: "Card", icon: CreditCard },
                  { value: "CHAPA", label: "Chapa", icon: Smartphone },
                  { value: "TELEBIRR", label: "Telebirr", icon: Smartphone },
                  { value: "BANK_TRANSFER", label: "Bank", icon: Landmark },
                ].map((m) => (
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

              {paymentMethod === "CASH" && (
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
                    <div className="mt-1 h-9 rounded-md border bg-background px-3 flex items-center justify-center font-bold text-lg">
                      {change.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between font-bold border-t pt-2 mb-3">
            <span>Subtotal</span>
            <span>{total.toLocaleString()} ETB</span>
          </div>
          <Button 
            className="w-full h-11" 
            onClick={isCashier && handleConfirmPayment ? handleConfirmPayment : handlePlace} 
            disabled={placing || cart.length === 0 || (isCashier && !paymentMethod) || (isCashier && paymentMethod === "CASH" && (!amountReceived || Number(amountReceived) < total))}
          >
            {placing ? <Loader2 className="animate-spin" /> : <ShoppingCart className="size-4" />}
            {isCashier ? "Confirm Payment & Send Order" : "Place Order"}
          </Button>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            Tax & service charges are calculated by the restaurant. Customer shows the 4-digit pickup code to staff.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CartPanel;