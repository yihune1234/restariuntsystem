import React, { useEffect, useState } from "react";
import { useOrderStore } from "@/store/useOrderStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge, SecurityCode } from "./StatusBadge";
import { Package, Clock } from "lucide-react";

const OrderList = ({ title = "Orders", statusFilter = "", paymentFilter = "" }) => {
  const { orders, getOrders, isLoading } = useOrderStore();
  const [filters, setFilters] = useState({ status: statusFilter, paymentStatus: paymentFilter });

  useEffect(() => {
    getOrders({ ...filters, limit: 50 });
  }, [filters, getOrders]);

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold">{title}</h1>
        <div className="flex gap-1">
          {[
            { key: "", label: "All" },
            { key: "WAITING_FOR_PAYMENT", label: "Pending" },
            { key: "CONFIRMED", label: "Confirmed" },
            { key: "PREPARING", label: "Preparing" },
            { key: "READY", label: "Ready" },
            { key: "COMPLETED", label: "Completed" },
          ].map((s) => (
            <Badge
              key={s.key || "all"}
              variant={(filters.status || "") === s.key ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilters((f) => ({ ...f, status: s.key || undefined }))}
            >
              {s.label}
            </Badge>
          ))}
        </div>
      </div>

      {isLoading && orders.length === 0 ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders"
          description="There are no orders matching this filter."
          icon={Package}
        />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {orders.map((o) => (
            <Card key={o._id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">#{o.orderNumber || o._id?.slice(-6)}</span>
                  <Badge variant="outline" className="inline-flex items-center gap-1">
                    <Clock className="size-3" /> {new Date(o.createdAt).toLocaleTimeString()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">
                    {o.tableId ? `Table ${o.tableId.tableNumber}` : "NO TABLE"}
                  </span>
                  <SecurityCode code={o.securityCode} />
                </div>
                <div className="space-y-1 text-sm mb-3">
                  {o.items?.slice(0, 4).map((it, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{it.foodNameSnapshot} × {it.quantity}</span>
                      <span>{((it.unitPriceSnapshot || 0) * it.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                  {o.items?.length > 4 && (
                    <p className="text-xs text-muted-foreground">+{o.items.length - 4} more</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <OrderStatusBadge status={o.orderStatus} paymentStatus={o.paymentStatus} />
                  <span className="font-bold">{Number(o.total || 0).toLocaleString()} ETB</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderList;
