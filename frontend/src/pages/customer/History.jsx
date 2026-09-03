import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCustomerStore } from "@/store/useCustomerStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock } from "lucide-react";

/**
 * Public customer order history. Reads the order record (now via the
 * unified /orders/:id endpoint with x-session-token auth) and shows the
 * itemized bill + timeline of status transitions.
 * URL: /customer/history/:branch/:orderId
 */
const CustomerHistory = () => {
  const { branch, orderId } = useParams();
  const navigate = useNavigate();
  const { fetchOrder } = useCustomerStore();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetchOrder(orderId);
      if (res?.success) setOrder(res.order);
      setLoading(false);
    })();
  }, [orderId, fetchOrder]);

  if (loading) return <div className="min-h-screen bg-background p-6"><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate(`/customer/track/${branch}/${orderId}`)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ArrowLeft className="size-4" /> Back
        </button>

        <h1 className="text-2xl font-bold mb-2">Order History</h1>
        {!order ? (
          <p className="text-muted-foreground">Order not found.</p>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold">#{order.orderNumber || order._id?.slice(-6)}</span>
                  <Badge>{order.orderStatus?.toLowerCase().replace(/_/g, " ")}</Badge>
                </div>
                <div className="space-y-1 text-sm">
                  {order.items?.map((it, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{it.foodNameSnapshot} × {it.quantity}</span>
                      <span>{((it.unitPriceSnapshot || 0) * it.quantity).toLocaleString()} ETB</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span>Subtotal</span>
                  <span>{order.subtotal?.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>{order.tax?.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Service</span>
                  <span>{order.serviceCharge?.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between font-bold border-t mt-3 pt-2">
                  <span>Total</span>
                  <span>{order.total?.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Payment</span>
                  <span className="capitalize">{order.paymentStatus?.toLowerCase()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="size-4" /> Timeline
                </h2>
                <div className="space-y-1 text-sm">
                  {order.confirmedAt && (
                    <div className="flex justify-between">
                      <span>Confirmed</span>
                      <span>{new Date(order.confirmedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {order.preparedAt && (
                    <div className="flex justify-between">
                      <span>Started cooking</span>
                      <span>{new Date(order.preparedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {order.readyAt && (
                    <div className="flex justify-between">
                      <span>Ready</span>
                      <span>{new Date(order.readyAt).toLocaleString()}</span>
                    </div>
                  )}
                  {order.deliveredAt && (
                    <div className="flex justify-between">
                      <span>Delivered</span>
                      <span>{new Date(order.deliveredAt).toLocaleString()}</span>
                    </div>
                  )}
                  {order.completedAt && (
                    <div className="flex justify-between">
                      <span>Completed</span>
                      <span>{new Date(order.completedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {order.cancelledAt && (
                    <div className="flex justify-between text-red-600">
                      <span>Cancelled</span>
                      <span>{new Date(order.cancelledAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerHistory;