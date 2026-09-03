import { useEffect } from "react";
import useDashboardStore from "@/store/useDashboardStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "./KpiCard";
import {
  Building2,
  DollarSign,
  ShoppingCart,
  Layers,
} from "lucide-react";

const OwnerFinancialOverview = () => {
  const { dashboardData, fetchDashboardSummary, isLoading } = useDashboardStore();

  useEffect(() => {
    fetchDashboardSummary();
  }, [fetchDashboardSummary]);

  const overview = dashboardData?.overview || {};
  const totalRevenue = overview.totalLifetimeRevenue || 0;
  const totalOrders = overview.totalPaidOrders || 0;
  const totalBranches = dashboardData?.totalBranches || 0;
  const avgPerBranch = totalBranches > 0 ? Math.round(totalOrders / totalBranches) : 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Lifetime Revenue"
          value={`${totalRevenue.toLocaleString()} ETB`}
          iconBg="bg-green-500/10"
        />
        <KpiCard
          icon={ShoppingCart}
          label="Total Orders"
          value={totalOrders.toLocaleString()}
          iconBg="bg-blue-500/10"
        />
        <KpiCard
          icon={Building2}
          label="Active Branches"
          value={totalBranches}
          iconBg="bg-purple-500/10"
        />
        <KpiCard
          icon={Layers}
          label="Avg Order Value"
          value={`${avgOrderValue.toLocaleString()} ETB`}
          iconBg="bg-amber-500/10"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Branch</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40" />
            ) : dashboardData?.branchPerformance?.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.branchPerformance.map((branch) => {
                  const branchRevenue = branch.totalRevenue || 0;
                  const percentage = totalRevenue > 0 ? ((branchRevenue / totalRevenue) * 100).toFixed(1) : 0;
                  return (
                    <div key={branch._id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Branch {branch._id?.slice(-6)}</span>
                        <span className="font-bold">{branchRevenue.toLocaleString()} ETB</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{branch.orderCount || 0} orders ({percentage}%)</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No data" description="Branch revenue will appear here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg per Branch</span>
                <span className="font-bold">{avgPerBranch} orders</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Order Value</span>
                <span className="font-bold">{avgOrderValue.toLocaleString()} ETB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Branches</span>
                <span className="font-bold">{totalBranches}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Revenue</span>
                <span className="font-bold text-green-600">{totalRevenue.toLocaleString()} ETB</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branch Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40" />
          ) : dashboardData?.branchPerformance?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Branch</th>
                    <th className="text-right py-2 px-2">Orders</th>
                    <th className="text-right py-2 px-2">Revenue</th>
                    <th className="text-right py-2 px-2">Avg/Order</th>
                    <th className="text-right py-2 px-2">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.branchPerformance.map((branch) => {
                    const rev = branch.totalRevenue || 0;
                    const count = branch.orderCount || 0;
                    const avg = count > 0 ? Math.round(rev / count) : 0;
                    const share = totalRevenue > 0 ? ((rev / totalRevenue) * 100).toFixed(1) : 0;
                    return (
                      <tr key={branch._id} className="border-b">
                        <td className="py-2 px-2 font-medium">Branch {branch._id?.slice(-6)}</td>
                        <td className="text-right py-2 px-2">{count}</td>
                        <td className="text-right py-2 px-2 font-bold">{rev.toLocaleString()} ETB</td>
                        <td className="text-right py-2 px-2">{avg.toLocaleString()} ETB</td>
                        <td className="text-right py-2 px-2">
                          <Badge variant="outline">{share}%</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No branch data" description="No branch performance data available." />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerFinancialOverview;
