import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useReportStore } from "@/store/useReportStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DollarSign, ShoppingCart, FileBarChart, Clock, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";

/**
 * Sales reports & analytics (manager/owner). Backed by the report endpoints.
 *  - GET /branches/:branchId/reports/sales
 *  - GET /branches/:branchId/reports/orders
 *  - GET /branches/:branchId/reports/payments
 *  - GET /branches/:branchId/reports/food
 *  - GET /branches/:branchId/reports/operations
 *  - GET /branches/:branchId/reports/inventory
 */
const ReportsAnalytics = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;
  const { sales, food, operations, inventory, isLoading, error } = useReportStore();
  const { t } = useTranslation();
  const [period, setPeriod] = useState("daily"); // daily, weekly, monthly, custom
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Compute period dates based on selection
  const periodDates = {
    daily: {
      start: new Date(new Date().setHours(0, 0, 0, 0)),
      end: new Date(),
    },
    weekly: {
      start: new Date(new Date().setDate(new Date().getDate() - 7)),
      end: new Date(),
    },
    monthly: {
      start: new Date(new Date().setDate(1)),
      end: new Date(),
    },
    custom: {
      start: startDate,
      end: endDate,
    },
  };

  useEffect(() => {
    if (!branchId) return;
    const { start, end } = periodDates[period];
    useReportStore.getState().fetchReportPeriod(branchId, { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) });
  }, [branchId, period, useReportStore.getState().fetchReportPeriod]);

  if (!branchId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You are not assigned to a branch yet.</p>
      </div>
    );
  }

  const totalRevenue = sales?.summary?.totalRevenue || 0;
  const totalOrders = sales?.summary?.paidOrderCount || 0;
  const totalTax = sales?.summary?.totalTax || 0;
  const totalService = sales?.summary?.totalServiceCharge || 0;
  const avgPrep = operations?.operations?.avgPrepTimeMinutes || 0;

  // Inventory summary
  const totalStockItems = inventory?.stockItems?.length || 0;
  const lowStockItems = inventory?.stockItems?.filter((i) => i.currentStatus === 'Low Stock').length || 0;
  const outOfStockItems = inventory?.stockItems?.filter((i) => i.currentStatus === 'Out of Stock').length || 0;
  const totalConsumed = inventory?.stockItems?.reduce((sum, i) => sum + (i.stockConsumed || 0), 0) || 0;
  const totalWastage = inventory?.stockItems?.reduce((sum, i) => sum + (i.wastage || 0), 0) || 0;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Reports & Analytics</h1>
        
        {/* Period selector */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Daily"
            value={period === "daily" ? "Daily" : period === "weekly" ? "Weekly" : period === "monthly" ? "Monthly" : "Custom"}
            onChange={(e) => setPeriod(e.target.value === "Custom" ? "custom" : e.target.value)}
            className="h-9 px-2 border rounded-md text-sm bg-background"
          />
          
          {period === 'custom' ? (
            <>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 px-2 border rounded-md text-sm bg-background w-48"
              />
              <span className="text-muted-foreground mx-2">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 px-2 border rounded-md text-sm bg-background w-48"
              />
            </>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          {/* Summary Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="size-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-lg font-bold">{totalRevenue.toLocaleString()} ETB</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="size-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Orders</p>
                    <p className="text-lg font-bold">{totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileBarChart className="size-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tax</p>
                    <p className="text-lg font-bold">{totalTax.toLocaleString()} ETB</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Truck className="size-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Kitchen</p>
                    <p className="text-lg font-bold">{Math.round(avgPrep)} min</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reports Tabs */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Sales & Orders */}
            <Card>
              <CardHeader><CardTitle>Sales</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span>Completed</span>
                  <span>{totalOrders}</span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {t('total_revenue') || 'Total Revenue'}: {totalRevenue.toLocaleString()} ETB
                </div>
              </CardContent>
            </Card>

            {/* Food / Inventory */}
            <Card>
              <CardHeader><CardTitle>Inventory</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span>Stock Items</span>
                  <span>{totalStockItems}</span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {t('low_stock') || 'Low Stock'}: {lowStockItems}{' '}{t('items') || 'items'}
                  {outOfStockItems > 0 ? `, ${t('out_of_stock') || 'Out of Stock'}: ${outOfStockItems}` : ''}
                </div>
              </CardContent>
            </Card>

            {/* Payments */}
            <Card>
              <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-1 text-sm">
                <EmptyState title={t('no_data') || 'No data'} />
              </CardContent>
            </Card>

            {/* Operations */}
            <Card>
              <CardHeader><CardTitle>Kitchen Operations</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span>Avg Prep Time</span>
                  <span>{Number(avgPrep).toFixed(1)} min</span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {t('completed_orders') || 'Completed Orders'}: {operations?.operations?.completedOrdersAnalyzed || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsAnalytics;