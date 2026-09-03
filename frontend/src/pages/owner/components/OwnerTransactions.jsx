import { useEffect, useState } from "react";
import { useOrderStore } from "@/store/useOrderStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "./KpiCard";
import {
  DollarSign,
  ShoppingCart,
  XCircle,
  Receipt,
  Wallet,
} from "lucide-react";

const OwnerTransactions = () => {
  const { orders, getOrgOrders, isLoading } = useOrderStore();
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    getOrgOrders({ limit: 200 });
  }, [getOrgOrders]);

  const filteredOrders = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "completed") return o.status !== "CANCELLED";
    if (filter === "cancelled") return o.status === "CANCELLED";
    if (filter === "paid") return o.paymentStatus === "COMPLETED";
    if (filter === "unpaid") return o.paymentStatus === "UNPAID" || o.paymentStatus === "PENDING";
    return true;
  });

  const totalRevenue = filteredOrders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const totalTax = filteredOrders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
  const completedCount = filteredOrders.filter((o) => o.status !== "CANCELLED").length;
  const cancelledCount = filteredOrders.filter((o) => o.status === "CANCELLED").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={Receipt}
          label="Filtered Orders"
          value={filteredOrders.length}
        />
        <KpiCard
          icon={DollarSign}
          label="Total Revenue"
          value={`${totalRevenue.toLocaleString()} ETB`}
          iconBg="bg-green-500/10"
        />
        <KpiCard
          icon={Wallet}
          label="Tax Collected"
          value={`${totalTax.toLocaleString()} ETB`}
          iconBg="bg-blue-500/10"
        />
        <KpiCard
          icon={ShoppingCart}
          label="Completed"
          value={completedCount}
          iconBg="bg-green-500/10"
        />
        <KpiCard
          icon={XCircle}
          label="Cancelled"
          value={cancelledCount}
          iconBg="bg-red-500/10"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Transactions</CardTitle>
            <div className="flex gap-2">
              {["all", "completed", "cancelled", "paid", "unpaid"].map((f) => (
                <Badge
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => setFilter(f)}
                >
                  {f}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-60" />
          ) : filteredOrders.length === 0 ? (
            <EmptyState title="No transactions" description="Transactions will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Order ID</th>
                    <th className="text-left py-2 px-2">Branch</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Payment</th>
                    <th className="text-right py-2 px-2">Total</th>
                    <th className="text-right py-2 px-2">Tax</th>
                    <th className="text-right py-2 px-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.slice(0, 50).map((order) => (
                    <tr key={order._id} className="border-b">
                      <td className="py-2 px-2 font-medium">#{order.orderNumber || order._id?.slice(-6)}</td>
                      <td className="py-2 px-2">{order.branchId?.slice(-6) || "—"}</td>
                      <td className="py-2 px-2">
                        <Badge variant={order.status === "CANCELLED" ? "destructive" : "default"}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline">{order.paymentStatus}</Badge>
                      </td>
                      <td className="text-right py-2 px-2 font-bold">
                        {(order.total || 0).toLocaleString()} ETB
                      </td>
                      <td className="text-right py-2 px-2">{(order.taxAmount || 0).toLocaleString()}</td>
                      <td className="text-right py-2 px-2 text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerTransactions;
