import { useEffect } from "react";
import { useReportStore } from "@/store/useReportStore";

const OwnerCrossBranchAnalysis = () => {
  const { fetchBranchComparisonReport } = useReportStore();

  useEffect(() => {
    fetchBranchComparisonReport();
  }, [fetchBranchComparisonReport]);

  const comparison = Array.isArray(useReportStore.getState().comparison)
    ? useReportStore.getState().comparison
    : [];
  const wastageMap = useReportStore.getState().wastageMap || {};
  const lowStockMap = useReportStore.getState().lowStockMap || {};

  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-xl font-bold mb-4">Cross-Branch Analysis</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-muted-foreground">
          <thead>
            <tr>
              <th>Branch</th>
              <th>Orders</th>
              <th>Revenue</th>
              <th>Wastage</th>
              <th>Low Stock</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((branch, i) => {
              const branchName = branch._id ? `Branch ${branch._id?.slice(-6)}` : `Branch ${i + 1}`;
              const revenue = branch.totalRevenue ? branch.totalRevenue.toLocaleString() : "0";
              const wastage = wastageMap[branch._id?.toString()] || 0;
              const lowStock = lowStockMap[branch._id?.toString()] || 0;
              return (
                <tr key={i} className="border-b">
                  <td className="font-medium">{branchName}</td>
                  <td>{branch.orderCount || 0}</td>
                  <td>{revenue} ETB</td>
                  <td>{wastage}</td>
                  <td>{lowStock}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OwnerCrossBranchAnalysis;
