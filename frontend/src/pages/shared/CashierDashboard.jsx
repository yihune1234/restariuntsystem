import React, { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrderStore } from "@/store/useOrderStore";
import { usePaymentStore } from "@/store/usePaymentStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { OrderStatusBadge, SecurityCode } from "./StatusBadge";
import { PAYMENT_META } from "./status-meta";
import {
  DollarSign, CreditCard, Clock, CheckCircle2, XCircle,
  Wallet, Smartphone, Landmark, ArrowUpRight, RefreshCw,
  Search, TrendingUp, AlertTriangle, Receipt,
} from "lucide-react";

const PAYMENT_ICONS = {
  CASH: Wallet,
  CARD: CreditCard,
  CHAPA: Smartphone,
  TELEBIRR: Smartphone,
  BANK_TRANSFER: Landmark,
};

const PaymentStatusFilter = ({ active, onChange }) => {
  const filters = [
    { key: "ALL", label: "All" },
    { key: "UNPAID", label: "Unpaid" },
    { key: "PENDING", label: "Pending" },
    { key: "PAID", label: "Paid" },
    { key: "REFUNDED", label: "Refunded" },
    { key: "FAILED", label: "Failed" },
  ];
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            active === f.key
              ? "bg-amber-500 text-white shadow"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
};

const CashierDashboard = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;
  const { orders, getBranchOrders, isLoading, setupSocketListeners, cleanupSocketListeners } = useOrderStore();
  const { fetchTransactions } = usePaymentStore();

  const [statsLoading, setStatsLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    if (!branchId) return;
    setStatsLoading(true);
    await Promise.all([
      getBranchOrders(branchId, { limit: 50 }),
      fetchTransactions(branchId).then(setTransactions),
    ]);
    setStatsLoading(false);
  }, [branchId, getBranchOrders, fetchTransactions]);

  useEffect(() => {
    loadData();
    setupSocketListeners();
    return cleanupSocketListeners;
  }, [loadData, setupSocketListeners, cleanupSocketListeners]);

  const filteredOrders = orders.filter((o) => {
    if (paymentFilter !== "ALL" && o.paymentStatus !== paymentFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNumber = (o.orderNumber || o._id || "").toLowerCase().includes(q);
      const matchTable = o.tableId?.tableNumber?.toString().includes(q);
      const matchCustomer = (o.customerName || "").toLowerCase().includes(q);
      if (!matchNumber && !matchTable && !matchCustomer) return false;
    }
    return true;
  });

  const stats = {
    totalRevenue: orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + (o.total || 0), 0),
    paidCount: orders.filter((o) => o.paymentStatus === "PAID").length,
    unpaidCount: orders.filter((o) => o.paymentStatus === "UNPAID").length,
    pendingCount: orders.filter((o) => o.paymentStatus === "PENDING").length,
    refundedCount: orders.filter((o) => o.paymentStatus === "REFUNDED").length,
    failedCount: orders.filter((o) => o.paymentStatus === "FAILED").length,
    totalOrders: orders.length,
  };

  const paymentBreakdown = transactions.reduce((acc, t) => {
    const method = t.provider || "UNKNOWN";
    acc[method] = (acc[method] || 0) + (t.totalAmount || 0);
    return acc;
  }, {});

  const statCards = [
    {
      label: "Today's Revenue",
      value: `${stats.totalRevenue.toLocaleString()} ETB`,
      icon: DollarSign,
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      textColor: "text-green-600 dark:text-green-400",
    },
    {
      label: "Paid Orders",
      value: stats.paidCount,
      icon: CheckCircle2,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      textColor: "text-blue-600 dark:text-blue-400",
      sub: `${stats.paidCount}/${stats.totalOrders} orders`,
    },
    {
      label: "Unpaid",
      value: stats.unpaidCount,
      icon: Clock,
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      textColor: "text-amber-600 dark:text-amber-400",
      badge: stats.unpaidCount > 0 ? `${stats.unpaidCount} need payment` : null,
    },
    {
      label: "Pending",
      value: stats.pendingCount,
      icon: ArrowUpRight,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      textColor: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Refunds",
      value: stats.refundedCount,
      icon: Receipt,
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      textColor: "text-red-600 dark:text-red-400",
    },
    {
      label: "Failed",
      value: stats.failedCount,
      icon: XCircle,
      color: "from-gray-500 to-gray-600",
      bgColor: "bg-gray-50 dark:bg-gray-800",
      textColor: "text-gray-600 dark:text-gray-400",
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cashier Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back, {authUser?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={statsLoading}>
            <RefreshCw className={`size-4 mr-1 ${statsLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {branchId && <Badge variant="outline" className="hidden sm:inline-flex">Branch active</Badge>}
        </div>
      </div>

      {/* Stats Cards */}
      {statsLoading && orders.length === 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {statCards.map((s) => (
              <Card key={s.label} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className={`size-10 rounded-xl ${s.bgColor} flex items-center justify-center mb-3`}>
                    <s.icon className={`size-5 ${s.textColor}`} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{s.value}</p>
                  {s.sub && <p className="text-[10px] text-gray-400 mt-1">{s.sub}</p>}
                  {s.badge && (
                    <Badge className="mt-2 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-[10px] px-1.5 py-0.5">
                      {s.badge}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payment Method Breakdown */}
          {Object.keys(paymentBreakdown).length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Revenue by Payment Method</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Object.entries(paymentBreakdown).map(([method, amount]) => {
                    const Icon = PAYMENT_ICONS[method] || CreditCard;
                    return (
                      <div key={method} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Icon className="size-4 text-gray-500" />
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">{method}</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{amount.toLocaleString()} ETB</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Orders Section */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Orders</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search order, table, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 w-48 sm:w-64 text-sm"
              />
            </div>
          </div>
        </div>

        <PaymentStatusFilter active={paymentFilter} onChange={setPaymentFilter} />

        <div className="mt-4 space-y-2">
          {isLoading && orders.length === 0 ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="size-10 mx-auto mb-3 text-amber-400" />
                <p className="text-gray-600 dark:text-gray-400">
                  {searchQuery || paymentFilter !== "ALL"
                    ? "No orders match your filters"
                    : "No orders yet today"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.slice(0, 20).map((o) => (
              <Card key={o._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-11 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">#{o.orderNumber || o._id?.slice(-4)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {o.tableId ? `Table ${o.tableId.tableNumber}` : "No Table"}
                        </p>
                        <Badge className="text-[10px] px-1.5 py-0" variant="outline">{o.source}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {o.customerName || "Guest"} • {new Date(o.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {(o.total || 0).toLocaleString()} ETB
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {o.items?.length || 0} item{(o.items?.length || 0) !== 1 ? "s" : ""}
                      </p>
                      <div className="flex flex-col items-end gap-0.5 mt-1">
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{o.paymentDetails?.provider || o.paymentMethod || "UNKNOWN"}</Badge>
                        <span className="text-[9px] text-gray-400">{o.cashier?.name || o.createdBy?.name || "Self Service"}</span>
                      </div>
                    </div>
                    <OrderStatusBadge status={o.orderStatus} paymentStatus={o.paymentStatus} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CashierDashboard;
