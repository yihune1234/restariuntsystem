import React, { useEffect, useState } from "react";
import { useOrderStore } from "@/store/useOrderStore";
import { getSocket } from "@/config/socket.config";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SecurityCode } from "./StatusBadge";
import { Truck } from "lucide-react";

const OrderStatus = () => {
  const { orders, getOrders, setupSocketListeners, cleanupSocketListeners } = useOrderStore();
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    getOrders({ limit: 50 });
    setupSocketListeners();

    const socket = getSocket();
    socket?.on("connect", () => setSocketConnected(true));
    socket?.on("disconnect", () => setSocketConnected(false));

    return () => {
      cleanupSocketListeners();
      socket?.off("connect", setSocketConnected);
      socket?.off("disconnect", setSocketConnected);
    };
  }, [getOrders, setupSocketListeners, cleanupSocketListeners]);

  const activeStatuses = ["WAITING_FOR_PAYMENT", "CONFIRMED", "PREPARING", "READY", "TAKEN_BY_WAITER"];
  const active = orders.filter((o) => activeStatuses.includes(o.orderStatus));

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Order Status</h1>
        <Badge className={socketConnected ? "bg-green-600" : "bg-amber-500"}>
          {socketConnected ? "Live" : "Connecting..."}
        </Badge>
      </div>

      {active.length === 0 ? (
        <EmptyState title="No active orders" description="Orders will appear here in real time." icon={Truck} />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {active.map((o) => (
            <Card key={o._id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">#{o.orderNumber || o._id?.slice(-6)}</span>
                  <SecurityCode code={o.securityCode} />
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {o.tableId ? `Table ${o.tableId.tableNumber}` : "NO TABLE"} • {o.source}
                </p>
                <div className="space-y-1 text-sm mb-3">
                  {o.items?.slice(0, 3).map((it, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{it.foodNameSnapshot} × {it.quantity}</span>
                      <span>{((it.unitPriceSnapshot || 0) * it.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <Badge className="capitalize">
                    {(o.orderStatus || "").toLowerCase().replace(/_/g, " ")}
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

export default OrderStatus;
