import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import useDashboardStore from "@/store/useDashboardStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, ShoppingCart, QrCode, CreditCard,
  RefreshCw, ArrowRight
} from "lucide-react";

const SummaryCard = ({ icon: Icon, label, value, subtext, color, onClick, actionLabel }) => (
  <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
    <CardContent className="p-4 flex-1">
      <div className="flex items-center justify-between mb-2">
        <div className={`size-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="size-5" />
        </div>
        {actionLabel && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-primary px-2" onClick={onClick}>
            {actionLabel} <ArrowRight className="size-3 ml-1" />
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </CardContent>
  </Card>
);

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const { ownerKPIs, fetchOwnerKPIs, isLoading } = useDashboardStore();

  useEffect(() => {
    fetchOwnerKPIs();
  }, [fetchOwnerKPIs]);

  const stats = useMemo(() => {
    const kpis = ownerKPIs?.kpis || ownerKPIs || {};
    return {
      revenue: kpis.revenue || 0,
      totalOrders: kpis.totalOrders || 0,
      completedOrders: kpis.completedOrders || 0,
      cancelledOrders: kpis.cancelledOrders || 0,
      pendingOrders: kpis.pendingOrders || 0,
      preparingOrders: kpis.preparingOrders || 0,
      readyOrders: kpis.readyOrders || 0,
    };
  }, [ownerKPIs]);

  if (isLoading && !ownerKPIs) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Overview</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchOwnerKPIs()}>
          <RefreshCw className="size-4 mr-2" /> Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={DollarSign}
          label="Total Revenue"
          value={`${stats.revenue.toLocaleString()} ETB`}
          color="bg-green-500/10 text-green-600"
          actionLabel="View Sales"
          onClick={() => navigate("/owner/sales")}
        />
        <SummaryCard
          icon={ShoppingCart}
          label="Total Orders"
          value={stats.totalOrders}
          subtext={`${stats.completedOrders} completed`}
          color="bg-blue-500/10 text-blue-600"
          actionLabel="View Orders"
          onClick={() => navigate("/owner/orders")}
        />
        <SummaryCard
          icon={QrCode}
          label="Orders by Status"
          value={`P:${stats.pendingOrders} R:${stats.readyOrders}`}
          subtext={`Preparing: ${stats.preparingOrders}`}
          color="bg-purple-500/10 text-purple-600"
          actionLabel="View Orders"
          onClick={() => navigate("/owner/orders")}
        />
        <SummaryCard
          icon={CreditCard}
          label="Pending Payments"
          value="Check Payments"
          color="bg-amber-500/10 text-amber-600"
          actionLabel="View Payments"
          onClick={() => navigate("/owner/payments")}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>Quick overview of your restaurant</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Dashboard metrics from the simplified POS system.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerDashboard;
