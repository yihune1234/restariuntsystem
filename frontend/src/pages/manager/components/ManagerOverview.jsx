import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import {
  DollarSign, ShoppingCart, AlertTriangle, CreditCard,
  LayoutGrid, Boxes, CalendarClock, ArrowRight, RefreshCw,
  Zap, CheckCircle, Clock, Loader2, Wallet, UtensilsCrossed,
  TrendingUp, Target, Users, Activity, Donut,
} from "lucide-react";

const COLORS = ["#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

const SummaryCard = ({ icon: Icon, label, value, subtext, color, onClick, actionLabel, badge }) => (
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
      <div className="flex items-center gap-2">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {badge && <Badge className={badge.className}>{badge.text}</Badge>}
      </div>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </CardContent>
  </Card>
);

const QuickActionButton = ({ icon: Icon, label, onClick }) => (
  <Button variant="outline" className="h-auto py-3 flex flex-col gap-1.5 px-4" onClick={onClick}>
    <Icon className="size-5" />
    <span className="text-xs">{label}</span>
  </Button>
);

const RecentActivityItem = ({ icon: Icon, color, text, time }) => (
  <div className="flex items-center gap-3 py-2 border-b last:border-0">
    <div className={`size-8 rounded-full ${color} flex items-center justify-center flex-shrink-0`}>
      <Icon className="size-3.5" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm truncate">{text}</p>
      <p className="text-[10px] text-muted-foreground">{time}</p>
    </div>
  </div>
);

const STATUS_COLORS = {
  PENDING: "#f59e0b", PREPARING: "#3b82f6", READY: "#8b5cf6",
  COMPLETED: "#22c55e", CANCELLED: "#ef4444",
};
const PAYMENT_COLORS = {
  QR: "#3b82f6", Cashier: "#f59e0b", Manual: "#8b5cf6",
};

const ManagerOverview = () => {
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const {
    ownerKPIs, hourlySales, foodReport, ordersReport,
    isLoading, isFetchingCharts, lastUpdated, fetchAllDashboardData, listenForRealTimeUpdates,
  } = useDashboardStore();

  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    fetchAllDashboardData();
    const cleanup = listenForRealTimeUpdates();
    setSocketConnected(true);
    return cleanup;
  }, [fetchAllDashboardData, listenForRealTimeUpdates]);

  const kpis = ownerKPIs?.kpis || ownerKPIs || {};
  const revenueKpis = kpis.revenue || {};
  const orders = kpis.orders || {};
  const tables = kpis.tables || {};
  const sourceBreakdown = kpis.sourceBreakdown || {};
  const paymentBreakdown = kpis.paymentBreakdown || {};

  const delayedOrders = useMemo(() => {
    if (!ownerKPIs) return 0;
    return 0;
  }, [ownerKPIs]);

  const hourlyChartData = useMemo(() => {
    return (hourlySales || []).map(h => ({
      hour: `${String(h.hour).padStart(2, "0")}:00`,
      revenue: Math.round((h.revenue || 0) * 100) / 100,
      orders: h.orders || 0,
    }));
  }, [hourlySales]);

  const statusPieData = useMemo(() => {
    const labels = ["Pending", "Preparing", "Ready", "Completed", "Cancelled"];
    const values = labels.map(label => {
      const key = label.toLowerCase();
      const statusKey = label === "Preparing" ? "preparing" : label.toLowerCase();
      return orders[statusKey] || 0;
    });
    return labels.map((label, i) => ({ name: label, value: values[i] })).filter(d => d.value > 0);
  }, [orders]);

  const sourceBarData = useMemo(() => {
    return Object.entries(sourceBreakdown).map(([key, val]) => ({
      name: key,
      count: val.count || 0,
      revenue: Math.round((val.revenue || 0) * 100) / 100,
    }));
  }, [sourceBreakdown]);

  const topItems = useMemo(() => {
    return (foodReport?.topSellingFood || []).slice(0, 8).map(item => ({
      name: item.foodName || item._id,
      revenue: Math.round((item.totalRevenue || 0) * 100) / 100,
      qty: item.totalQuantitySold || 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [foodReport]);

  const categoryBarData = useMemo(() => {
    return (foodReport?.categoryBreakdown || []).map(c => ({
      name: c.name,
      revenue: Math.round((c.totalRevenue || 0) * 100) / 100,
      qty: c.totalQuantitySold || 0,
    }));
  }, [foodReport]);

  const revenue = useMemo(() => Math.round((revenueKpis.total || 0) * 100) / 100, [revenueKpis.total]);
  const netRevenue = useMemo(() => Math.round((revenueKpis.net || 0) * 100) / 100, [revenueKpis.net]);

  const avgOrdersPerHour = useMemo(() => {
    if (hourlyChartData.length === 0) return 0;
    const total = hourlyChartData.reduce((s, h) => s + (h.orders || 0), 0);
    return Math.round((total / hourlyChartData.length) * 10) / 10;
  }, [hourlyChartData]);

  const peakHour = useMemo(() => {
    if (hourlyChartData.length === 0) return null;
    return hourlyChartData.reduce((best, h) => (h.orders > (best?.orders || 0) ? h : best), null);
  }, [hourlyChartData]);

  const awaitingKitchen = useMemo(() => {
    const pending = orders.pending || orders.unpaid || 0;
    return pending;
  }, [orders]);

  if (isLoading && !ownerKPIs) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="size-6 text-primary" /> Manager Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {socketConnected && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                <span className="size-1.5 rounded-full bg-green-500" /> Live
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAllDashboardData} disabled={isFetchingCharts}>
          {isFetchingCharts ? <Loader2 className="size-4 mr-2 animate-spin" /> : <RefreshCw className="size-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <SummaryCard
          icon={DollarSign}
          label="Total Revenue"
          value={`${revenue.toLocaleString()} ETB`}
          subtext={`Net: ${netRevenue.toLocaleString()} ETB`}
          color="bg-green-500/10 text-green-600"
          actionLabel="View Sales"
          onClick={() => navigate("/manager/reports")}
        />
        <SummaryCard
          icon={ShoppingCart}
          label="Total Orders"
          value={orders.total || 0}
          subtext={`${orders.completed || 0} completed · ${orders.active || 0} active`}
          color="bg-blue-500/10 text-blue-600"
          actionLabel="View Orders"
          onClick={() => navigate("/manager/orders")}
        />
        <SummaryCard
          icon={LayoutGrid}
          label="Tables"
          value={`${tables.occupied || 0} / ${tables.total || 0}`}
          subtext={`${tables.available || 0} available`}
          color="bg-purple-500/10 text-purple-600"
          actionLabel="Floor Plan"
          onClick={() => navigate("/manager/tables")}
        />
        <SummaryCard
          icon={Wallet}
          label="Pending Payments"
          value={`${(revenue.unpaid || 0).toLocaleString()} ETB`}
          subtext={`${orders.unpaid || 0} orders unpaid`}
          color="bg-amber-500/10 text-amber-600"
          actionLabel="View Payments"
          onClick={() => navigate("/manager/payments")}
        />
        <SummaryCard
          icon={Clock}
          label="Prepping"
          value={orders.preparing || 0}
          subtext={`${orders.ready || 0} ready`}
          color="bg-indigo-500/10 text-indigo-600"
          actionLabel="Kitchen"
          onClick={() => navigate("/manager/kitchen")}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Awaiting Kitchen"
          value={awaitingKitchen}
          subtext={`${orders.preparing || 0} preparing · ${orders.ready || 0} ready`}
          color="bg-red-500/10 text-red-600"
          actionLabel="Kitchen"
          onClick={() => navigate("/manager/kitchen")}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Avg Order Value"
          value={`${(orders.averageValue || 0).toLocaleString()} ETB`}
          subtext="Today's average"
          color="bg-emerald-500/10 text-emerald-600"
          actionLabel="Reports"
          onClick={() => navigate("/manager/reports")}
        />
        <SummaryCard
          icon={UtensilsCrossed}
          label="Orders / Hour"
          value={hourlyChartData.length > 0 ? avgOrdersPerHour : "—"}
          subtext={peakHour ? `Peak: ${peakHour.hour} (${peakHour.orders})` : "Today's average"}
          color="bg-cyan-500/10 text-cyan-600"
          actionLabel="Hourly"
          onClick={() => navigate("/manager/reports")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" /> Revenue Today
            </CardTitle>
            <CardDescription>Hourly revenue and order count</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {hourlyChartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">No hourly data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#f59e0b" fill="#f59e0b20" name="Revenue (ETB)" />
                  <Area type="monotone" dataKey="orders" stroke="#3b82f6" fill="#3b82f620" name="Orders" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="size-5 text-primary" /> Order Status
            </CardTitle>
            <CardDescription>Live order distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {statusPieData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">No orders yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="size-5 text-primary" /> Orders by Source
            </CardTitle>
            <CardDescription>QR, Cashier, Manual</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {sourceBarData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">No source data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceBarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Orders" />
                  <Bar dataKey="revenue" fill="#f59e0b" name="Revenue (ETB)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="size-5 text-primary" /> Top Selling Items
            </CardTitle>
            <CardDescription>By revenue today</CardDescription>
          </CardHeader>
          <CardContent className="h-64 overflow-auto">
            {topItems.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">No sales data</div>
            ) : (
              <div className="space-y-2">
                {topItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-6 text-muted-foreground font-mono">{i + 1}</span>
                    <span className="flex-1 font-medium truncate">{item.name}</span>
                    <span className="text-amber-600 font-semibold">{item.revenue.toLocaleString()} ETB</span>
                    <span className="text-muted-foreground text-xs">{item.qty}×</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <UtensilsCrossed className="size-5 text-primary" /> Revenue by Category
            </CardTitle>
            <CardDescription>Category breakdown</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {categoryBarData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">No category data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#22c55e" name="Revenue (ETB)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="size-5 text-primary" /> Quick POS Actions
            </CardTitle>
            <CardDescription>Create orders & manage payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <QuickActionButton icon={ShoppingCart} label="New Order" onClick={() => navigate("/manager/create-order")} />
              <QuickActionButton icon={Clock} label="All Orders" onClick={() => navigate("/manager/orders")} />
              <QuickActionButton icon={CreditCard} label="Pending Payments" onClick={() => navigate("/manager/payments")} />
              <QuickActionButton icon={CheckCircle} label="Ready Orders" onClick={() => navigate("/manager/kitchen")} />
              <QuickActionButton icon={Users} label="Tables" onClick={() => navigate("/manager/tables")} />
              <QuickActionButton icon={CalendarClock} label="Daily Close" onClick={() => navigate("/manager/daily")} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerOverview;
