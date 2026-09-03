import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCustomerStore } from "@/store/useCustomerStore";
import { getSocket, connectSocket, trackOrder } from "@/config/socket.config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axiosInstance from "@/axios/axiosInstace";
import {
  ArrowLeft, CheckCircle2, ChefHat, Truck, ShieldCheck,
  CreditCard, Star, ThumbsUp, WifiOff, RefreshCw, AlertTriangle, KeyRound,
} from "lucide-react";

const STATUS_STEPS = [
  { key: "WAITING_FOR_PAYMENT", label: "Received", icon: CheckCircle2, color: "amber" },
  { key: "CONFIRMED", label: "Confirmed", icon: CheckCircle2, color: "green" },
  { key: "PREPARING", label: "Preparing", icon: ChefHat, color: "blue" },
  { key: "READY", label: "Ready", icon: Truck, color: "purple" },
  { key: "COMPLETED", label: "Completed", icon: CheckCircle2, color: "green" },
];

const PAYMENT_STATUS_STEPS = [
  { key: "UNPAID", label: "Unpaid" },
  { key: "PENDING", label: "Processing" },
  { key: "PAID", label: "Paid" },
  { key: "FAILED", label: "Failed" },
  { key: "REFUNDED", label: "Refunded" },
  { key: "CANCELLED", label: "Cancelled" },
];

