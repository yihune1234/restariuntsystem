import { useEffect, useState } from "react";
import { useOrderStore } from "@/store/useOrderStore";
import { useReportStore } from "@/store/useReportStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  DollarSign,
  XCircle,
  Package,
  ShieldAlert,
  Info,
} from "lucide-react";

const ALERT_TYPES = {
  delayed_order: { icon: Clock, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200" },
  unpaid_bill: { icon: DollarSign, color: "text-red-500", bg: "bg-red-50", border: "border-red-200" },
  low_stock: { icon: Package, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
  cancellation: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", border: "border-red-200" },
  refund_request: { icon: DollarSign, color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-200" },
  fraud_warning: { icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50", border: "border-red-300" },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
};

const AlertCard = ({ alert }) => {
  const config = ALERT_TYPES[alert.type] || ALERT_TYPES.info;
  const Icon = config.icon;
  const age = alert.timestamp
    ? Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 60000)
    : 0;

  return (
    <div className={`p-3 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-3">
        <Icon className={`size-5 ${config.color} mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm">{alert.title || alert.message}</p>
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              {age < 1 ? "Just now" : `${age}m ago`}
            </Badge>
          </div>
          {alert.description && (
            <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
          )}
          {alert.action && (
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium">Action:</span> {alert.action}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const ManagerAlerts = ({ branchId }) => {
  const { orders, getBranchOrders } = useOrderStore();
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (branchId) {
      getBranchOrders(branchId, { limit: 100 });
    }
  }, [branchId, getBranchOrders]);

  useEffect(() => {
    if (orders.length > 0) {
      const generatedAlerts = [];

      const delayedOrders = orders.filter((o) => {
        if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false;
        const age = Date.now() - new Date(o.createdAt).getTime();
        return age > 20 * 60 * 1000;
      });
      delayedOrders.forEach((order) => {
        generatedAlerts.push({
          id: `delayed-${order._id}`,
          type: "delayed_order",
          title: `Delayed Order #${order.orderNumber || order._id?.slice(-6)}`,
          description: `Table ${order.tableId?.tableNumber || "—"} - Preparing for over 20 minutes`,
          timestamp: order.createdAt,
          orderId: order._id,
        });
      });

      const unpaidOrders = orders.filter((o) =>
        ["UNPAID", "PENDING"].includes(o.paymentStatus) &&
        ["COMPLETED", "DELIVERED"].includes(o.orderStatus)
      );
      unpaidOrders.forEach((order) => {
        generatedAlerts.push({
          id: `unpaid-${order._id}`,
          type: "unpaid_bill",
          title: `Unpaid Bill - Table ${order.tableId?.tableNumber || "—"}`,
          description: `${(order.total || 0).toLocaleString()} ETB pending payment`,
          timestamp: order.updatedAt || order.createdAt,
          orderId: order._id,
        });
      });

      if (generatedAlerts.length === 0) {
        generatedAlerts.push({
          id: "info-healthy",
          type: "info",
          title: "All Clear",
          description: "No critical alerts at this time. Operations running smoothly.",
          timestamp: new Date(),
        });
      }

      generatedAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAlerts(generatedAlerts);
      setIsLoading(false);
    }
  }, [orders]);

  const criticalCount = alerts.filter(
    (a) => ["unpaid_bill", "fraud_warning"].includes(a.type)
  ).length;
  const warningCount = alerts.filter(
    (a) => ["delayed_order", "cancellation", "refund_request"].includes(a.type)
  ).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="size-4" />
            Alerts
          </CardTitle>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive">{criticalCount} Critical</Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary">{warningCount} Warning</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            title="No alerts"
            description="You're all caught up!"
            icon={CheckCircle}
          />
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {alerts.slice(0, 10).map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManagerAlerts;
