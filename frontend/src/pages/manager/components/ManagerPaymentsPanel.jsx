import { useEffect, useState } from "react";
import { useOrderStore } from "@/store/useOrderStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

const PAYMENT_METHOD_ICONS = {
  CASH: Banknote,
  CARD: CreditCard,
  TELEBIRR: Smartphone,
  CHAPA: Smartphone,
  CASHIER_CASH: Banknote,
  CASHIER_CARD: CreditCard,
};

const PAYMENT_STATUS_CONFIG = {
  PENDING: { color: "text-yellow-600", bg: "bg-yellow-50", icon: Clock, label: "Pending" },
  UNPAID: { color: "text-orange-600", bg: "bg-orange-50", icon: AlertCircle, label: "Unpaid" },
  COMPLETED: { color: "text-green-600", bg: "bg-green-50", icon: CheckCircle, label: "Paid" },
  PAID: { color: "text-green-600", bg: "bg-green-50", icon: CheckCircle, label: "Paid" },
  REFUNDED: { color: "text-red-600", bg: "bg-red-50", icon: XCircle, label: "Refunded" },
  PARTIAL: { color: "text-purple-600", bg: "bg-purple-50", icon: AlertCircle, label: "Partial" },
};

const PaymentRow = ({ order }) => {
  const statusConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus] || PAYMENT_STATUS_CONFIG.UNPAID;
  const StatusIcon = statusConfig.icon;
  const MethodIcon = PAYMENT_METHOD_ICONS[order.paymentMethod] || DollarSign;

  return (
    <div className="flex items-center justify-between p-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-lg ${statusConfig.bg} flex items-center justify-center`}>
          <StatusIcon className={`size-5 ${statusConfig.color}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">#{order.orderNumber || order._id?.slice(-6)}</span>
            <Badge variant={statusConfig.label === "Paid" ? "default" : "outline"} className="text-xs">
              {statusConfig.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MethodIcon className="size-3" />
            <span>{order.paymentMethod || "N/A"}</span>
            <span>•</span>
            <span>Table {order.tableId?.tableNumber || "—"}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold">{(order.total || 0).toLocaleString()} ETB</p>
        <p className="text-xs text-muted-foreground">
          {new Date(order.updatedAt || order.createdAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

const ManagerPaymentsPanel = ({ branchId }) => {
  const { orders, getBranchOrders, isLoading } = useOrderStore();
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (branchId) {
      getBranchOrders(branchId, { limit: 100 });
    }
  }, [branchId, getBranchOrders]);

  const filteredOrders = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "paid") return ["COMPLETED", "PAID"].includes(o.paymentStatus);
    if (filter === "unpaid") return ["UNPAID", "PENDING"].includes(o.paymentStatus);
    if (filter === "refunded") return o.paymentStatus === "REFUNDED";
    return true;
  });

  const stats = {
    total: orders.reduce((sum, o) => sum + (o.total || 0), 0),
    paid: orders.filter((o) => ["COMPLETED", "PAID"].includes(o.paymentStatus)).reduce((sum, o) => sum + (o.total || 0), 0),
    unpaid: orders.filter((o) => ["UNPAID", "PENDING"].includes(o.paymentStatus)).reduce((sum, o) => sum + (o.total || 0), 0),
    cash: orders.filter((o) => o.paymentMethod?.includes("CASH") && ["COMPLETED", "PAID"].includes(o.paymentStatus)).reduce((sum, o) => sum + (o.total || 0), 0),
    card: orders.filter((o) => o.paymentMethod?.includes("CARD") && ["COMPLETED", "PAID"].includes(o.paymentStatus)).reduce((sum, o) => sum + (o.total || 0), 0),
    digital: orders.filter((o) => ["TELEBIRR", "CHAPA"].includes(o.paymentMethod) && ["COMPLETED", "PAID"].includes(o.paymentStatus)).reduce((sum, o) => sum + (o.total || 0), 0),
  };

  const filterTabs = [
    { key: "all", label: `All (${orders.length})` },
    { key: "paid", label: `Paid (${orders.filter((o) => ["COMPLETED", "PAID"].includes(o.paymentStatus)).length})` },
    { key: "unpaid", label: `Unpaid (${orders.filter((o) => ["UNPAID", "PENDING"].includes(o.paymentStatus)).length})` },
    { key: "refunded", label: `Refunded (${orders.filter((o) => o.paymentStatus === "REFUNDED").length})` },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="size-4" />
          Payment Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-xl font-bold text-green-600">{stats.paid.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">ETB</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-xs text-muted-foreground">Unpaid</p>
            <p className="text-xl font-bold text-red-600">{stats.unpaid.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">ETB</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-muted-foreground">Cash</p>
            <p className="text-xl font-bold text-blue-600">{stats.cash.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">ETB</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-xs text-muted-foreground">Card/Digital</p>
            <p className="text-xl font-bold text-purple-600">{(stats.card + stats.digital).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">ETB</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {filterTabs.map((tab) => (
            <Badge
              key={tab.key}
              variant={filter === tab.key ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </Badge>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState title="No payments" description="Payments will appear here." />
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {filteredOrders.slice(0, 20).map((order) => (
              <PaymentRow key={order._id} order={order} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManagerPaymentsPanel;