/** C3: fallback — recover an order by its 4-digit pickup code when the tracking link is lost */
const TrackByCode = ({ initialCode = "", branch, onFound }) => {
  const navigate = useNavigate();
  const { findOrderByCode } = useCustomerStore();
  const [code, setCode] = useState(initialCode);
  const [looking, setLooking] = useState(false);

  const lookup = async () => {
    const c = code.trim();
    if (!/^\d{4}$/.test(c)) return toast.error("Enter the 4-digit pickup code");
    setLooking(true);
    const res = await findOrderByCode(c);
    setLooking(false);
    if (res.success && res.order) {
      onFound(res.order);
    } else {
      toast.error(res.message || "No order found with that code");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
      <div className="text-center space-y-5 max-w-sm w-full">
        <div className="size-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <KeyRound className="size-10 text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Track by Pickup Code</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Lost your tracking link? Enter the 4-digit code you received after checkout.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            maxLength={4}
            placeholder="0000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            className="h-12 font-mono text-2xl tracking-[0.5em] text-center"
          />
          <Button
            onClick={lookup}
            disabled={looking || code.length !== 4}
            className="bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 px-6"
          >
            {looking ? <RefreshCw className="size-4 animate-spin" /> : "Find"}
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={() => navigate(`/customer/menu/${branch || ""}`.replace(/\/$/, ""))}
        >
          Back to Menu
        </Button>
      </div>
    </div>
  );
};

const CustomerTrack = () => {
  const params = useParams();
  const branch = params.branch;
  const orderId = params.orderId || params.trackingToken || null;
  const routeCode = params.code || null;
  const navigate = useNavigate();
  const { fetchOrder, findOrderByCode } = useCustomerStore();
  const [codeMode, setCodeMode] = useState(Boolean(routeCode));

  /** C3: pickup-code resolved -> swap URL to the canonical track route */
  const handleCodeFound = (foundOrder) => {
    if (foundOrder?._id) {
      setCodeMode(false);
      trackOrder(foundOrder._id);
      navigate(`/customer/track/${foundOrder.branchId}/${foundOrder._id}`, { replace: true });
    } else {
      setCodeMode(false);
    }
  };
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 5, foodRating: 5, serviceRating: 5, feedbackText: "" });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connected");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetchOrder(orderId);
      if (res?.success) {
        setOrder(res.order);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    };
    load();

    // Ensure the socket is connected so we get real-time order updates.
    // If the customer opened this URL directly (refresh, shared link) the
    // socket may not be connected yet — connectSocket() is idempotent.
    connectSocket();
    const socket = getSocket();

    const subscribeAndTrack = () => {
      setConnectionStatus("connected");
      // Join the order tracking room. Server validates that this session
      // owns the order before joining.
      trackOrder(orderId);
    };

    if (socket?.connected) {
      subscribeAndTrack();
    } else {
      socket?.once("connect", subscribeAndTrack);
    }
    socket?.on("disconnect", () => setConnectionStatus("disconnected"));
    socket?.on("connect_error", () => setConnectionStatus("error"));

    const onUpdate = (payload) => {
      if (!payload) return;
      // Backend emits `{ orderId, orderStatus, ... }` directly.
      // The Track page may also receive the full order object. Normalize:
      const updated = payload?.order || payload;
      const matchesId = updated?._id === orderId || updated?.orderId === orderId;
      if (!matchesId) return;
      setOrder((prev) => ({
        ...(prev || {}),
        _id: updated._id || prev?._id || orderId,
        orderStatus: updated.orderStatus || prev?.orderStatus,
        paymentStatus: updated.paymentStatus || prev?.paymentStatus,
        orderNumber: updated.orderNumber || prev?.orderNumber,
        items: updated.items || prev?.items,
        total: updated.total || prev?.total,
        confirmedAt: updated.confirmedAt || prev?.confirmedAt,
        preparedAt: updated.preparedAt || prev?.preparedAt,
        readyAt: updated.readyAt || prev?.readyAt,
        deliveredAt: updated.deliveredAt || prev?.deliveredAt,
        pickupCode: updated.pickupCode || prev?.pickupCode,
        statusHistory: updated.statusHistory || prev?.statusHistory,
      }));
    };

    socket?.on("order:confirmed", onUpdate);
    socket?.on("order:preparing", onUpdate);
    socket?.on("order:ready", onUpdate);
    socket?.on("order:taken", onUpdate);
    socket?.on("order:delivered", onUpdate);
    socket?.on("order:cancelled", onUpdate);

    return () => {
      socket?.off("connect", subscribeAndTrack);
      socket?.off("disconnect");
      socket?.off("connect_error");
      socket?.off("order:confirmed", onUpdate);
      socket?.off("order:preparing", onUpdate);
      socket?.off("order:ready", onUpdate);
      socket?.off("order:taken", onUpdate);
      socket?.off("order:delivered", onUpdate);
      socket?.off("order:cancelled", onUpdate);
    };
  }, [orderId, fetchOrder, codeMode]);

  const handleSubmitFeedback = async () => {
    setSubmittingFeedback(true);
    try {
      await axiosInstance.post("/feedback", {
        orderId: order._id,
        organizationId: order.organizationId,
        branchId: order.branchId,
        overallRating: feedback.rating,
        foodRating: feedback.foodRating,
        serviceRating: feedback.serviceRating,
        feedbackText: feedback.feedbackText,
        source: "QR_CODE",
      });
      toast.success("Thank you for your feedback!");
      setShowFeedback(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const renderStarRating = (label, field) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setFeedback({ ...feedback, [field]: star })}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={`size-7 ${star <= feedback[field] ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  /* C3: code-entry fallback (reached via /customer/track/code/:code with no order id) */
  if (codeMode && !order) {
    return <TrackByCode branch={branch} onFound={handleCodeFound} />;
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
        <div className="text-center space-y-5 max-w-sm">
          <div className="size-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="size-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400">
            We couldn't find this order. Please check your tracking link or go back to the menu.
          </p>
          <Button
            className="bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600"
            onClick={() => navigate(`/customer/menu/${branch}`)}
          >
            Back to Menu
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-md mx-auto space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const currentStatusIndex = STATUS_STEPS.findIndex((s) => s.key === order?.orderStatus);
  const paymentStatusIndex = PAYMENT_STATUS_STEPS.findIndex((s) => s.key === order?.paymentStatus);
  const isFailed = order?.paymentStatus === "FAILED" || order?.orderStatus === "CANCELLED";
  const isConnected = connectionStatus === "connected";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-32">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/customer/menu/${branch}`)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              <ArrowLeft className="size-4" /> Menu
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Order #{order?.orderNumber || order?._id?.slice(-6)}
            </h1>
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <div className="w-2 h-2 rounded-full bg-green-500" />
              ) : (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <WifiOff className="size-3" /> Offline
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Order Status Progress */}
        <Card className="border-2 border-amber-200 dark:border-amber-800 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <ChefHat className="size-5" /> Order Status
            </h2>
          </div>
          <CardContent className="p-6">
            {/* Status Steps */}
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((step, i) => {
                const done = i < currentStatusIndex;
                const active = i === currentStatusIndex;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1">
                    <div
                      className={`size-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                        done
                          ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                          : active
                          ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30 ring-4 ring-amber-200"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                      }`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <span
                      className={`text-[10px] text-center leading-tight font-medium ${
                        done || active ? "text-gray-900 dark:text-white" : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </span>
                    {i < STATUS_STEPS.length - 1 && (
                      <div
                        className={`absolute h-1 w-full -z-10 ${
                          done ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                        }`}
                        style={{ display: "none" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Active Status Label */}
            <div className="mt-5 text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Status</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 capitalize mt-1">
                {order?.orderStatus?.toLowerCase().replace(/_/g, " ") || "—"}
              </p>
              {isFailed && (
                <div className="flex items-center justify-center gap-2 mt-2 text-red-500">
                  <AlertTriangle className="size-4" />
                  <span className="text-sm font-medium">
                    {order?.orderStatus === "CANCELLED" ? "Order Cancelled" : "Payment Failed"}
                  </span>
                </div>
              )}
              {order && ["CONFIRMED", "PREPARING"].includes(order.orderStatus) && (new Date().getTime() - new Date(order.createdAt).getTime() > 25 * 60000) && (
                <div className="flex items-center justify-center gap-2 mt-3 text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 p-2 rounded-lg border border-amber-200 dark:border-amber-800/50">
                  <Clock className="size-4 flex-shrink-0 animate-pulse" />
                  <span className="text-sm font-medium">
                    Slightly delayed. We're working on it!
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="border-2 border-amber-200 dark:border-amber-800 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <ChefHat className="size-5" /> Order Items
            </h2>
            <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs font-bold">
              {order?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0} items
            </span>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {order?.items?.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between px-6 py-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">{item.quantity}×</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{item.foodName}</p>
                      {item.notes && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 inline-block mt-1">
                          {"\u26a0"} {item.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="font-semibold text-amber-600 dark:text-amber-400 ml-4 flex-shrink-0">
                    {(item.unitPrice * item.quantity).toLocaleString()} ETB
                  </p>
                </div>
              ))}
            </div>
            {order?.customerNote && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Customer Note</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{order.customerNote}"</p>
              </div>
            )}
            <div className="bg-amber-50 dark:bg-amber-900/20 px-6 py-4 flex justify-between items-center border-t border-amber-100 dark:border-amber-800/50">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Total</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {order?.total?.toLocaleString() || "—"} ETB
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Security Code */}
        <Card className="border-2 border-amber-200 dark:border-amber-800 shadow-lg">
          <CardContent className="py-6 px-6 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Pickup Code</p>
            <p className="text-4xl font-black tracking-[0.2em] text-amber-600 dark:text-amber-400">
              {order?.securityCode || "—"}
            </p>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card className="border-2 border-amber-200 dark:border-amber-800 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <CreditCard className="size-5" /> Payment
            </h2>
          </div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {PAYMENT_STATUS_STEPS.map((step, i) => {
                const done = i <= paymentStatusIndex;
                const isCurrent = i === paymentStatusIndex;
                const isFailedStep = ["FAILED", "CANCELLED"].includes(step.key) && order?.paymentStatus === step.key;
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1">
                    <div
                      className={`size-8 rounded-full flex items-center justify-center mb-1.5 ${
                        done
                          ? isFailedStep
                            ? "bg-red-500 text-white"
                            : "bg-green-500 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                      }`}
                    >
                      {isFailedStep ? <AlertTriangle className="size-4" /> : <ShieldCheck className="size-4" />}
                    </div>
                    <span
                      className={`text-[9px] text-center leading-tight font-medium ${
                        done ? "text-gray-900 dark:text-white" : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Payment Method</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {order?.paymentMethod || "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed - Leave Feedback CTA */}
        {order?.orderStatus === "COMPLETED" && !showFeedback && (
          <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardContent className="py-6 px-6">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <ThumbsUp className="size-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">Order Completed!</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">How was your experience?</p>
                </div>
                <Button
                  onClick={() => setShowFeedback(true)}
                  className="bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white"
                >
                  Leave Feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback Form */}
        {showFeedback && (
          <Card className="border-2 border-amber-200 dark:border-amber-800 shadow-lg">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <h2 className="text-white font-bold text-lg">Share Your Feedback</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              {renderStarRating("Overall Experience", "rating")}
              {renderStarRating("Food Quality", "foodRating")}
              {renderStarRating("Service", "serviceRating")}

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Additional Comments (optional)
                </Label>
                <Textarea
                  placeholder="Tell us more about your experience..."
                  value={feedback.feedbackText}
                  onChange={(e) => setFeedback({ ...feedback, feedbackText: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowFeedback(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={submittingFeedback}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white"
                >
                  {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CustomerTrack;
