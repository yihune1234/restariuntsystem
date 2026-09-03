import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import useDashboardStore from "@/store/useDashboardStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  DollarSign,
  ShoppingCart,
  Layers,
  UserRound,
  AlertCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  CreditCard,
  Banknote,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Utensils,
  QrCode,
  Users,
  PieChart,
  BarChart3,
  Shield,
  Lock,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";

const KpiCard = ({ icon: Icon, label, value, trend, trendLabel, iconBg = "bg-primary/10", className = "" }) => (
  <Card className={className}>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-lg ${iconBg} text-primary flex items-center justify-center`}>
          <Icon className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold truncate">{value}</p>
        </div>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
            {trend >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      {trendLabel && <p className="text-xs text-muted-foreground mt-1">{trendLabel}</p>}
    </CardContent>
  </Card>
);

const RealtimeKPIs = ({ kpis, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (!kpis) return null;

  const { revenue, orders, tables } = kpis;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Today's Revenue"
          value={`${(revenue?.total || 0).toLocaleString()} ETB`}
          iconBg="bg-green-500/10"
          className="col-span-2"
        />
        <KpiCard
          icon={Receipt}
          label="Total Orders"
          value={orders?.total || 0}
          iconBg="bg-blue-500/10"
        />
        <KpiCard
          icon={Layers}
          label="Avg Order Value"
          value={`${Math.round(orders?.averageValue || 0).toLocaleString()} ETB`}
          iconBg="bg-amber-500/10"
        />
        <KpiCard
          icon={Building2}
          label="Active Tables"
          value={`${tables?.occupied || 0}/${tables?.total || 0}`}
          iconBg="bg-purple-500/10"
        />
        <KpiCard
          icon={AlertCircle}
          label="Unpaid Bills"
          value={`${(revenue?.unpaid || 0).toLocaleString()} ETB`}
          iconBg="bg-red-500/10"
        />
        <KpiCard
          icon={CheckCircle}
          label="Completed"
          value={orders?.completed || 0}
          iconBg="bg-green-500/10"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={Clock}
          label="Preparing"
          value={orders?.preparing || 0}
          iconBg="bg-yellow-500/10"
        />
        <KpiCard
          icon={Utensils}
          label="Ready to Serve"
          value={orders?.ready || 0}
          iconBg="bg-orange-500/10"
        />
        <KpiCard
          icon={XCircle}
          label="Cancelled"
          value={orders?.cancelled || 0}
          iconBg="bg-red-500/10"
        />
        <KpiCard
          icon={Wallet}
          label="Discounts"
          value={`${(revenue?.discount || 0).toLocaleString()} ETB`}
          iconBg="bg-pink-500/10"
        />
        <KpiCard
          icon={TrendingDown}
          label="Refunds"
          value={`${(revenue?.refund || 0).toLocaleString()} ETB`}
          iconBg="bg-red-500/10"
        />
      </div>
    </div>
  );
};

const FinancialBreakdown = ({ kpis, isLoading }) => {
  if (isLoading) return <Skeleton className="h-60" />;
  if (!kpis) return null;

  const { revenue, sourceBreakdown, paymentBreakdown } = kpis;

  const sourceData = sourceBreakdown ? Object.entries(sourceBreakdown) : [];
  const paymentData = paymentBreakdown ? Object.entries(paymentBreakdown) : [];

  const totalSourceRevenue = sourceData.reduce((sum, [, data]) => sum + (data?.revenue || 0), 0);
  const totalPaymentAmount = paymentData.reduce((sum, [, data]) => sum + (data?.amount || 0), 0);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="size-5" />
            Orders by Source
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sourceData.length > 0 ? (
            <div className="space-y-4">
              {sourceData.map(([source, data]) => {
                const percentage = totalSourceRevenue > 0 ? ((data?.revenue || 0) / totalSourceRevenue * 100).toFixed(1) : 0;
                return (
                  <div key={source} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{source}</span>
                      <span className="text-sm text-muted-foreground">
                        {data?.count || 0} orders · {(data?.revenue || 0).toLocaleString()} ETB
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{percentage}%</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No data" description="Order source breakdown will appear here." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            Payments by Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentData.length > 0 ? (
            <div className="space-y-4">
              {paymentData.map(([method, data]) => {
                const percentage = totalPaymentAmount > 0 ? ((data?.amount || 0) / totalPaymentAmount * 100).toFixed(1) : 0;
                return (
                  <div key={method} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium flex items-center gap-2">
                        {method === 'Cash' && <Banknote className="size-4" />}
                        {method === 'Card' && <CreditCard className="size-4" />}
                        {method === 'Digital' && <PieChart className="size-4" />}
                        {method}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {data?.count || 0} transactions · {(data?.amount || 0).toLocaleString()} ETB
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{percentage}%</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No data" description="Payment method breakdown will appear here." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Gross Revenue</span>
              <span className="font-bold">{(revenue?.gross || 0).toLocaleString()} ETB</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Discounts</span>
              <span className="font-bold text-red-500">-{(revenue?.discount || 0).toLocaleString()} ETB</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Refunds</span>
              <span className="font-bold text-red-500">-{(revenue?.refund || 0).toLocaleString()} ETB</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Unpaid</span>
              <span className="font-bold text-yellow-500">{(revenue?.unpaid || 0).toLocaleString()} ETB</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-semibold">Net Revenue</span>
              <span className="font-bold text-green-600">{(revenue?.net || 0).toLocaleString()} ETB</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground flex items-center gap-2">
                <div className="size-2 rounded-full bg-yellow-500" /> Preparing
              </span>
              <span className="font-bold">{kpis?.orders?.preparing || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground flex items-center gap-2">
                <div className="size-2 rounded-full bg-orange-500" /> Ready
              </span>
              <span className="font-bold">{kpis?.orders?.ready || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground flex items-center gap-2">
                <div className="size-2 rounded-full bg-green-500" /> Completed
              </span>
              <span className="font-bold">{kpis?.orders?.completed || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground flex items-center gap-2">
                <div className="size-2 rounded-full bg-red-500" /> Cancelled
              </span>
              <span className="font-bold">{kpis?.orders?.cancelled || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground flex items-center gap-2">
                <div className="size-2 rounded-full bg-yellow-500" /> Unpaid
              </span>
              <span className="font-bold text-yellow-500">{kpis?.orders?.unpaid || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const FraudAlertsPanel = ({ alerts, isLoading }) => {
  if (isLoading) return <Skeleton className="h-40" />;

  const highSeverity = alerts?.bySeverity?.HIGH || [];
  const mediumSeverity = alerts?.bySeverity?.MEDIUM || [];

  if (highSeverity.length === 0 && mediumSeverity.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Shield className="size-5" />
            Security Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-green-600">
            <CheckCircle className="size-8" />
            <div>
              <p className="font-semibold">No suspicious activity detected</p>
              <p className="text-sm text-muted-foreground">All systems operating normally</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="size-5" />
          Suspicious Activity ({highSeverity.length + mediumSeverity.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {highSeverity.slice(0, 3).map((alert, i) => (
            <div key={`high-${i}`} className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {alert.employeeName} · {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {mediumSeverity.slice(0, 3).map((alert, i) => (
            <div key={`med-${i}`} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {alert.employeeName || 'System'} · {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const TableOverview = ({ kpis }) => {
  if (!kpis?.tables) return null;

  const { total, occupied, available, reserved } = kpis.tables;
  const occupancyRate = total > 0 ? ((occupied / total) * 100).toFixed(1) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5" />
          Table Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Occupancy Rate</span>
            <span className="text-2xl font-bold">{occupancyRate}%</span>
          </div>
          <Progress value={occupancyRate} className="h-3" />
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{occupied}</p>
              <p className="text-xs text-muted-foreground">Occupied</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-400">{available}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{reserved}</p>
              <p className="text-xs text-muted-foreground">Reserved</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const OwnerDashboardRealtime = () => {
  const { authUser } = useAuthStore();
  const { ownerKPIs, fraudAlerts, isLoading, fetchOwnerKPIs, fetchFraudAlerts } = useDashboardStore();
  const [selectedBranch, setSelectedBranch] = useState(null);

  useEffect(() => {
    // Single-branch mode: auto-resolve organization
    fetchOwnerKPIs(null, selectedBranch);
    if (selectedBranch) {
      fetchFraudAlerts(selectedBranch);
    }
  }, [selectedBranch, fetchOwnerKPIs, fetchFraudAlerts]);

  const branches = ownerKPIs?.branches || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Real-Time Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {ownerKPIs?.businessDate} · Last updated: {ownerKPIs?.timestamp ? new Date(ownerKPIs.timestamp).toLocaleTimeString() : 'N/A'}
          </p>
        </div>
        {branches.length > 0 && (
          <select
            className="h-10 rounded-md border bg-transparent px-3 text-sm"
            value={selectedBranch || ""}
            onChange={(e) => setSelectedBranch(e.target.value || null)}
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      <RealtimeKPIs kpis={ownerKPIs?.kpis} isLoading={isLoading} />

      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="financial">
          <FinancialBreakdown kpis={ownerKPIs?.kpis} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="tables">
          <div className="grid md:grid-cols-2 gap-6">
            <TableOverview kpis={ownerKPIs?.kpis} />
            <Card>
              <CardHeader>
                <CardTitle>Table Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ownerKPIs?.kpis?.tables && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Occupied</span>
                        <span>{ownerKPIs.kpis.tables.occupied} tables</span>
                      </div>
                      <Progress 
                        value={(ownerKPIs.kpis.tables.occupied / ownerKPIs.kpis.tables.total) * 100} 
                        className="h-4"
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5" />
                Fraud Detection & Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Monitoring for suspicious activities including excessive cancellations, high discounts, 
                refund abuse, and unusual patterns. Alerts are generated automatically when thresholds are exceeded.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <FraudAlertsPanel alerts={fraudAlerts} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
};