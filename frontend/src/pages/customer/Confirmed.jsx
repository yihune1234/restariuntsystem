import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCustomerStore } from "@/store/useCustomerStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, ShieldCheck, PackageSearch, Hash, User, MapPin, AlertCircle, Loader2, Star, Send, Lightbulb, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/axios/axiosInstace";
import FeedbackCard from "./FeedbackCard";

const CustomerConfirmed = () => {
  const { branch, orderId } = useParams();
  const navigate = useNavigate();
  const { lastPlacedOrder, fetchOrder } = useCustomerStore();
  const [order, setOrder] = useState(lastPlacedOrder);
  const [loading, setLoading] = useState(!lastPlacedOrder);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (lastPlacedOrder?._id === orderId) {
      setOrder(lastPlacedOrder);
      return;
    }
    (async () => {
      setLoading(true);
      setError(false);
      const res = await fetchOrder(orderId);
      if (res?.success) {
        setOrder(res.order);
      } else {
        setError(true);
      }
      setLoading(false);
    })();
  }, [orderId, fetchOrder, lastPlacedOrder]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-green-200/50 blur-3xl rounded-full" />
            <div className="relative size-24 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Loader2 className="size-10 text-green-500 animate-spin" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-5">
          <div className="size-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="size-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400">
            We couldn't find this order. It may have been cleared from your session.
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

  const tableNumber = order?.tableId?.tableNumber;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Success Hero */}
      <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white px-6 py-12 text-center">
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full" />
          <div className="relative size-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/30">
            <CheckCircle2 className="size-10" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black mb-2">Order Confirmed!</h1>
        <p className="text-white/80 text-sm">Your order has been received by the kitchen</p>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-6 space-y-5">
        {/* Security Code Card */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 text-white border-0 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
          <CardContent className="py-8 px-6 text-center relative">
            <p className="text-xs uppercase tracking-widest text-white/60 mb-3">Your Pickup Code</p>
            <p className="text-6xl sm:text-7xl font-black tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 drop-shadow-lg">
              {order?.securityCode || "—"}
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-white/50">
              <ShieldCheck className="size-3" />
              <span>Show this code when collecting your food</span>
            </div>
          </CardContent>
        </Card>

        {/* Order Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          {order?.orderNumber && (
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardContent className="py-4 px-5">
                <div className="flex items-center gap-2 mb-1">
                  <Hash className="size-3.5 text-amber-500" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Order #</p>
                </div>
                <p className="font-bold text-gray-900 dark:text-white">{order.orderNumber}</p>
              </CardContent>
            </Card>
          )}
          {order?.customerName && (
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardContent className="py-4 px-5">
                <div className="flex items-center gap-2 mb-1">
                  <User className="size-3.5 text-amber-500" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Customer</p>
                </div>
                <p className="font-bold text-gray-900 dark:text-white truncate">{order.customerName}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Table Info */}
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <MapPin className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Table</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {tableNumber ? `Table ${tableNumber}` : "No Table Assigned"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Feedback (Rating / Idea / Complaint) */}
        <FeedbackCard order={order} branchId={order?.branchId?._id || order?.branchId} />

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            className="w-full h-13 text-base font-bold bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white border-0 rounded-2xl shadow-lg shadow-amber-500/30 py-5"
            onClick={() => navigate(`/customer/track/${branch}/${orderId}`)}
          >
            <PackageSearch className="size-5 mr-2" /> Track My Order
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 text-base font-semibold border-2 border-gray-200 dark:border-gray-700 rounded-2xl"
            onClick={() => navigate(`/customer/menu/${branch}`)}
          >
            Order More Items
          </Button>
        </div>

        {/* Helper Text */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You can track your order status in real-time by tapping "Track My Order"
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerConfirmed;
