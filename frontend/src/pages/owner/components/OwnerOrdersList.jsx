import { useEffect, useState } from "react";
import { useOrderStore } from "@/store/useOrderStore";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingCart, Clock } from "lucide-react";

const OwnerOrdersList = () => {
  const { orders, getOrgOrders, isLoading } = useOrderStore();
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    getOrgOrders({ limit: 100 });
  }, [getOrgOrders]);

  const filteredOrders = statusFilter
    ? orders.filter(o => o.orderStatus === statusFilter)
    : orders;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold">All Branch Orders</h1>
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
              variant={(statusFilter || "") === s.key ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter(s.key || "")}
            >
              {s.label}
            </Badge>
          ))}
        </div>
      </div>

      {isLoading && filteredOrders.length === 0 ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders"
          description="There are no orders matching this filter."
          icon={ShoppingCart}
        />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredOrders.map((o) => (
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
                    {o.tableId ? `Table ${o.tableId.tableNumber || o.tableId}` : "NO TABLE"}
                  </span>
                  <Badge variant="secondary">{o.branchId?.name || o.branchId?._id?.slice(-6) || "—"}</Badge>
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
                  {o.customerNote && (
                    <div className="mt-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                      <span className="font-semibold uppercase text-[10px] block">Customer Note</span>
                      <span className="line-clamp-2">{o.customerNote}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Badge
                    variant={
                      o.orderStatus === "COMPLETED" ? "default" :
                      o.orderStatus === "CANCELLED" ? "destructive" :
                      o.orderStatus === "PREPARING" ? "secondary" : "outline"
                    }
                  >
                    {o.orderStatus}
                  </Badge>
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

export default OwnerOrdersList;
