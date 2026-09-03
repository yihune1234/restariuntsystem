import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useBranchStore } from "@/store/useBranchStore";
import { useTableStore } from "@/store/useTableStore";
import ManagerLiveOrders from "./ManagerLiveOrders";
import ManagerTableOverview from "./ManagerTableOverview";
import ManagerAlerts from "./ManagerAlerts";
import ManagerPaymentsPanel from "./ManagerPaymentsPanel";
import ManagerStaffPanel from "./ManagerStaffPanel";
import ManagerInventoryDashboard from "./ManagerInventoryDashboard";
import ManagerComplaints from "./ManagerComplaints";
import ReportsAnalytics from "../../shared/ReportsAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart,
  Clock,
  ChefHat,
  CheckCircle,
  Users,
  DollarSign,
  AlertTriangle,
  Circle,
  Utensils,
  CreditCard,
  Smartphone,
  LayoutDashboard,
  ListOrdered,
  LayoutGrid,
  ArrowRight,
  Activity,
  TrendingUp,
  Package,
  MessageSquare,
  FileBarChart,
  Eye,
} from "lucide-react";

const STATUS_CONFIG = {
  available: { color: "bg-green-500", label: "Available", textColor: "text-green-600" },
  occupied: { color: "bg-blue-500", label: "Occupied", textColor: "text-blue-600" },
  ordering: { color: "bg-yellow-500", label: "Ordering", textColor: "text-yellow-600" },
  preparing: { color: "bg-orange-500", label: "Preparing", textColor: "text-orange-600" },
  ready: { color: "bg-purple-500", label: "Ready", textColor: "text-purple-600" },
  served: { color: "bg-indigo-500", label: "Served", textColor: "text-indigo-600" },
  payment_pending: { color: "bg-red-500", label: "Payment Pending", textColor: "text-red-600" },
  attention: { color: "bg-pink-500", label: "Needs Attention", textColor: "text-pink-600" },
  cleaning: { color: "bg-gray-500", label: "Cleaning", textColor: "text-gray-500" },
};

const ORDER_STATUS_CONFIG = {
  WAITING_FOR_PAYMENT: { color: "bg-yellow-500", label: "New" },
  CONFIRMED: { color: "bg-blue-500", label: "Confirmed" },
  PREPARING: { color: "bg-orange-500", label: "Preparing" },
  READY: { color: "bg-green-500", label: "Ready" },
  TAKEN_BY_WAITER: { color: "bg-purple-500", label: "Taken" },
  DELIVERED: { color: "bg-indigo-500", label: "Delivered" },
  COMPLETED: { color: "bg-gray-500", label: "Completed" },
  CANCELLED: { color: "bg-red-500", label: "Cancelled" },
};

