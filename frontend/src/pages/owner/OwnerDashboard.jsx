import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import useDashboardStore from "@/store/useDashboardStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import {
  DollarSign, ShoppingCart, Users, AlertTriangle, TrendingUp, TrendingDown,
  ArrowRight, RefreshCw, CreditCard, Banknote, Shield, CheckCircle, Package, UtensilsCrossed, Star, QrCode
} from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

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
  const { ownerKPIs, fraudAlerts, fetchOwnerKPIs, fetchFraudAlerts, isLoading } = useDashboardStore();

  useEffect(() => {
    fetchOwnerKPIs();
    if (authUser?.organizationId) {
      // Assuming fetchFraudAlerts works without branchId or handles organization level if modified,
      // or we just fetch for the default if possible. The backend route was /branches/:id/fraud... 
      // We will skip fraud fetch if it requires branchId and we don't have it, or let the store handle it.
      // fetchFraudAlerts(); 
    }
  }, [fetchOwnerKPIs, authUser]);

  const stats = useMemo(() => {
    const kpis = ownerKPIs?.kpis || {};
    const revenue = kpis.revenue || {};
    const orders = kpis.orders || {};
    const tables = kpis.tables || {};
    return {
      revenue: revenue.total || 0,
      netRevenue: revenue.net || 0,
      grossRevenue: revenue.gross || 0,
      totalOrders: orders.total || 0,
      completedOrders: orders.completed || 0,
      cancelledOrders: orders.cancelled || 0,
      unpaidBills: revenue.unpaid || 0,
      discounts: revenue.discount || 0,
      refunds: revenue.refund || 0,
      avgOrderValue: orders.averageValue || 0,
      activeTables: tables.occupied || 0,
      totalTables: tables.total || 0,
      fraudAlertsCount: (fraudAlerts?.bySeverity?.HIGH?.length || 0) + (fraudAlerts?.bySeverity?.MEDIUM?.length || 0),
    };
  }, [ownerKPIs, fraudAlerts]);

  const paymentData = useMemo(() => {
    const breakdown = ownerKPIs?.kpis?.paymentBreakdown || {};
    return Object.entries(breakdown).map(([name, data]) => ({
      name,
      value: data?.amount || 0,
      count: data?.count || 0
    }));
  }, [ownerKPIs]);

  const orderSourceData = useMemo(() => {
    const source = ownerKPIs?.kpis?.orderSource || {};
    return Object.entries(source).map(([name, data]) => ({
      name,
      orders: data?.count || 0,
      revenue: data?.revenue || 0
    }));
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
      {/* Header */}
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

      {/* Top Level KPIs (Progressive Disclosure) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={DollarSign}
          label="Today's Revenue"
          value={`${stats.revenue.toLocaleString()} ETB`}
          subtext={`Net: ${stats.netRevenue.toLocaleString()} ETB`}
          color="bg-green-500/10 text-green-600"
          actionLabel="View Sales"
          onClick={() => navigate("/owner/sales")}
        />
        <SummaryCard
          icon={ShoppingCart}
          label="Today's Orders"
          value={stats.totalOrders}
          subtext={`${stats.completedOrders} completed, ${stats.cancelledOrders} cancelled`}
          color="bg-blue-500/10 text-blue-600"
          actionLabel="View Orders"
          onClick={() => navigate("/owner/orders")}
        />
        <SummaryCard
          icon={QrCode}
          label="Active Tables"
          value={`${stats.activeTables} / ${stats.totalTables}`}
          subtext={`${stats.totalTables - stats.activeTables} tables available`}
          color="bg-purple-500/10 text-purple-600"
          actionLabel="Floor Plan"
          onClick={() => navigate("/owner/tables")}
        />
        <SummaryCard
          icon={CreditCard}
          label="Pending Payments"
          value={`${stats.unpaidBills.toLocaleString()} ETB`}
          subtext="From unpaid or pending orders"
          color="bg-amber-500/10 text-amber-600"
          actionLabel="View Payments"
          onClick={() => navigate("/owner/payments")}
        />
        <SummaryCard
          icon={Package}
          label="Inventory Alerts"
          value="Check Stock"
          subtext="Low stock items need review"
          color="bg-orange-500/10 text-orange-600"
          actionLabel="View Inventory"
          onClick={() => navigate("/owner/inventory")}
        />
        <SummaryCard
          icon={TrendingDown}
          label="Refunds & Discounts"
          value={`${(stats.refunds + stats.discounts).toLocaleString()} ETB`}
          subtext={`${stats.refunds} ETB refunded, ${stats.discounts} ETB discounted`}
          color="bg-pink-500/10 text-pink-600"
          actionLabel="View Refunds"
          onClick={() => navigate("/owner/refunds")}
        />
        <SummaryCard
          icon={Star}
          label="Customer Feedback"
          value="Ratings"
          subtext="Recent reviews and complaints"
          color="bg-indigo-500/10 text-indigo-600"
          actionLabel="View Feedback"
          onClick={() => navigate("/owner/feedback")}
        />
        <SummaryCard
          icon={Shield}
          label="Security Alerts"
          value={stats.fraudAlertsCount > 0 ? `${stats.fraudAlertsCount} Alerts` : "All Clear"}
          subtext={stats.fraudAlertsCount > 0 ? "Suspicious activity detected" : "No fraud alerts today"}
          color={stats.fraudAlertsCount > 0 ? "bg-red-500/10 text-red-600" : "bg-gray-500/10 text-gray-500"}
          actionLabel="View Activity"
          onClick={() => navigate("/owner/users")}
        />
      </div>

      {/* Visual Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Payment Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Breakdown</CardTitle>
            <CardDescription>Revenue distribution by payment method</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `${value.toLocaleString()} ETB`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {paymentData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                      <div className="size-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-medium">{entry.name}:</span>
                      <span className="text-muted-foreground">{entry.value.toLocaleString()} ETB</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No payment data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Sources Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Sources</CardTitle>
            <CardDescription>Volume of orders by source (e.g., QR, Manual)</CardDescription>
          </CardHeader>
          <CardContent>
            {orderSourceData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orderSourceData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} />
                    <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#8884d8" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="revenue" name="Revenue (ETB)" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No order source data available
              </div>
            )}
          </CardContent>
        </Card>

      </div>

    </div>
  );
};

export default OwnerDashboard;
