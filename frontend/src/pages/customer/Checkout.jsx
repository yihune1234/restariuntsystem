import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCustomerStore } from "@/store/useCustomerStore";
import { usePaymentStore } from "@/store/usePaymentStore";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft, Lock, ShieldCheck, Coffee, CheckCircle, Smartphone,
  Wallet, CreditCard, User, WifiOff, Loader2, AlertCircle, MessageSquare, Lightbulb,
} from "lucide-react";

const CustomerCheckout = () => {
  const { branch } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { cart, getCartTotal, placeOrder, session, customerName, setCustomerName, customerNote, setCustomerNote } = useCustomerStore();
  const { initiateChapa } = usePaymentStore();
  const [placing, setPlacing] = useState(false);
  const [payingOnline, setPayingOnline] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("counter");
  const [name, setName] = useState(customerName || "");
  const placingRef = useRef(false);
  const [connectionError, setConnectionError] = useState(null);

  const total = getCartTotal();
  const tableNumber = session?.table?.tableNumber;
  const hasTable = !!tableNumber;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    if (placingRef.current) return;
    placingRef.current = true;
    setPlacing(true);
    setConnectionError(null);

    setCustomerName(name.trim() || null);

    let res;
    try {
      res = await placeOrder();
    } catch (err) {
      setConnectionError("Unable to connect. Please check your internet and try again.");
      placingRef.current = false;
      setPlacing(false);
      return;
    }

    placingRef.current = false;
    setPlacing(false);

    if (!res?.success) {
      if (res?.message === "no_session") {
        toast.error("Session expired. Please scan the QR code again.");
      } else if (res?.message === "empty_cart") {
        toast.error("Your cart is empty.");
      } else {
        toast.error(res?.message || "Failed to place order. Please try again.");
      }
      return;
    }

    const orderId = res.order?._id;
    if (!orderId) {
      toast.error("Order placement failed. Please try again.");
      return;
    }

    if (paymentMethod === "chapa") {
      setPayingOnline(true);
      try {
        const paymentRes = await initiateChapa(orderId, {
          email: `customer-${orderId.slice(-6)}@restaurant.local`,
          firstName: name || "Customer",
        });
        if (paymentRes.success && paymentRes.data?.checkoutUrl) {
          window.location.href = paymentRes.data.checkoutUrl;
          return;
        } else {
          toast.error(paymentRes.message || "Failed to initiate payment");
        }
      } catch (err) {
        toast.error(err.message || "Payment initiation failed");
      } finally {
        setPayingOnline(false);
      }
    } else {
      navigate(`/customer/track/${branch}/${orderId}`);
    }
  };

  const isSubmitting = placing || payingOnline;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-32">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/customer/cart/${branch}`)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              <ArrowLeft className="size-4" /> Back to Cart
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Checkout</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Connection Error Banner */}
        {connectionError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
            <WifiOff className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Connection Problem</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{connectionError}</p>
            </div>
          </div>
        )}

        {/* Order Summary Card */}
        <Card className="border-2 border-amber-200 dark:border-amber-800 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Coffee className="size-5" /> Your Order
            </h2>
          </div>
          <CardContent className="p-0">
            {/* Items */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {cart.map((c) => (
                <div key={c.foodItemId} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-amber-600 dark:text-amber-400 font-bold">{c.quantity}×</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{c.foodName}</p>
                      <p className="text-sm text-gray-500">{c.unitPrice?.toLocaleString()} ETB each</p>
                    </div>
                  </div>
                  <p className="font-bold text-amber-600 dark:text-amber-400 ml-4">
                    {(c.unitPrice * c.quantity).toLocaleString()} ETB
                  </p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="bg-amber-50 dark:bg-amber-900/20 px-6 py-5">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total</span>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {total.toLocaleString()} ETB
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Tax & service charges are calculated by the restaurant and shown on your receipt.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Table & Customer Info */}
        <Card className="border-2 border-amber-200 dark:border-amber-800 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <User className="size-5" /> Your Details
            </h2>
          </div>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Your Name (optional)
              </label>
              <Input
                placeholder="Enter your name for the order"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">T</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Table</p>
                  <p className="text-xs text-gray-500">Your table number</p>
                </div>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {hasTable ? `Table ${tableNumber}` : "No Table"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Customer Note / Special Request */}
        <Card className="border-2 border-amber-200 dark:border-amber-800 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <MessageSquare className="size-5" /> Customer Note / Special Request
            </h2>
          </div>
          <CardContent className="p-6 space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
              Anything we should know? (optional)
            </label>
            <textarea
              placeholder={'e.g. "Please make it less spicy.", "No onions.", "Extra sauce."'}
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={3}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Lightbulb className="size-3" /> Visible to chef, waiter, manager and owner.
              </span>
              <span className="tabular-nums">{customerNote.length}/500</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selection */}
        <Card className="border-2 border-amber-200 dark:border-amber-800 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <CreditCard className="size-5" /> Payment Method
            </h2>
          </div>
          <CardContent className="p-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("counter")}
                disabled={isSubmitting}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  paymentMethod === "counter"
                    ? "bg-amber-500 border-amber-500 text-white shadow-lg"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 disabled:opacity-50"
                }`}
              >
                <Wallet className="size-7 mx-auto mb-2" />
                <p className="font-semibold text-sm">Pay at Counter</p>
                <p className="text-xs mt-1 opacity-70">Cash or Card when ready</p>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("chapa")}
                disabled={isSubmitting}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  paymentMethod === "chapa"
                    ? "bg-green-500 border-green-500 text-white shadow-lg"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 disabled:opacity-50"
                }`}
              >
                <Smartphone className="size-7 mx-auto mb-2" />
                <p className="font-semibold text-sm">Pay Online</p>
                <p className="text-xs mt-1 opacity-70">Secure payment via Chapa</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Notice */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-start gap-3">
          <ShieldCheck className="size-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800 dark:text-green-300">
            No account or password needed. You'll receive a 4-digit pickup code after ordering.
          </p>
        </div>
      </main>

      {/* Sticky Footer with Place Order Button */}
      <div className="fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-2xl">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <Button
            className="w-full h-14 text-base font-bold bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white border-0 rounded-2xl shadow-xl shadow-amber-500/30 disabled:opacity-60"
            onClick={handlePlaceOrder}
            disabled={isSubmitting || cart.length === 0}
          >
            {placing ? (
              <>
                <Loader2 className="size-5 mr-2 animate-spin" /> Placing Order...
              </>
            ) : payingOnline ? (
              <>
                <Loader2 className="size-5 mr-2 animate-spin" /> Redirecting to Payment...
              </>
            ) : paymentMethod === "chapa" ? (
              <>
                <CheckCircle className="size-5 mr-2" /> Pay {total.toLocaleString()} ETB Online
              </>
            ) : (
              <>
                <CheckCircle className="size-5 mr-2" /> Place Order — {total.toLocaleString()} ETB
              </>
            )}
          </Button>
          {isSubmitting && (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
              Please wait — do not close this page
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerCheckout;