const OperationalBar = ({ tables, orders, onStatusClick, activeFilter }) => {
  const tableStats = useMemo(() => {
    const stats = {
      total: tables.length,
      available: 0,
      occupied: 0,
      ordering: 0,
      preparing: 0,
      ready: 0,
      served: 0,
      payment_pending: 0,
      attention: 0,
      cleaning: 0,
    };

    const activeOrders = orders.filter(o => !["COMPLETED", "CANCELLED"].includes(o.orderStatus));
    const tableOrderMap = {};

    activeOrders.forEach(order => {
      if (order.tableId?._id) {
        if (!tableOrderMap[order.tableId._id]) {
          tableOrderMap[order.tableId._id] = [];
        }
        tableOrderMap[order.tableId._id].push(order);
      }
    });

    tables.forEach(table => {
      const tableOrders = tableOrderMap[table._id] || [];
      const hasActiveOrders = tableOrders.length > 0;
      const latestOrder = tableOrders[tableOrders.length - 1];

      const hasUnpaid = tableOrders.some(o =>
        ["UNPAID", "PENDING"].includes(o.paymentStatus) &&
        ["COMPLETED", "DELIVERED", "TAKEN_BY_WAITER"].includes(o.orderStatus)
      );
      const hasDelayed = tableOrders.some(o => {
        if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false;
        return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000;
      });
      const isPreparing = tableOrders.some(o => ["CONFIRMED", "PREPARING"].includes(o.orderStatus));
      const isReady = tableOrders.some(o => o.orderStatus === "READY");
      const isServed = tableOrders.some(o => ["TAKEN_BY_WAITER", "DELIVERED"].includes(o.orderStatus));

      if (table.status === "RESERVED") {
        stats.occupied++;
      } else if (hasDelayed || hasUnpaid) {
        stats.attention++;
      } else if (hasUnpaid && isServed) {
        stats.payment_pending++;
      } else if (isReady) {
        stats.ready++;
      } else if (isPreparing) {
        stats.preparing++;
      } else if (isServed) {
        stats.served++;
      } else if (hasActiveOrders && table.qrToken) {
        stats.ordering++;
      } else if (hasActiveOrders) {
        stats.occupied++;
      } else if (table.status === "CLEANING") {
        stats.cleaning++;
      } else if (table.status === "AVAILABLE") {
        stats.available++;
      } else {
        stats.occupied++;
      }
    });

    return stats;
  }, [tables, orders]);

  const orderStats = useMemo(() => {
    const active = orders.filter(o => !["COMPLETED", "CANCELLED"].includes(o.orderStatus));
    return {
      total: active.length,
      new: active.filter(o => o.orderStatus === "WAITING_FOR_PAYMENT" || o.orderStatus === "CONFIRMED").length,
      preparing: active.filter(o => o.orderStatus === "PREPARING").length,
      ready: active.filter(o => o.orderStatus === "READY").length,
      served: active.filter(o => ["TAKEN_BY_WAITER", "DELIVERED"].includes(o.orderStatus)).length,
      delayed: active.filter(o => {
        if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false;
        return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000;
      }).length,
      unpaid: orders.filter(o =>
        ["UNPAID", "PENDING"].includes(o.paymentStatus) &&
        !["COMPLETED", "CANCELLED"].includes(o.orderStatus)
      ).length,
    };
  }, [orders]);

  const statItems = [
    { key: "total", label: "Tables", value: tableStats.total, icon: LayoutGrid, color: "bg-gray-500" },
    { key: "available", label: "Available", value: tableStats.available, icon: Circle, color: "bg-green-500" },
    { key: "occupied", label: "Occupied", value: tableStats.occupied, icon: Users, color: "bg-blue-500" },
    { key: "ordering", label: "Ordering", value: tableStats.ordering, icon: Utensils, color: "bg-yellow-500" },
    { key: "preparing", label: "Preparing", value: tableStats.preparing, icon: ChefHat, color: "bg-orange-500" },
    { key: "ready", label: "Ready", value: tableStats.ready, icon: CheckCircle, color: "bg-purple-500" },
    { key: "served", label: "Served", value: tableStats.served, icon: ShoppingCart, color: "bg-indigo-500" },
    { key: "payment_pending", label: "Pay Pending", value: tableStats.payment_pending, icon: CreditCard, color: "bg-red-500" },
    { key: "attention", label: "Attention", value: tableStats.attention, icon: AlertTriangle, color: "bg-pink-500" },
  ];

  const orderItems = [
    { key: "total", label: "Active Orders", value: orderStats.total, icon: ListOrdered },
    { key: "new", label: "New", value: orderStats.new, icon: Clock },
    { key: "preparing", label: "Preparing", value: orderStats.preparing, icon: ChefHat },
    { key: "ready", label: "Ready", value: orderStats.ready, icon: CheckCircle },
    { key: "served", label: "Served", value: orderStats.served, icon: ShoppingCart },
    { key: "delayed", label: "Delayed", value: orderStats.delayed, icon: AlertTriangle },
    { key: "unpaid", label: "Unpaid", value: orderStats.unpaid, icon: DollarSign },
  ];

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max">
          {statItems.map(item => {
            const isActive = activeFilter?.type === "table" && activeFilter?.status === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onStatusClick(item.key ? { type: "table", status: item.key } : null)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <div className={`size-2 rounded-full ${item.color}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className={`text-sm font-bold ${isActive ? "text-primary" : ""}`}>
                  {item.value}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max">
          {orderItems.map(item => {
            const isActive = activeFilter?.type === "order" && activeFilter?.status === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onStatusClick(item.key ? { type: "order", status: item.key } : null)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  item.key === "delayed" && item.value > 0
                    ? "border-red-300 bg-red-50"
                    : isActive
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <item.icon className={`size-3 ${item.key === "delayed" && item.value > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className={`text-sm font-bold ${
                  item.key === "delayed" && item.value > 0 ? "text-red-600" :
                  isActive ? "text-primary" : ""
                }`}>
                  {item.value}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Summary-first Manager Dashboard.
 *
 * On first load the Manager sees only:
 *   - High-level KPIs (Revenue, Active Orders, Active Tables, Attention, Unpaid, Alerts)
 *   - Compact status pills for tables and orders
 *   - A compact alerts strip
 *   - Recent activity (collapsed to a few items)
 *
 * Detailed views (Orders, Tables, Payments, Inventory, Staff, Feedback, Reports)
 * are accessible via tabs or "View" buttons. All existing components
 * (ManagerLiveOrders, ManagerTableOverview, ManagerAlerts, ManagerPaymentsPanel,
 * ManagerStaffPanel) remain untouched.
 */

/** Compact KPI card with an optional "View" action. */
const SummaryKpi = ({ icon: Icon, label, value, subtext, color, onClick }) => (
  <Card className={onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""} onClick={onClick}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`size-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtext && <p className="text-[10px] text-muted-foreground">{subtext}</p>}
          </div>
        </div>
        {onClick && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={onClick}>
            <Eye className="size-3" /> View
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

/** Horizontal scrollable status pills. Each pill is a filter trigger. */
const StatusPills = ({ items, activeFilter, onFilter }) => (
  <div className="overflow-x-auto pb-1 scrollbar-hide">
    <div className="flex gap-2 min-w-max">
      {items.map((item) => {
        const isActive = activeFilter?.group === item.group && activeFilter?.key === item.key;
        return (
          <button
            key={`${item.group}-${item.key}`}
            onClick={() => onFilter(item.key && item.group ? { group: item.group, key: item.key } : null)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all whitespace-nowrap ${
              item.highlight
                ? "border-red-300 bg-red-50"
                : isActive
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-muted-foreground/30"
            }`}
          >
            {item.dot && <div className={`size-2 rounded-full ${item.dot}`} />}
            {item.icon && <item.icon className={`size-3 ${item.highlight ? "text-red-500" : "text-muted-foreground"}`} />}
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <span className={`text-sm font-bold ${item.highlight ? "text-red-600" : isActive ? "text-primary" : ""}`}>
              {item.value}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

/** Compact alerts strip — truncated with a "View All" link. */
const AlertsStrip = ({ alerts, onViewAll }) => {
  const display = alerts.slice(0, 3);
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600" />
            <span className="text-sm font-semibold">Alerts</span>
            {alerts.length > 0 && <Badge variant="outline" className="text-amber-700 border-amber-300">{alerts.length}</Badge>}
          </div>
          {alerts.length > 3 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
              View All <ArrowRight className="size-3 ml-1" />
            </Button>
          )}
        </div>
        {display.length === 0 ? (
          <p className="text-xs text-muted-foreground">No alerts — everything is running smoothly.</p>
        ) : (
          <ul className="space-y-1">
            {display.map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-amber-800">
                <span className="text-amber-500">⚠</span> {a}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

/** Recent activity — compact, collapsed to a few items. */
const RecentActivity = ({ items, onViewAll }) => {
  const display = items.slice(0, 4);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="size-4" /> Recent Activity
          </CardTitle>
          {items.length > 4 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
              View All <ArrowRight className="size-3 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {display.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
        ) : (
          <ul className="space-y-2">
            {display.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <div className={`size-1.5 rounded-full ${item.dot || "bg-muted-foreground"}`} />
                <span className="text-muted-foreground">{item.text}</span>
                {item.time && <span className="ml-auto text-[10px] text-muted-foreground">{item.time}</span>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

const ManagerDashboardRealTime = ({ branchId, statusFilter, onStatusClick }) => {
  const { orders, getBranchOrders, isLoading, setupSocketListeners, cleanupSocketListeners } = useOrderStore();
  const { tables, getTablesByBranch } = useTableStore();

  useEffect(() => {
    if (branchId) {
      getBranchOrders(branchId, { limit: 100 });
      getTablesByBranch(branchId);
    }
    setupSocketListeners();
    return () => cleanupSocketListeners();
  }, [branchId, getBranchOrders, getTablesByBranch, setupSocketListeners, cleanupSocketListeners]);

  const filteredOrders = useMemo(() => {
    if (!statusFilter || statusFilter.type !== "order") return orders;
    const { status } = statusFilter;
    if (status === "delayed") {
      return orders.filter(o => {
        if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false;
        return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000;
      });
    }
    if (status === "unpaid") {
      return orders.filter(o =>
        ["UNPAID", "PENDING"].includes(o.paymentStatus) &&
        !["COMPLETED", "CANCELLED"].includes(o.orderStatus)
      );
    }
    if (status === "total") {
      return orders.filter(o => !["COMPLETED", "CANCELLED"].includes(o.orderStatus));
    }
    return orders.filter(o => o.orderStatus === status);
  }, [orders, statusFilter]);

  const filteredTables = useMemo(() => {
    if (!statusFilter || statusFilter.type !== "table") return tables;
    // Return tables filtered by their calculated status
    // This is handled in the table overview component
    return tables;
  }, [tables, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ManagerLiveOrders
            branchId={branchId}
            orders={filteredOrders}
            title={statusFilter?.type === "order" ? `Orders: ${statusFilter.status}` : "Live Orders"}
          />
        </div>
        <div className="space-y-4">
          <ManagerAlerts branchId={branchId} orders={filteredOrders} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ManagerTableOverview
          branchId={branchId}
          tables={filteredTables}
          orders={filteredOrders}
          statusFilter={statusFilter?.type === "table" ? statusFilter.status : null}
        />
        <ManagerPaymentsPanel branchId={branchId} />
      </div>

      <ManagerStaffPanel branchId={branchId} />
    </div>
  );
};

const ManagerOverview = ({ branchId }) => {
  const { authUser } = useAuthStore();
  const { orders, getBranchOrders, setupSocketListeners, cleanupSocketListeners } = useOrderStore();
  const { tables, getTablesByBranch } = useTableStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [activeFilter, setActiveFilter] = useState(null);

  useEffect(() => {
    if (branchId) { getBranchOrders(branchId, { limit: 100 }); getTablesByBranch(branchId); }
    setupSocketListeners();
    return () => cleanupSocketListeners();
  }, [branchId, getBranchOrders, getTablesByBranch, setupSocketListeners, cleanupSocketListeners]);

  const stats = useMemo(() => {
    const active = orders.filter(o => !["COMPLETED", "CANCELLED"].includes(o.orderStatus));
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter(o => new Date(o.createdAt) >= todayStart);
    const paid = todayOrders.filter(o => o.orderStatus === "COMPLETED" || o.paymentStatus === "PAID").reduce((sum, o) => sum + (o.total || 0), 0);
    const unpaid = todayOrders.filter(o => ["UNPAID", "PENDING"].includes(o.paymentStatus) && !["COMPLETED", "CANCELLED"].includes(o.orderStatus)).reduce((sum, o) => sum + (o.total || 0), 0);
    const newOrders = orders.filter(o => o.orderStatus === "WAITING_FOR_PAYMENT").length;
    const preparing = orders.filter(o => o.orderStatus === "PREPARING").length;
    const ready = orders.filter(o => o.orderStatus === "READY").length;
    const served = orders.filter(o => ["DELIVERED", "TAKEN_BY_WAITER"].includes(o.orderStatus)).length;
    const delayed = active.filter(o => { if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false; return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000; }).length;
    const availableTables = tables.filter(t => t.status === "AVAILABLE").length;
    const occupiedTables = tables.filter(t => t.status === "OCCUPIED").length;
    const totalTables = tables.length;
    return { paid, unpaid, newOrders, preparing, ready, served, delayed, availableTables, occupiedTables, totalTables, activeOrders: active.length, totalTodayOrders: todayOrders.length };
  }, [orders, tables]);

  const tablePills = useMemo(() => [
    { group: "table", key: "all", label: "All", value: stats.totalTables, dot: "bg-slate-400" },
    { group: "table", key: "AVAILABLE", label: "Available", value: stats.availableTables, dot: "bg-green-500" },
    { group: "table", key: "OCCUPIED", label: "Occupied", value: stats.occupiedTables, dot: "bg-blue-500" },
    { group: "table", key: "RESERVED", label: "Reserved", value: tables.filter(t => t.status === "RESERVED").length, dot: "bg-purple-500" },
  ], [tables, stats]);

  const orderPills = useMemo(() => [
    { group: "order", key: "all", label: "All", value: stats.activeOrders, icon: ListOrdered },
    { group: "order", key: "WAITING_FOR_PAYMENT", label: "New", value: stats.newOrders, icon: Clock },
    { group: "order", key: "PREPARING", label: "Preparing", value: stats.preparing, icon: ChefHat },
    { group: "order", key: "READY", label: "Ready", value: stats.ready, icon: CheckCircle },
    { group: "order", key: "DELIVERED", label: "Served", value: stats.served, icon: ShoppingCart },
    { group: "order", key: "delayed", label: "Delayed", value: stats.delayed, icon: AlertTriangle, highlight: stats.delayed > 0 },
    { group: "order", key: "unpaid", label: "Unpaid", value: stats.unpaid > 0 ? Math.max(1, Math.ceil(stats.unpaid / 100)) : 0, icon: DollarSign },
  ], [stats]);

  const alerts = useMemo(() => {
    const a = [];
    if (stats.delayed > 0) a.push(`${stats.delayed} order${stats.delayed > 1 ? "s" : ""} delayed`);
    if (stats.unpaid > 0) a.push(`${stats.unpaid.toLocaleString()} ETB unpaid`);
    if (stats.newOrders > 0) a.push(`${stats.newOrders} new order${stats.newOrders > 1 ? "s" : ""} awaiting`);
    return a;
  }, [stats]);

  const recentActivity = useMemo(() => {
    const items = [];
    orders.slice(0, 5).forEach(o => {
      const time = new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      let text = `Order #${o.orderNumber || o._id?.slice(-6)}`;
      if (o.orderStatus === "WAITING_FOR_PAYMENT") text += " received";
      else if (o.orderStatus === "PREPARING") text += " being prepared";
      else if (o.orderStatus === "READY") text += " marked ready";
      else if (o.orderStatus === "DELIVERED") text += " delivered";
      else if (o.orderStatus === "COMPLETED") text += " completed";
      items.push({ text, time, dot: o.orderStatus === "READY" ? "bg-green-500" : "bg-blue-500" });
    });
    return items;
  }, [orders]);

  const applyFilterToTab = (group, key) => {
    if (group === "table") { setActiveFilter(key === "all" ? null : { group, key }); setActiveTab("tables"); }
    else if (group === "order") { setActiveFilter(key === "all" ? null : { group, key }); setActiveTab("orders"); }
  };

  const filteredOrders = useMemo(() => {
    if (!activeFilter || activeFilter.group !== "order") return orders;
    const { key } = activeFilter;
    if (key === "delayed") return orders.filter(o => { if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false; return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000; });
    if (key === "unpaid") return orders.filter(o => ["UNPAID", "PENDING"].includes(o.paymentStatus) && !["COMPLETED", "CANCELLED"].includes(o.orderStatus));
    return orders.filter(o => o.orderStatus === key);
  }, [orders, activeFilter]);

  const filteredTables = useMemo(() => {
    if (!activeFilter || activeFilter.group !== "table" || !activeFilter.key || activeFilter.key === "all") return tables;
    return tables.filter(t => t.status === activeFilter.key);
  }, [tables, activeFilter]);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manager Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {authUser?.name || "Manager"}. Here is today's overview.</p>
        </div>
        <Badge variant="outline" className="hidden sm:flex items-center gap-1"><div className="size-2 rounded-full bg-green-500 animate-pulse" /> Live</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryKpi icon={TrendingUp} label="Today's Revenue" value={`${stats.paid.toLocaleString()} ETB`} subtext={`${stats.totalTodayOrders} orders today`} color="bg-green-500/10 text-green-600" />
        <SummaryKpi icon={ShoppingCart} label="Active Orders" value={stats.activeOrders} subtext={`${stats.newOrders} new \u00b7 ${stats.preparing} preparing`} color="bg-blue-500/10 text-blue-600" onClick={() => setActiveTab("orders")} />
        <SummaryKpi icon={Users} label="Active Tables" value={`${stats.occupiedTables}/${stats.totalTables}`} subtext={`${stats.availableTables} available`} color="bg-purple-500/10 text-purple-600" onClick={() => setActiveTab("tables")} />
        <SummaryKpi icon={AlertTriangle} label="Needs Attention" value={stats.delayed + (stats.unpaid > 0 ? 1 : 0)} subtext={stats.delayed > 0 ? `${stats.delayed} delayed` : "All clear"} color="bg-amber-500/10 text-amber-600" onClick={() => setActiveTab("orders")} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><LayoutGrid className="size-3" /> Tables</div>
        <StatusPills items={tablePills} activeFilter={activeFilter} onFilter={applyFilterToTab} />
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><ListOrdered className="size-3" /> Orders</div>
        <StatusPills items={orderPills} activeFilter={activeFilter} onFilter={applyFilterToTab} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <AlertsStrip alerts={alerts} onViewAll={() => setActiveTab("orders")} />
        <RecentActivity items={recentActivity} onViewAll={() => setActiveTab("activity")} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full overflow-x-auto scrollbar-hide lg:grid lg:grid-cols-9 lg:overflow-visible">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Today's Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-medium">{stats.paid.toLocaleString()} ETB</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Unpaid</span><span className="font-medium text-red-600">{stats.unpaid.toLocaleString()} ETB</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">New Orders</span><span className="font-medium">{stats.newOrders}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Preparing</span><span className="font-medium">{stats.preparing}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ready</span><span className="font-medium">{stats.ready}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Delayed</span><span className="font-medium text-yellow-600">{stats.delayed}</span></div>
              </CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Floor Status</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Tables</span><span className="font-medium">{stats.totalTables}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Available</span><span className="font-medium text-green-600">{stats.availableTables}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Occupied</span><span className="font-medium text-blue-600">{stats.occupiedTables}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Reserved</span><span className="font-medium text-purple-600">{tables.filter(t => t.status === "RESERVED").length}</span></div>
              </CardContent></Card>
          </div>
        </TabsContent>
        <TabsContent value="orders" className="mt-4"><ManagerLiveOrders branchId={branchId} orders={filteredOrders} title={activeFilter?.key ? `Orders: ${activeFilter.key}` : "All Active Orders"} /></TabsContent>
        <TabsContent value="tables" className="mt-4"><ManagerTableOverview branchId={branchId} tables={filteredTables} orders={orders} statusFilter={activeFilter?.key || null} /></TabsContent>
        <TabsContent value="payments" className="mt-4"><ManagerPaymentsPanel branchId={branchId} /></TabsContent>
        <TabsContent value="inventory" className="mt-4"><ManagerInventoryDashboard branchId={branchId} /></TabsContent>
        <TabsContent value="staff" className="mt-4"><ManagerStaffPanel branchId={branchId} /></TabsContent>
        <TabsContent value="feedback" className="mt-4"><ManagerComplaints branchId={branchId} /></TabsContent>
        <TabsContent value="reports" className="mt-4"><ReportsAnalytics /></TabsContent>
        <TabsContent value="activity" className="mt-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="size-4" /> All Recent Activity</CardTitle></CardHeader>
            <CardContent className="pt-0">
              {recentActivity.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p> : (
                <ul className="space-y-2">{recentActivity.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm border-b pb-2 last:border-0">
                    <div className={`size-2 rounded-full ${item.dot || "bg-muted-foreground"}`} /><span>{item.text}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{item.time}</span>
                  </li>
                ))}</ul>
              )}
            </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ManagerLive = ({ branchId }) => (
  <div className="space-y-4">
    <ManagerLiveOrders branchId={branchId} title="All Active Orders" />
    <div className="grid md:grid-cols-2 gap-4"><ManagerTableOverview branchId={branchId} /><ManagerAlerts branchId={branchId} /></div>
  </div>
);

export { ManagerOverview, ManagerLive, ManagerDashboardRealTime };
