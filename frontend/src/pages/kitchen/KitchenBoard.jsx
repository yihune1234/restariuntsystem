import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import useKitchenStore from "@/store/useKitchenStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getSocket } from "@/config/socket.config";
import { SecurityCode } from "../shared/StatusBadge";
import {
  Flame, Timer, CheckCircle2, Package, ChevronRight, Loader2,
  Clock, AlertTriangle, Wifi, WifiOff, RefreshCw, ChefHat,
  Salad, GlassWater, Dessert, UtensilsCrossed,
} from "lucide-react";

const STATIONS = [
  { id: "all", name: "All", icon: ChefHat, color: "text-gray-600", bg: "bg-gray-100" },
  { id: "grill", name: "Grill", icon: Flame, color: "text-red-500", bg: "bg-red-50" },
  { id: "salad", name: "Salad", icon: Salad, color: "text-green-500", bg: "bg-green-50" },
  { id: "drinks", name: "Drinks", icon: GlassWater, color: "text-blue-500", bg: "bg-blue-50" },
  { id: "dessert", name: "Dessert", icon: Dessert, color: "text-pink-500", bg: "bg-pink-50" },
  { id: "main", name: "Main", icon: UtensilsCrossed, color: "text-orange-500", bg: "bg-orange-50" },
];

const STATION_KEYWORDS = {
  grill: ["burger", "steak", "grill", "bbq", "kebab", "meat", "chicken breast", "lamb", "grilled"],
  salad: ["salad", "caesar", "greek", "coleslaw", "fresh", "greens"],
  drinks: ["juice", "soda", "water", "coffee", "tea", "milkshake", "smoothie", "drink", "espresso", "cappuccino"],
  dessert: ["cake", "ice cream", "dessert", "brownie", "pie", "sweet", "cookie"],
};

const categorizeItem = (itemName) => {
  const name = (itemName || "").toLowerCase();
  for (const [station, keywords] of Object.entries(STATION_KEYWORDS)) {
    if (keywords.some((kw) => name.includes(kw))) {
      return station;
    }
  }
  return "main";
};

const getTimeLabel = (minutes) => {
  if (minutes < 1) return { label: "Just now", className: "text-green-600" };
  if (minutes < 5) return { label: `${minutes}m`, className: "text-green-600" };
  if (minutes < 10) return { label: `${minutes}m`, className: "text-amber-600" };
  if (minutes < 15) return { label: `${minutes}m`, className: "text-orange-600" };
  return { label: `${minutes}m`, className: "text-red-600 font-bold" };
};

