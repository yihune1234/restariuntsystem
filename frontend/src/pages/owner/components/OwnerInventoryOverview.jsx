import { useEffect, useState, useMemo } from "react";
import { useReportStore } from "@/store/useReportStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  DollarSign,
  Boxes,
  RefreshCw,
  History,
} from "lucide-react";

const STATUS_CONFIG = {
  "In Stock": { color: "bg-green-500", textColor: "text-green-600" },
  "Low Stock": { color: "bg-yellow-500", textColor: "text-yellow-600" },
  "Out of Stock": { color: "bg-red-500", textColor: "text-red-600" },
};

const OwnerInventoryOverview = () => {
  const { organizationInventory: ownerInventory, fetchOrganizationInventoryOverview, isLoading } = useReportStore();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchOrganizationInventoryOverview();
  }, [fetchOrganizationInventoryOverview]);

  const stockItems = ownerInventory?.stockItems || [];

  const stats = useMemo(() => {
    const totalItems = stockItems.length;
    const inStock = stockItems.filter((i) => i.currentStatus === "In Stock").length;
    const lowStock = stockItems.filter((i) => i.currentStatus === "Low Stock").length;
    const outOfStock = stockItems.filter((i) => i.currentStatus === "Out of Stock").length;
    const totalValue = stockItems.reduce((sum, item) => {
      const qty = item.currentStock || 0;
      const unitCost = item.unitCost || 100;
      return sum + qty * unitCost;
    }, 0);

    return { totalItems, inStock, lowStock, outOfStock, totalValue };
  }, [stockItems]);

  if (isLoading && stockItems.length === 0) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Boxes className="size-5" />
            Inventory Overview
          </h1>
          <p className="text-sm text-muted-foreground">Current stock status and costs</p>
        </div>
        <button
          onClick={() => { fetchOrganizationInventoryOverview(); setRefreshKey(k => k + 1); }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="size-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Package className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-xl font-bold">{stats.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">In Stock</p>
                <p className="text-xl font-bold text-green-600">{stats.inStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                <TrendingDown className="size-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-xl font-bold text-yellow-600">{stats.lowStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Out of Stock</p>
                <p className="text-xl font-bold text-red-600">{stats.outOfStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <DollarSign className="size-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">{stats.totalValue.toLocaleString()} ETB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="size-4 text-yellow-600" />
              Needs Attention ({stats.lowStock + stats.outOfStock})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.lowStock + stats.outOfStock === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="size-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All items well stocked</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stockItems
                  .filter((i) => i.currentStatus !== "In Stock")
                  .slice(0, 10)
                  .map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium truncate">{item.foodName || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {item.currentStock || 0} / {item.preparedQuantity || 0}
                        </p>
                      </div>
                      <Badge
                        variant={item.currentStatus === "Out of Stock" ? "destructive" : "secondary"}
                      >
                        {item.currentStatus === "Out of Stock" ? "Out" : "Low"}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="size-4" />
              Inventory Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                <span className="text-sm">Stock Health</span>
                <span className="font-bold text-green-600">
                  {stats.totalItems > 0
                    ? Math.round((stats.inStock / stats.totalItems) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                <span className="text-sm">Low Stock Items</span>
                <span className="font-bold text-yellow-600">{stats.lowStock}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                <span className="text-sm">Out of Stock</span>
                <span className="font-bold text-red-600">{stats.outOfStock}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                <span className="text-sm">Total Value</span>
                <span className="font-bold text-purple-600">
                  {stats.totalValue.toLocaleString()} ETB
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">All Items</CardTitle>
        </CardHeader>
        <CardContent>
          {stockItems.length === 0 ? (
            <EmptyState title="No items" description="No inventory items found." icon={Package} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Item</th>
                    <th className="py-2 pr-4">Current Stock</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {stockItems.map((item, i) => {
                    const statusConfig = STATUS_CONFIG[item.currentStatus] || STATUS_CONFIG["In Stock"];
                    const qty = item.currentStock || 0;
                    const unitCost = item.unitCost || 100;
                    const value = qty * unitCost;

                    return (
                      <tr key={i} className="border-b hover:bg-muted/50">
                        <td className="py-2 pr-4 font-medium">{item.foodName || "—"}</td>
                        <td className="py-2 pr-4">
                          {qty} / {item.preparedQuantity || 0}
                        </td>
                        <td className="py-2 pr-4">
                          <Badge className={`${statusConfig.color} text-white`}>
                            {item.currentStatus || "Unknown"}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 text-right font-medium">
                          {value.toLocaleString()} ETB
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerInventoryOverview;
