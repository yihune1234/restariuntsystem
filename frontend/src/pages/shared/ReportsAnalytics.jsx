import React, { useEffect, useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import {
  DollarSign,
  ShoppingCart,
  FileBarChart,
  Clock,
  TrendingUp,
  CreditCard,
  Utensils,
} from "lucide-react";

const ReportsAnalytics = () => {
  const { sales, orders, payments, food, isLoading, fetchSalesReport, fetchOrdersReport, fetchPaymentsReport, fetchFoodReport } = useReportStore();
  const { t } = useTranslation();
  const [period, setPeriod] = useState("daily");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const loadReports = async () => {
    const params = { startDate, endDate };
    await Promise.all([
      fetchSalesReport(params),
      fetchOrdersReport(params),
      fetchPaymentsReport(params),
      fetchFoodReport(params),
    ]);
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handlePeriodChange = (p) => {
    setPeriod(p);
    if (p !== "custom") {
      const end = new Date();
      let start = new Date();
      if (p === "daily") start = new Date(end.setHours(0, 0, 0, 0));
      else if (p === "weekly") { start = new Date(); start.setDate(start.getDate() - 7); }
      else if (p === "monthly") { start = new Date(); start.setDate(1); }
      setStartDate(start.toISOString().slice(0, 10));
      setEndDate(new Date().toISOString().slice(0, 10));
    }
  };

  const handleApply = () => {
    setPeriod("custom");
    loadReports();
  };

  const totalRevenue = sales?.summary?.totalRevenue || 0;
  const totalOrders = sales?.summary?.paidOrderCount || 0;
  const totalTax = sales?.summary?.totalTax || 0;
  const totalService = sales?.summary?.totalServiceCharge || 0;

  const cashRevenue = payments?.summary?.cashTotal || 0;
  const cardRevenue = payments?.summary?.cardTotal || 0;
  const digitalRevenue = payments?.summary?.digitalTotal || 0;

  const topFoods = food?.topItems?.slice(0, 5) || [];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">Reports & Analytics</h1>

        <div className="flex items-center gap-2 flex-wrap">
          {["daily", "weekly", "monthly", "custom"].map((p) => (
            <Badge
              key={p}
              variant={period === p ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => p !== "custom" ? handlePeriodChange(p) : setPeriod("custom")}
            >
              {p}
            </Badge>
          ))}
          {period === "custom" && (
            <>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 w-36 text-sm"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 w-36 text-sm"
              />
              <Button size="sm" onClick={handleApply}>Apply</Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="size-5 text-green-600" />
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
                  <ShoppingCart className="size-5 text-blue-600" />
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
                  <FileBarChart className="size-5 text-purple-600" />
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
                  <TrendingUp className="size-5 text-orange-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Service</p>
                    <p className="text-lg font-bold">{totalService.toLocaleString()} ETB</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><DollarSign className="size-4 text-green-600" /> Cash</div>
                  <span className="font-bold">{cashRevenue.toLocaleString()} ETB</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><CreditCard className="size-4 text-blue-600" /> Card</div>
                  <span className="font-bold">{cardRevenue.toLocaleString()} ETB</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><Utensils className="size-4 text-purple-600" /> Digital</div>
                  <span className="font-bold">{digitalRevenue.toLocaleString()} ETB</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Top Selling Items</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-1">
                {topFoods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data available</p>
                ) : (
                  topFoods.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate">{item.name || item.foodItemId}</span>
                      <span className="font-medium">{item.quantitySold || item.count || 0} sold</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium">{orders?.summary?.completedOrders || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cancelled</span>
                  <span className="font-medium">{orders?.summary?.cancelledOrders || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg Order Value</span>
                  <span className="font-medium">
                    {totalOrders > 0 ? (totalRevenue / totalOrders).toLocaleString() : 0} ETB
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Date Range</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-medium">{startDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-medium">{endDate}</span>
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
