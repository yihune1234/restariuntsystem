import React, { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrderStore } from "@/store/useOrderStore";
import { usePaymentStore } from "@/store/usePaymentStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { OrderStatusBadge } from "./StatusBadge";
import { DollarSign, CreditCard, Clock, CheckCircle2, RefreshCw, Search } from "lucide-react";

const CashierDashboard = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;
  const { orders, getBranchOrders, isLoading, setupSocketListeners, cleanupSocketListeners } = useOrderStore();
  const { fetchTransactions } = usePaymentStore();

  const [statsLoading, setStatsLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

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
    totalOrders: orders.length,
  };

  const paymentBreakdown = transactions.reduce((acc, t) => {
    const method = t.provider || "UNKNOWN";
    acc[method] = (acc[method] || 0) + (t.totalAmount || 0);
    return acc;
  }, {});

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cashier Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome, {authUser?.name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={statsLoading}>
          <RefreshCw className={`size-4 mr-1 ${statsLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <DollarSign className="size-6 mx-auto mb-2 text-green-600" />
            <p className="text-3xl font-bold text-green-700">{stats.totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-green-600">Revenue (ETB)</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="size-6 mx-auto mb-2 text-blue-600" />
            <p className="text-3xl font-bold text-blue-700">{stats.paidCount}</p>
            <p className="text-sm text-blue-600">Paid Orders</p>
          </CardContent>
        </Card>
        <Card className={`${stats.unpaidCount > 0 ? "bg-amber-50 border-amber-200" : ""}`}>
          <CardContent className="p-4 text-center">
            <Clock className="size-6 mx-auto mb-2 text-amber-600" />
            <p className="text-3xl font-bold text-amber-700">{stats.unpaidCount}</p>
            <p className="text-sm text-amber-600">Unpaid</p>
          </CardContent>
        </Card>
        <Card className="bg-muted">
          <CardContent className="p-4 text-center">
            <CreditCard className="size-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-3xl font-bold">{stats.totalOrders}</p>
            <p className="text-sm text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
      </div>

      {Object.keys(paymentBreakdown).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Revenue by Payment Method</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {Object.entries(paymentBreakdown).map(([method, amount]) => (
                <div key={method} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <CreditCard className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">{method}</p>
                    <p className="font-bold">{amount.toLocaleString()} ETB</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-bold">Orders</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 w-48"
              />
            </div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="ALL">All Status</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {isLoading && orders.length === 0 ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)
          ) : filteredOrders.length === 0 ? (
            <EmptyState title="No orders" description="No orders match your filters" />
          ) : (
            filteredOrders.slice(0, 20).map((o) => (
              <Card key={o._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-muted flex items-center justify-center">
                      <span className="font-bold">#{o.orderNumber?.slice(-6) || o._id?.slice(-6)}</span>
                    </div>
                    <div>
                      <p className="font-medium">{o.tableId ? `Table ${o.tableId.tableNumber}` : "No Table"}</p>
                      <p className="text-sm text-muted-foreground">{o.customerName || "Guest"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <OrderStatusBadge status={o.orderStatus} paymentStatus={o.paymentStatus} />
                    <p className="text-lg font-bold">{(o.total || 0).toLocaleString()} ETB</p>
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
