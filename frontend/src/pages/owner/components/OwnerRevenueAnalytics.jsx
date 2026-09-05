import { useEffect } from "react";
import useDashboardStore from "@/store/useDashboardStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, CheckCircle, Clock } from "lucide-react";

const OwnerRevenueAnalytics = () => {
  const { ownerKPIs, fetchOwnerKPIs, isLoading } = useDashboardStore();

  useEffect(() => {
    fetchOwnerKPIs();
  }, [fetchOwnerKPIs]);

  const kpis = ownerKPIs?.kpis;
  const revenue = kpis?.revenue || {};
  const orders = kpis?.orders || {};
  const tables = kpis?.tables || {};
  const paymentBreakdown = kpis?.paymentBreakdown || {};
  const sourceBreakdown = kpis?.sourceBreakdown || {};

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{(revenue.total || 0).toLocaleString()} ETB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{orders.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Clock className="size-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Orders</p>
                <p className="text-2xl font-bold">{orders.active || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <CheckCircle className="size-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{orders.completed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending</span>
              <span className="font-bold">{orders.pending || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Preparing</span>
              <span className="font-bold">{orders.preparing || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Ready</span>
              <span className="font-bold">{orders.ready || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Completed</span>
              <span className="font-bold">{orders.completed || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Cancelled</span>
              <span className="font-bold">{orders.cancelled || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Cash</span>
              <span className="font-bold">{(paymentBreakdown.Cash?.amount || 0).toLocaleString()} ETB ({paymentBreakdown.Cash?.count || 0})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Card</span>
              <span className="font-bold">{(paymentBreakdown.Card?.amount || 0).toLocaleString()} ETB ({paymentBreakdown.Card?.count || 0})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Digital</span>
              <span className="font-bold">{(paymentBreakdown.Digital?.amount || 0).toLocaleString()} ETB ({paymentBreakdown.Digital?.count || 0})</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">QR Code</span>
            <span className="font-bold">{(sourceBreakdown.QR?.revenue || 0).toLocaleString()} ETB ({sourceBreakdown.QR?.count || 0})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Cashier</span>
            <span className="font-bold">{(sourceBreakdown.Cashier?.revenue || 0).toLocaleString()} ETB ({sourceBreakdown.Cashier?.count || 0})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Manual</span>
            <span className="font-bold">{(sourceBreakdown.Manual?.revenue || 0).toLocaleString()} ETB ({sourceBreakdown.Manual?.count || 0})</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Table Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Total Tables</span>
            <span className="font-bold">{tables.total || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Occupied</span>
            <span className="font-bold">{tables.occupied || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Available</span>
            <span className="font-bold">{tables.available || 0}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerRevenueAnalytics;
