import React, { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrderStore } from "@/store/useOrderStore";
import { usePaymentStore, PAYMENT_METHODS } from "@/store/usePaymentStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ShieldCheck, CheckCircle2, Loader2, Wallet, CreditCard, Smartphone,
  Landmark, AlertTriangle, ChevronDown, Search, X, RefreshCw,
  Eye, Printer, FileText, Clock, Check, KeyRound,
} from "lucide-react";

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash", icon: Wallet },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "CHAPA", label: "Chapa", icon: Smartphone },
  { value: "TELEBIRR", label: "Telebirr", icon: Smartphone },
  { value: "BANK_TRANSFER", label: "Bank", icon: Landmark },
];

const PAYMENT_STATUS_FILTERS = [
  { key: "ALL", label: "All Orders" },
  { key: "UNPAID", label: "Unpaid" },
  { key: "PENDING", label: "Pending" },
  { key: "PAID", label: "Paid" },
  { key: "REFUNDED", label: "Refunded" },
  { key: "FAILED", label: "Failed" },
  { key: "CANCELLED", label: "Cancelled" },
];

const StatusFilterTabs = ({ active, counts, onChange }) => (
  <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
    {PAYMENT_STATUS_FILTERS.map((f) => {
      const count = f.key === "ALL" ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[f.key] || 0);
      return (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            active === f.key
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-amber-300"
          }`}
        >
          {f.label}
          {count > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              active === f.key ? "bg-white/20" : "bg-gray-100 dark:bg-gray-700"
            }`}>
              {count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export const CashierPayments = () => {
  const { authUser } = useAuthStore();
  const { orders, getOrders, isLoading, setupSocketListeners, cleanupSocketListeners, getOrderById, cancelOrder } = useOrderStore();
  const { confirmCashierPayment, isLoading: paymentLoading } = usePaymentStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("PAID");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [paymentMethods, setPaymentMethods] = useState({});
  const [amountReceivedValues, setAmountReceivedValues] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [isRefunding, setIsRefunding] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const loadOrders = useCallback(async () => {
    await getOrders({ limit: 100 });
  }, [getOrders]);

  useEffect(() => {
    loadOrders();
    setupSocketListeners();
    return cleanupSocketListeners;
  }, [loadOrders, setupSocketListeners, cleanupSocketListeners]);

  /* C1: pickup-code lookup — jump straight to the order a customer is paying for */
  const [pickupCode, setPickupCode] = useState("");
  const [codeLookup, setCodeLookup] = useState(false);
  const { findBySecurityCode } = usePaymentStore();

  const handlePickupCodeLookup = useCallback(async () => {
    const code = pickupCode.trim();
    if (!/^\d{4}$/.test(code)) {
      toast.error("Enter the 4-digit pickup code");
      return;
    }
    setCodeLookup(true);
    try {
      const res = await findBySecurityCode(code);
      if (res.success && res.order) {
        setStatusFilter("ALL"); // match may already be paid or in another state
        setSearchQuery(code); // isolate the matching order(s) in the list
        setExpandedOrderId(res.order._id);
        toast.success(`Order #${res.order.orderNumber || res.order._id?.slice(-4)} found`);
      }
    } finally {
      setCodeLookup(false);
    }
  }, [pickupCode, findBySecurityCode]);

  const filteredOrders = orders.filter((o) => {
    if (o.placedBy?.toString() !== authUser?._id?.toString()) return false;
    const orderDate = new Date(o.createdAt);
    orderDate.setHours(0, 0, 0, 0);
    if (orderDate.getTime() !== today.getTime()) return false;
    if (statusFilter !== "ALL" && o.paymentStatus !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNumber = (o.orderNumber || o._id || "").toLowerCase().includes(q);
      const matchTable = o.tableId?.tableNumber?.toString().includes(q);
      const matchCustomer = (o.customerName || "").toLowerCase().includes(q);
      if (!matchNumber && !matchTable && !matchCustomer) return false;
    }
    return true;
  });

  const statusCounts = filteredOrders.reduce((acc, o) => {
    acc[o.paymentStatus] = (acc[o.paymentStatus] || 0) + 1;
    return acc;
  }, {});

  const getChange = (orderId) => {
    const amount = amountReceivedValues[orderId];
    const order = orders.find((o) => o._id === orderId);
    if (!amount || !order) return 0;
    return Math.max(0, Number(amount) - order.total);
  };

  const handleConfirmPayment = async (order) => {
    const method = paymentMethods[order._id] || "CASH";
    const amount = amountReceivedValues[order._id];

    if (!method) return toast.error("Select a payment method");
    if (method === "CASH" && (!amount || Number(amount) < order.total)) {
      return toast.error("Enter valid amount received");
    }

    setProcessingId(order._id);
    try {
      const res = await confirmCashierPayment(order._id, { paymentMethod: method });
      if (res.success) {
        toast.success(`Order #${order.orderNumber || order._id?.slice(-6)} confirmed`);
        setExpandedOrderId(null);
        setPaymentMethods((prev) => { const n = { ...prev }; delete n[order._id]; return n; });
        setAmountReceivedValues((prev) => { const n = { ...prev }; delete n[order._id]; return n; });
        loadOrders();
      } else {
        toast.error(res.message || "Payment failed");
      }
    } catch (err) {
      toast.error(err.message || "Failed to confirm payment");
    } finally {
      setProcessingId(null);
    }
  };

  const openBillDialog = async (order) => {
    const fullOrder = await getOrderById(order._id);
    setSelectedOrder(fullOrder || order);
    setShowBillDialog(true);
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Dashboard</h1>
          <p className="text-sm text-gray-500">Process customer payments and manage orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadOrders} disabled={isLoading}>
          <RefreshCw className={`size-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Pickup Code Lookup (customer hands their 4-digit code to the cashier) */}
      <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
        <CardContent className="p-4">
          <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
            <KeyRound className="size-4 text-amber-600" /> Look up by pickup code
          </Label>
          <div className="flex gap-2 max-w-md">
            <Input
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={pickupCode}
              onChange={(e) => setPickupCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handlePickupCodeLookup()}
              className="h-10 font-mono text-lg tracking-[0.4em] text-center"
            />
            <Button
              onClick={handlePickupCodeLookup}
              disabled={codeLookup || pickupCode.length !== 4}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {codeLookup ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4 mr-1" />}
              Find
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="Search by order #, table, or customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <StatusFilterTabs active={statusFilter} counts={statusCounts} onChange={setStatusFilter} />

      {/* Orders List */}
      {isLoading && orders.length === 0 ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="size-16 mx-auto rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4">
              <AlertTriangle className="size-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No orders found</h3>
            <p className="text-sm text-gray-500">
              {searchQuery || statusFilter !== "UNPAID"
                ? "Try adjusting your search or filter"
                : "All orders have been processed"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order._id;
            const isProcessing = processingId === order._id;
            const method = paymentMethods[order._id] || "CASH";
            const amount = amountReceivedValues[order._id] || "";
            const change = getChange(order._id);
            const isPaid = order.paymentStatus === "PAID";
            const isRefundable = order.paymentStatus === "PAID";

            return (
              <Card
                key={order._id}
                className={`overflow-hidden transition-all ${
                  isExpanded ? "border-amber-300 dark:border-amber-700 shadow-lg" : ""
                } ${isPaid ? "opacity-75" : ""}`}
              >
                <CardContent className="p-0">
                  {/* Order Header - Always Visible */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    onClick={() => toggleExpand(order._id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <ChevronDown className={`size-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      <div className="size-11 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          #{order.orderNumber || order._id?.slice(-4)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {order.tableId ? `Table ${order.tableId.tableNumber}` : "No Table"}
                          </p>
                          <Badge className="text-[10px] px-1.5 py-0" variant="outline">{order.source}</Badge>
                          {isPaid && (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-[10px] px-1.5 py-0">
                              <Check className="size-2.5 mr-0.5" /> Paid
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {order.customerName || "Guest"} • {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="hidden sm:block text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {(order.total || 0).toLocaleString()} ETB
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge className={`font-mono text-xs ${order.paymentStatus === "PAID" ? "bg-green-500" : order.paymentStatus === "UNPAID" ? "bg-amber-500" : order.paymentStatus === "PENDING" ? "bg-blue-500" : "bg-gray-500"} text-white`}>
                        {order.paymentStatus}
                      </Badge>
                    </div>
                  </div>

                  {/* Quick Actions Bar */}
                  <div className="flex items-center gap-2 px-4 pb-3 border-t border-gray-100 dark:border-gray-800 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => openBillDialog(order)}>
                      <Eye className="size-4 mr-1" /> View Bill
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => window.print()}>
                      <Printer className="size-4 mr-1" /> Print
                    </Button>
                    {isRefundable && (
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => { setSelectedOrder(order); setShowRefundDialog(true); }}>
                        <RefreshCw className="size-4 mr-1" /> Refund
                      </Button>
                    )}
                  </div>

                  {/* Expandable Payment Section */}
                  <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? "max-h-[500px]" : "max-h-0"}`}>
                    <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900/50 space-y-4">
                      {/* Order Items Summary */}
                      <div className="space-y-1.5">
                        {order.items?.map((it, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">{it.foodNameSnapshot} × {it.quantity}</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {((it.unitPriceSnapshot || 0) * it.quantity).toLocaleString()} ETB
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold border-t pt-2 mt-2 text-gray-900 dark:text-white">
                          <span>Total</span>
                          <span>{(order.total || 0).toLocaleString()} ETB</span>
                        </div>
                      </div>

                      {/* Payment Method Selection */}
                      {!isPaid && (
                        <>
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Payment Method</Label>
                            <div className="grid grid-cols-5 gap-2">
                              {PAYMENT_METHOD_OPTIONS.map((m) => (
                                <button
                                  key={m.value}
                                  type="button"
                                  onClick={() => setPaymentMethods((prev) => ({ ...prev, [order._id]: m.value }))}
                                  className={`p-2.5 rounded-xl border text-center transition-all ${
                                    method === m.value
                                      ? "bg-amber-500 border-amber-500 text-white shadow-lg"
                                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-300"
                                  }`}
                                >
                                  <m.icon className="size-4 mx-auto mb-0.5" />
                                  <span className="text-[10px] font-medium">{m.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Cash: Amount Received + Change */}
                          {method === "CASH" && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs font-medium mb-1 block">Amount Received (ETB)</Label>
                                <Input
                                  type="number"
                                  min={order.total}
                                  step="0.01"
                                  value={amount}
                                  onChange={(e) => setAmountReceivedValues((prev) => ({ ...prev, [order._id]: e.target.value }))}
                                  className="h-10"
                                  placeholder={`Min ${order.total.toLocaleString()}`}
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium mb-1 block">Change (ETB)</Label>
                                <div className="h-10 rounded-lg border bg-white dark:bg-gray-800 px-3 flex items-center justify-center font-bold text-lg text-green-600 dark:text-green-400">
                                  {change.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          )}

                          <Button
                            onClick={() => handleConfirmPayment(order)}
                            disabled={isProcessing || !method || (method === "CASH" && (!amount || Number(amount) < order.total))}
                            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600"
                          >
                            {isProcessing ? (
                              <><Loader2 className="animate-spin mr-2" /> Processing...</>
                            ) : (
                              <><CheckCircle2 className="size-5 mr-2" /> Confirm Payment</>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bill Dialog */}
      <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5" /> Order Bill
            </DialogTitle>
            <DialogDescription>Review the order details</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-semibold">#{selectedOrder.orderNumber || selectedOrder._id?.slice(-6)}</p>
                  <p className="text-xs text-gray-500">
                    {selectedOrder.tableId ? `Table ${selectedOrder.tableId.tableNumber}` : "No Table"} • {selectedOrder.customerName || "Guest"}
                  </p>
                </div>
                <Badge className={selectedOrder.paymentStatus === "PAID" ? "bg-green-500" : "bg-amber-500"}>
                  {selectedOrder.paymentStatus}
                </Badge>
              </div>
              <div className="space-y-2">
                {selectedOrder.items?.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{it.foodNameSnapshot} × {it.quantity}</span>
                    <span className="font-medium">{((it.unitPriceSnapshot || 0) * it.quantity).toLocaleString()} ETB</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{(selectedOrder.total || 0).toLocaleString()} ETB</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                  <Printer className="size-4 mr-2" /> Print
                </Button>
                <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={() => setShowBillDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <RefreshCw className="size-5" /> Process Refund
            </DialogTitle>
            <DialogDescription>
              Refund order #{selectedOrder?.orderNumber || selectedOrder?._id?.slice(-6)} for {(selectedOrder?.total || 0).toLocaleString()} ETB
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for refund (required)</Label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter reason for refund..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRefundDialog(false); setRefundReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!refundReason.trim() || isRefunding}
              onClick={async () => {
                /**
                 * Real refund path: POST /orders/:id/cancel (OWNER/MANAGER/CASHIER).
                 * The backend transactionally restores inventory stock for paid
                 * orders and flips paymentStatus to REFUNDED before cancelling.
                 */
                setIsRefunding(true);
                try {
                  const res = await cancelOrder(selectedOrder._id, refundReason.trim());
                  if (res.success) {
                    toast.success(`Order #${selectedOrder.orderNumber || selectedOrder._id?.slice(-6)} refunded and cancelled`);
                    setShowRefundDialog(false);
                    setRefundReason("");
                    setSelectedOrder(null);
                    loadOrders();
                  } else {
                    toast.error(res.message || "Refund failed");
                  }
                } catch (err) {
                  toast.error(err?.message || "Refund failed");
                } finally {
                  setIsRefunding(false);
                }
              }}
            >
              {isRefunding ? <Loader2 className="size-4 mr-1 animate-spin" /> : <RefreshCw className="size-4 mr-1" />}
              {isRefunding ? "Processing..." : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
