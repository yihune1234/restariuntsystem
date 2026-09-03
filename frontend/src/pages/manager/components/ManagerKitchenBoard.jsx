import { useEffect, useState } from "react";
import { useOrderStore } from "@/store/useOrderStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChefHat,
  Clock,
  AlertTriangle,
  CheckCircle,
  Flame,
  Salad,
  GlassWater,
  Dessert,
  UtensilsCrossed,
} from "lucide-react";

const STATIONS = [
  { id: "grill", name: "Grill", icon: Flame, color: "text-red-500", bg: "bg-red-50" },
  { id: "salad", name: "Salad", icon: Salad, color: "text-green-500", bg: "bg-green-50" },
  { id: "drinks", name: "Drinks", icon: GlassWater, color: "text-blue-500", bg: "bg-blue-50" },
  { id: "dessert", name: "Dessert", icon: Dessert, color: "text-pink-500", bg: "bg-pink-50" },
  { id: "main", name: "Main Kitchen", icon: UtensilsCrossed, color: "text-orange-500", bg: "bg-orange-50" },
];

const STATION_KEYWORDS = {
  grill: ["burger", "steak", "grill", "BBQ", "kebab", "meat", "chicken breast", "lamb"],
  salad: ["salad", "caesar", "greek", "coleslaw", "fresh", "greens"],
  drinks: ["juice", "soda", "water", "coffee", "tea", "milkshake", "smoothie", "drink"],
  dessert: ["cake", "ice cream", "dessert", "brownie", "pie", "sweet"],
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

const KitchenOrderCard = ({ order, stationFilter }) => {
  const orderAge = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
  const isDelayed = orderAge > 20 && !["COMPLETED", "CANCELLED", "READY", "DELIVERED"].includes(order.orderStatus);

  const stationItems = stationFilter
    ? order.items?.filter((item) => categorizeItem(item.foodNameSnapshot || item.foodName) === stationFilter)
    : order.items;

  if (stationFilter && stationItems?.length === 0) return null;

  return (
    <Card className={`${isDelayed ? "border-orange-300 bg-orange-50" : ""}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold">#{order.orderNumber || order._id?.slice(-6)}</span>
            {isDelayed && <AlertTriangle className="size-4 text-orange-500" />}
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Clock className="size-3" />
            <span className={isDelayed ? "text-orange-600 font-medium" : "text-muted-foreground"}>
              {orderAge}m
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span>Table {order.tableId?.tableNumber || "—"}</span>
          <Badge
            variant={order.orderStatus === "PREPARING" ? "default" : "secondary"}
            className="text-xs"
          >
            {order.orderStatus}
          </Badge>
        </div>

        <div className="space-y-1">
          {stationItems?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm border-b last:border-0 pb-1 last:pb-0">
              <span>
                {item.quantity}× {item.foodNameSnapshot || item.foodName}
              </span>
              {stationFilter && (
                <Badge variant="outline" className="text-xs">
                  {categorizeItem(item.foodNameSnapshot || item.foodName)}
                </Badge>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {stationItems?.length || 0} item{(stationItems?.length || 0) !== 1 ? "s" : ""}
          </span>
          <span className="font-bold">{(order.total || 0).toLocaleString()} ETB</span>
        </div>
      </CardContent>
    </Card>
  );
};

const ManagerKitchenBoard = ({ branchId }) => {
  const { orders, getBranchOrders, isLoading } = useOrderStore();
  const [stationFilter, setStationFilter] = useState("all");

  useEffect(() => {
    if (branchId) {
      getBranchOrders(branchId, { limit: 100 });
    }
  }, [branchId, getBranchOrders]);

  const preparingOrders = orders.filter(
    (o) => o.orderStatus === "PREPARING" || o.orderStatus === "CONFIRMED"
  );

  const readyOrders = orders.filter((o) => o.orderStatus === "READY");

  const delayedOrders = preparingOrders.filter((o) => {
    const age = Date.now() - new Date(o.createdAt).getTime();
    return age > 20 * 60 * 1000;
  });

  const getStationCounts = () => {
    const counts = { all: preparingOrders.length };
    STATIONS.forEach((s) => {
      counts[s.id] = preparingOrders.filter((order) =>
        order.items?.some(
          (item) => categorizeItem(item.foodNameSnapshot || item.foodName) === s.id
        )
      ).length;
    });
    return counts;
  };

  const stationCounts = getStationCounts();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-3 text-center">
            <Clock className="size-5 mx-auto mb-1 text-orange-600" />
            <p className="text-2xl font-bold text-orange-600">{preparingOrders.length}</p>
            <p className="text-xs text-muted-foreground">Preparing</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3 text-center">
            <CheckCircle className="size-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{readyOrders.length}</p>
            <p className="text-xs text-muted-foreground">Ready</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="size-5 mx-auto mb-1 text-red-600" />
            <p className="text-2xl font-bold text-red-600">{delayedOrders.length}</p>
            <p className="text-xs text-muted-foreground">Delayed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={stationFilter} onValueChange={setStationFilter}>
        <TabsList className="grid w-full grid-cols-6 mb-4">
          <TabsTrigger value="all">All ({stationCounts.all})</TabsTrigger>
          {STATIONS.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.name} ({stationCounts[s.id] || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={stationFilter}>
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : preparingOrders.length === 0 ? (
            <EmptyState
              title="No orders in kitchen"
              description="Orders will appear here when confirmed."
              icon={ChefHat}
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {preparingOrders
                .filter((order) => {
                  if (stationFilter === "all") return true;
                  return order.items?.some(
                    (item) =>
                      categorizeItem(item.foodNameSnapshot || item.foodName) === stationFilter
                  );
                })
                .map((order) => (
                  <KitchenOrderCard
                    key={order._id}
                    order={order}
                    stationFilter={stationFilter === "all" ? null : stationFilter}
                  />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {readyOrders.length > 0 && (
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="size-4 text-green-600" />
              Ready for Pickup ({readyOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              {readyOrders.map((order) => (
                <Card key={order._id} className="border-green-200 bg-green-50/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">#{order.orderNumber || order._id?.slice(-6)}</span>
                      <Badge variant="default" className="bg-green-600">Ready</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Table {order.tableId?.tableNumber || "—"}
                    </p>
                    <p className="text-xs mt-1">{order.items?.length || 0} items</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManagerKitchenBoard;
