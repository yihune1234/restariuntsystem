import { useEffect } from "react";
import useDashboardStore from "@/store/useDashboardStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendingUp, TrendingDown } from "lucide-react";

const OwnerRevenueAnalytics = () => {
  const { dashboardData, fetchDashboardSummary, isLoading } = useDashboardStore();

  useEffect(() => {
    fetchDashboardSummary();
  }, [fetchDashboardSummary]);

  const branches = dashboardData?.branchPerformance || [];
  const topBranch = branches.length > 0 ? branches.reduce((a, b) => (a.totalRevenue > b.totalRevenue ? a : b)) : null;
  const lowestBranch = branches.length > 0 ? branches.reduce((a, b) => (a.totalRevenue < b.totalRevenue ? a : b)) : null;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5 text-green-500" />
              Top Performing Branch
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20" />
            ) : topBranch ? (
              <div>
                <p className="text-2xl font-bold">Branch {topBranch._id?.slice(-6)}</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {(topBranch.totalRevenue || 0).toLocaleString()} ETB
                </p>
                <p className="text-sm text-muted-foreground mt-1">{topBranch.orderCount || 0} orders</p>
              </div>
            ) : (
              <EmptyState title="No data" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="size-5 text-red-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20" />
            ) : lowestBranch ? (
              <div>
                <p className="text-2xl font-bold">Branch {lowestBranch._id?.slice(-6)}</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {(lowestBranch.totalRevenue || 0).toLocaleString()} ETB
                </p>
                <p className="text-sm text-muted-foreground mt-1">{lowestBranch.orderCount || 0} orders</p>
              </div>
            ) : (
              <EmptyState title="No data" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branch Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-60" />
          ) : branches.length > 0 ? (
            <div className="space-y-3">
              {branches.map((branch) => {
                const maxRevenue = Math.max(...branches.map((b) => b.totalRevenue || 0));
                const width = maxRevenue > 0 ? ((branch.totalRevenue || 0) / maxRevenue) * 100 : 0;
                return (
                  <div key={branch._id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Branch {branch._id?.slice(-6)}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">{branch.orderCount || 0} orders</span>
                        <span className="font-bold">{(branch.totalRevenue || 0).toLocaleString()} ETB</span>
                      </div>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${branch === topBranch ? "bg-green-500" : "bg-primary"}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No branch data" />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerRevenueAnalytics;
