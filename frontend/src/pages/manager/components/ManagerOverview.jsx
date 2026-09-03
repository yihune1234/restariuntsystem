import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrderStore } from "@/store/useOrderStore";
import { useTableStore } from "@/store/useTableStore";
import { useUserStore } from "@/store/useUserStore";
import { useShiftStore } from "@/store/useShiftStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  CreditCard,
  LayoutGrid,
  Boxes,
  CalendarClock,
  ArrowRight,
  RefreshCw,
  ChefHat,
  Truck,
  Settings,
  Zap,
  CheckCircle,
} from "lucide-react";

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

const ManagerOverview = ({ branchId }) => {
  const navigate = useNavigate();
  const { orders, getBranchOrders, isLoading: ordersLoading } = useOrderStore();
  const { tables, getTablesByBranch, isLoading: tablesLoading } = useTableStore();
  const { staff, fetchStaffByBranch } = useUserStore();
  const { branchShifts } = useShiftStore();

  useEffect(() => {
    if (branchId) {
      getBranchOrders(branchId, { limit: 100 });
      getTablesByBranch(branchId);
      fetchStaffByBranch(branchId);
    }
  }, [branchId, getBranchOrders, getTablesByBranch, fetchStaffByBranch]);

  const stats = useMemo(() => {
    const active = orders.filter(o => !["COMPLETED", "CANCELLED"].includes(o.orderStatus));
    const preparing = active.filter(o => ["CONFIRMED", "PREPARING"].includes(o.orderStatus));
    const ready = active.filter(o => o.orderStatus === "READY");
    const unpaid = active.filter(o => ["UNPAID", "PENDING"].includes(o.paymentStatus));
    const delayed = active.filter(o => {
      if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false;
      return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000;
    });
    
    const unpaidAmount = unpaid.reduce((sum, o) => sum + (o.total || 0), 0);
    const occupiedTables = tables.filter(t => t.status !== "AVAILABLE").length;
    const staffOnShift = branchShifts.filter(s => s.status === "OPEN").length;

    return {
      totalOrders: active.length,
      preparing: preparing.length,
      ready: ready.length,
      unpaid: unpaid.length,
      delayed: delayed.length,
      unpaidAmount,
      totalTables: tables.length,
      occupiedTables,
      availableTables: tables.length - occupiedTables,
      staffOnShift,
    };
  }, [orders, tables, branchShifts]);

  const recentActivity = useMemo(() => {
    const activities = [];
    orders.filter(o => !["COMPLETED", "CANCELLED"].includes(o.orderStatus)).slice(0, 5).forEach(order => {
      activities.push({
        icon: ShoppingCart,
        color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
        text: `Order #${order.orderNumber || order._id?.slice(-6)} received`,
        time: new Date(order.createdAt).toLocaleTimeString(),
      });
    });
    orders.filter(o => o.orderStatus === "READY").slice(0, 3).forEach(order => {
      activities.push({
        icon: CheckCircle,
        color: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
        text: `Order #${order.orderNumber || order._id?.slice(-6)} ready`,
        time: new Date(order.updatedAt).toLocaleTimeString(),
      });
    });
    orders.filter(o => o.paymentStatus === "COMPLETED").slice(0, 3).forEach(order => {
      activities.push({
        icon: DollarSign,
        color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
        text: `Payment ${(order.total || 0).toLocaleString()} ETB`,
        time: new Date(order.updatedAt).toLocaleTimeString(),
      });
    });
    return activities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6);
  }, [orders]);

  const isLoading = ordersLoading && tablesLoading;

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  if (isLoading && orders.length === 0) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manager Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { getBranchOrders(branchId, { limit: 100 }); getTablesByBranch(branchId); }}>
          <RefreshCw className="size-4 mr-2" /> Refresh Data
        </Button>
      </div>

      {/* Top Operational KPIs (Progressive Disclosure) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <SummaryCard
          icon={ShoppingCart}
          label="Active Orders"
          value={stats.totalOrders}
          subtext={`${stats.preparing} preparing, ${stats.ready} ready`}
          color="bg-blue-500/10 text-blue-600"
          actionLabel="View Orders"
          onClick={() => navigate("/manager/orders")}
        />
        <SummaryCard
          icon={LayoutGrid}
          label="Active Tables"
          value={`${stats.occupiedTables} / ${stats.totalTables}`}
          subtext={`${stats.availableTables} available`}
          color="bg-purple-500/10 text-purple-600"
          actionLabel="Floor Plan"
          onClick={() => navigate("/manager/tables")}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Needs Attention"
          value={stats.delayed}
          subtext="Orders delayed > 20 mins"
          color={stats.delayed > 0 ? "bg-red-500/10 text-red-600" : "bg-gray-500/10 text-gray-500"}
          badge={stats.delayed > 0 ? { className: "bg-red-500 text-white", text: "Action Required" } : null}
          actionLabel="View Orders"
          onClick={() => navigate("/manager/orders")}
        />
        <SummaryCard
          icon={CreditCard}
          label="Pending Payments"
          value={stats.unpaid}
          subtext={`${stats.unpaidAmount.toLocaleString()} ETB unpaid`}
          color="bg-amber-500/10 text-amber-600"
          actionLabel="View Payments"
          onClick={() => navigate("/manager/payments")}
        />
        <SummaryCard
          icon={Boxes}
          label="Inventory Alerts"
          value="Check Stock"
          subtext="View low stock and waste"
          color="bg-orange-500/10 text-orange-600"
          actionLabel="View Inventory"
          onClick={() => navigate("/manager/inventory")}
        />
        <SummaryCard
          icon={CalendarClock}
          label="Staff on Shift"
          value={stats.staffOnShift}
          subtext="Currently working"
          color="bg-indigo-500/10 text-indigo-600"
          actionLabel="View Staff"
          onClick={() => navigate("/manager/staff")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="size-5 text-primary" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
            ) : (
              <div className="space-y-1">
                {recentActivity.map((activity, i) => (
                  <RecentActivityItem key={i} {...activity} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="size-5 text-primary" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <QuickActionButton icon={CalendarClock} label="Daily Close" onClick={() => navigate("/manager/daily")} />
              <QuickActionButton icon={AlertTriangle} label="Complaints" onClick={() => navigate("/manager/customers")} />
              <QuickActionButton icon={ChefHat} label="Kitchen" onClick={() => navigate("/manager/kitchen")} />
              <QuickActionButton icon={Boxes} label="Waste Mgmt" onClick={() => navigate("/manager/waste")} />
              <QuickActionButton icon={Truck} label="Offline" onClick={() => navigate("/manager/offline")} />
              <QuickActionButton icon={Settings} label="Settings" onClick={() => navigate("/manager/branch-settings")} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerOverview;