const KitchenBoard = () => {
  const { kitchenOrders, fetchKitchenOrders, startPreparation, markReady, subscribeKitchenEvents, isLoading } = useKitchenStore();
  const [updating, setUpdating] = useState(null);
  const [connected, setConnected] = useState(() => Boolean(getSocket()?.connected));
  const [stationFilter, setStationFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    await fetchKitchenOrders();
    setRefreshing(false);
  }, [fetchKitchenOrders]);

  useEffect(() => {
    load();
    const unsubscribe = subscribeKitchenEvents();
    return unsubscribe;
  }, [load, subscribeKitchenEvents]);

  useEffect(() => {
    // socket.config is part of the initial bundle (statically imported by the
    // stores and App), so we import it statically here too — a dynamic import
    // would just trigger a Vite "mixed static/dynamic import" warning without
    // moving the module into another chunk.
    const s = getSocket();
    if (!s) return;
    const onConn = () => setConnected(true);
    const onDisc = () => setConnected(false);
    s.on("connect", onConn);
    s.on("disconnect", onDisc);
    return () => {
      s.off("connect", onConn);
      s.off("disconnect", onDisc);
    };
  }, []);

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId);
    try {
      if (status === "PREPARING") {
        await startPreparation(orderId);
        toast.success("Order started");
      } else if (status === "READY") {
        await markReady(orderId);
        toast.success("Order marked ready — waiter notified");
      }
      load();
    } finally {
      setUpdating(null);
    }
  };

  const confirmed = kitchenOrders.filter((o) => o.orderStatus === "CONFIRMED");
  const preparing = kitchenOrders.filter((o) => o.orderStatus === "PREPARING");
  const ready = kitchenOrders.filter((o) => o.orderStatus === "READY");

  const stats = {
    confirmed: confirmed.length,
    preparing: preparing.length,
    ready: ready.length,
    delayed: [...confirmed, ...preparing].filter(o => {
      const mins = (Date.now() - new Date(o.createdAt)) / 60000;
      return mins > 15;
    }).length,
  };

  return (
    <div className="p-3 lg:p-5 h-full flex flex-col">
      <Tabs defaultValue="live" className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Kitchen Board</h1>
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${connected ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {connected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {connected ? "Live" : "Offline"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TabsList>
              <TabsTrigger value="live">Live Queue</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={load} disabled={refreshing || isLoading}>
              <RefreshCw className={`size-4 mr-1 ${refreshing || isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        <TabsContent value="live" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden">

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-2 mb-4 flex-shrink-0">
        <div className={`rounded-xl p-3 text-center ${stats.confirmed > 0 ? "bg-amber-50 border-2 border-amber-200" : "bg-gray-50"}`}>
          <p className="text-2xl font-black text-amber-600">{stats.confirmed}</p>
          <p className="text-[10px] text-amber-700 font-medium">New</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${stats.preparing > 0 ? "bg-orange-50 border-2 border-orange-200" : "bg-gray-50"}`}>
          <p className="text-2xl font-black text-orange-600">{stats.preparing}</p>
          <p className="text-[10px] text-orange-700 font-medium">Preparing</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${stats.ready > 0 ? "bg-green-50 border-2 border-green-200" : "bg-gray-50"}`}>
          <p className="text-2xl font-black text-green-600">{stats.ready}</p>
          <p className="text-[10px] text-green-700 font-medium">Ready</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${stats.delayed > 0 ? "bg-red-50 border-2 border-red-200" : "bg-gray-50"}`}>
          <p className={`text-2xl font-black ${stats.delayed > 0 ? "text-red-600" : "text-gray-400"}`}>{stats.delayed}</p>
          <p className="text-[10px] text-gray-500 font-medium">Delayed</p>
        </div>
      </div>

      {/* Station Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-2 flex-shrink-0 scrollbar-hide">
        {STATIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setStationFilter(s.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              stationFilter === s.id
                ? `${s.bg} ${s.color} border-2 border-current shadow-sm`
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 border border-transparent"
            }`}
          >
            <s.icon className="size-4" /> {s.name}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Left Column: New + Preparing */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex gap-3 min-h-0">
            {/* New Orders */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className={`flex items-center justify-between mb-2 px-1 ${confirmed.length > 0 ? "text-amber-600" : "text-gray-400"}`}>
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  <Flame className="size-4" /> Incoming
                  {confirmed.length > 0 && <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{confirmed.length}</span>}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {confirmed.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    No incoming orders
                  </div>
                ) : (
                  confirmed.map((order) => (
                    <KitchenTicket
                      key={order._id}
                      order={order}
                      stationFilter={stationFilter}
                      updating={updating}
                      onUpdate={updateStatus}
                      nextAction={{ label: "Start", status: "PREPARING", icon: Flame }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Preparing */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className={`flex items-center justify-between mb-2 px-1 ${preparing.length > 0 ? "text-orange-600" : "text-gray-400"}`}>
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  <Timer className="size-4" /> Preparing
                  {preparing.length > 0 && <span className="ml-1 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{preparing.length}</span>}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {preparing.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    Nothing cooking
                  </div>
                ) : (
                  preparing.map((order) => (
                    <KitchenTicket
                      key={order._id}
                      order={order}
                      stationFilter={stationFilter}
                      updating={updating}
                      onUpdate={updateStatus}
                      nextAction={{ label: "Ready", status: "READY", icon: CheckCircle2 }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ready for Pickup */}
        <div className="w-72 flex-shrink-0 flex flex-col">
          <div className="flex items-center justify-between mb-2 px-1 text-green-600">
            <span className="flex items-center gap-1.5 text-sm font-bold">
              <CheckCircle2 className="size-4" /> Ready
              {ready.length > 0 && <span className="ml-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{ready.length}</span>}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {ready.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No orders ready
              </div>
            ) : (
              ready.map((order) => (
                <ReadyTicket key={order._id} order={order} />
              ))
            )}
          </div>
        </div>
      </div>
      </TabsContent>

      <TabsContent value="history" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden overflow-y-auto">
        <KitchenHistory orders={kitchenOrders} />
      </TabsContent>
      </Tabs>
    </div>
  );
};

const KitchenTicket = ({ order, stationFilter, updating, onUpdate, nextAction }) => {
  const mins = Math.floor((Date.now() - new Date(order.createdAt)) / 60000);
  const timeInfo = getTimeLabel(mins);
  const isDelayed = mins > 15;
  const isVeryDelayed = mins > 20;

  const filteredItems = stationFilter === "all"
    ? order.items
    : order.items?.filter((it) => categorizeItem(it.foodNameSnapshot || it.foodName) === stationFilter);

  if (stationFilter !== "all" && (!filteredItems || filteredItems.length === 0)) return null;

  return (
    <div
      className={`rounded-xl border-2 p-3 transition-all ${
        isVeryDelayed
          ? "border-red-400 bg-red-50"
          : isDelayed
          ? "border-orange-300 bg-orange-50"
          : order.orderStatus === "CONFIRMED"
          ? "border-amber-200 bg-white dark:bg-gray-900"
          : "border-orange-200 bg-orange-50/50 dark:bg-gray-900"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-gray-900 dark:text-white">
            #{order.orderNumber || order._id?.slice(-4)}
          </span>
          {isDelayed && (
            <AlertTriangle className={`size-4 ${isVeryDelayed ? "text-red-500 animate-pulse" : "text-orange-500"}`} />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className={`size-3.5 ${timeInfo.className}`} />
          <span className={`text-sm font-bold ${timeInfo.className}`}>{timeInfo.label}</span>
        </div>
      </div>

      {/* Table & Source */}
      <div className="flex flex-col gap-1 mb-2 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            {order.tableId ? `Table ${order.tableId.tableNumber}` : "No Table"}
          </span>
          <span>•</span>
          <span>{order.source}</span>
          <SecurityCode code={order.securityCode} />
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <span>Time: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span>•</span>
          <span>Waiter: {order.createdBy?.name || "Unassigned"}</span>
        </div>
      </div>

      {/* Order-level Customer Note / Special Request */}
      {order.customerNote && (
        <div className="mb-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-900">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Customer Note</p>
          <p className="text-xs leading-snug">{order.customerNote}</p>
        </div>
      )}

      {/* Items */}
      <div className="space-y-1 mb-3">
        {filteredItems?.map((it, i) => (
          <div key={i} className="flex flex-col gap-0.5 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-gray-900 dark:text-white min-w-[24px]">{it.quantity}×</span>
                <span className="text-gray-800 dark:text-gray-200">{it.foodNameSnapshot || it.foodName}</span>
              </div>
            </div>
            {it.notes && (
              <p className="ml-7 text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block w-fit">
                {"\u26a0"} {it.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Action Button */}
      {nextAction && (
        <Button
          size="sm"
          className={`w-full font-bold ${
            order.orderStatus === "CONFIRMED"
              ? "bg-amber-500 hover:bg-amber-600 text-white"
              : "bg-orange-500 hover:bg-orange-600 text-white"
          }`}
          onClick={() => onUpdate(order._id, nextAction.status)}
          disabled={updating === order._id}
        >
          {updating === order._id ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <nextAction.icon className="size-4 mr-1" /> {nextAction.label}
            </>
          )}
        </Button>
      )}
    </div>
  );
};

const ReadyTicket = ({ order }) => {
  const mins = Math.floor((Date.now() - new Date(order.createdAt)) / 60000);

  return (
    <div className="rounded-xl border-2 border-green-300 bg-green-50 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg font-black text-green-700">
          #{order.orderNumber || order._id?.slice(-4)}
        </span>
        <Badge className="bg-green-500 text-white text-[10px]">Ready</Badge>
      </div>
      <div className="flex items-center gap-2 mb-2 text-xs text-green-600">
        <span className="font-semibold">Table {order.tableId?.tableNumber || "—"}</span>
        <span>•</span>
        <span>{order.items?.length || 0} items</span>
      </div>
      <div className="text-[10px] text-green-600 font-medium">
        Waiting {mins}m for pickup
      </div>
    </div>
  );
};

const KitchenHistory = ({ orders }) => {
  const completed = orders.filter(o => ["COMPLETED", "DELIVERED", "CANCELLED"].includes(o.orderStatus));
  
  if (completed.length === 0) {
    return <EmptyState title="No history found" description="Completed orders will appear here for review." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded-lg text-sm font-semibold text-gray-500">
        <div className="w-24">Order #</div>
        <div className="w-24">Table</div>
        <div className="flex-1">Items</div>
        <div className="w-32">Time Summary</div>
        <div className="w-32">Staff</div>
        <div className="w-24 text-right">Status</div>
      </div>
      {completed.map(o => (
        <div key={o._id} className="flex items-center justify-between bg-white dark:bg-gray-900 p-3 rounded-lg border text-sm gap-4">
          <div className="w-24 font-bold text-gray-900 dark:text-white">#{o.orderNumber || o._id?.slice(-4)}</div>
          <div className="w-24">{o.tableId?.tableNumber ? `Table ${o.tableId.tableNumber}` : "No Table"}</div>
          <div className="flex-1 text-xs text-gray-500">
            {o.items?.map(it => `${it.quantity}× ${it.foodNameSnapshot || it.foodName}`).join(", ")}
          </div>
          <div className="w-32 flex flex-col text-xs text-gray-500">
            <span>Started: {new Date(o.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            <span>Ready: {new Date(o.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          <div className="w-32 flex flex-col text-xs text-gray-500">
            <span>Waiter: {o.createdBy?.name || "N/A"}</span>
            <span>Source: {o.source}</span>
          </div>
          <div className="w-24 text-right flex justify-end">
            <Badge variant="outline">{o.orderStatus}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
};

export default KitchenBoard;
