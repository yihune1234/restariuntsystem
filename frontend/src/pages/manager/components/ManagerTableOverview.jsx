import { useEffect, useState, useMemo } from "react";
import { useTableStore } from "@/store/useTableStore";
import { useOrderStore } from "@/store/useOrderStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Users,
  Clock,
  AlertCircle,
  CreditCard,
  LayoutGrid,
  List,
} from "lucide-react";
import TableDetailsDrawer from "./TableDetailsDrawer";

const TABLE_STATUS_CONFIG = {
  available: { color: "bg-green-500", label: "Available", textColor: "text-green-600", bgClass: "bg-green-50 border-green-200" },
  occupied: { color: "bg-blue-500", label: "Occupied", textColor: "text-blue-600", bgClass: "bg-blue-50 border-blue-200" },
  ordering: { color: "bg-yellow-500", label: "Ordering", textColor: "text-yellow-600", bgClass: "bg-yellow-50 border-yellow-200" },
  preparing: { color: "bg-orange-500", label: "Preparing", textColor: "text-orange-600", bgClass: "bg-orange-50 border-orange-200" },
  ready: { color: "bg-purple-500", label: "Ready", textColor: "text-purple-600", bgClass: "bg-purple-50 border-purple-200" },
  served: { color: "bg-indigo-500", label: "Served", textColor: "text-indigo-600", bgClass: "bg-indigo-50 border-indigo-200" },
  payment_pending: { color: "bg-red-500", label: "Payment Pending", textColor: "text-red-600", bgClass: "bg-red-50 border-red-200" },
  attention: { color: "bg-pink-500", label: "Needs Attention", textColor: "text-pink-600", bgClass: "bg-pink-50 border-pink-200" },
  cleaning: { color: "bg-gray-400", label: "Cleaning", textColor: "text-gray-500", bgClass: "bg-gray-50 border-gray-200" },
};

const calculateTableStatus = (table, tableOrders) => {
  if (!table) return "available";
  if (table.status === "AVAILABLE") return "available";
  if (table.status === "RESERVED") return "occupied";
  if (table.status === "CLEANING") return "cleaning";

  const hasDelayed = tableOrders.some(o => {
    if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false;
    return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000;
  });
  const hasUnpaid = tableOrders.some(o =>
    ["UNPAID", "PENDING"].includes(o.paymentStatus) &&
    ["COMPLETED", "DELIVERED", "TAKEN_BY_WAITER"].includes(o.orderStatus)
  );
  const isPreparing = tableOrders.some(o => ["CONFIRMED", "PREPARING"].includes(o.orderStatus));
  const isReady = tableOrders.some(o => o.orderStatus === "READY");
  const isServed = tableOrders.some(o => ["TAKEN_BY_WAITER", "DELIVERED"].includes(o.orderStatus));

  if (hasDelayed || (hasUnpaid && isServed)) return "attention";
  if (hasUnpaid && isServed) return "payment_pending";
  if (isReady) return "ready";
  if (isPreparing) return "preparing";
  if (isServed) return "served";
  if (tableOrders.length > 0 && table.qrToken) return "ordering";
  if (tableOrders.length > 0) return "occupied";
  return "available";
};

const TableCard = ({ table, activeOrders, onClick }) => {
  const statusKey = calculateTableStatus(table, activeOrders);
  const statusConfig = TABLE_STATUS_CONFIG[statusKey] || TABLE_STATUS_CONFIG.available;
  const hasUnpaid = activeOrders.some(o => ["UNPAID", "PENDING"].includes(o.paymentStatus));
  const hasDelayed = activeOrders.some(o => {
    if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false;
    return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000;
  });
  const preparationTime = activeOrders.length > 0
    ? Math.floor((Date.now() - new Date(activeOrders[0].createdAt).getTime()) / 60000)
    : 0;
  const tableTotal = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all border-2 ${statusConfig.bgClass}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl">T{table.tableNumber}</span>
            <div className={`size-3 rounded-full ${statusConfig.color}`} />
          </div>
          <Badge variant="outline" className={`${statusConfig.textColor} border-current font-medium`}>
            {statusConfig.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Users className="size-4" />
          <span>{table.capacity || 4} seats</span>
        </div>

        {activeOrders.length > 0 ? (
          <div className="space-y-2 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Order #{activeOrders[0]?.orderNumber?.slice(-6) || activeOrders[0]?._id?.slice(-6)}</span>
              <span className="text-xs font-medium">{preparationTime}m</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{(tableTotal || 0).toLocaleString()} ETB</span>
              <div className="flex gap-1">
                {hasDelayed && <AlertCircle className="size-4 text-orange-500" />}
                {hasUnpaid && <CreditCard className="size-4 text-red-500" />}
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-gray-100">
            <span className="text-xs text-muted-foreground">No active orders</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TableListRow = ({ table, activeOrders, onClick }) => {
  const statusKey = calculateTableStatus(table, activeOrders);
  const statusConfig = TABLE_STATUS_CONFIG[statusKey] || TABLE_STATUS_CONFIG.available;
  const hasUnpaid = activeOrders.some(o => ["UNPAID", "PENDING"].includes(o.paymentStatus));
  const hasDelayed = activeOrders.some(o => {
    if (["COMPLETED", "CANCELLED", "DELIVERED", "READY"].includes(o.orderStatus)) return false;
    return Date.now() - new Date(o.createdAt).getTime() > 20 * 60 * 1000;
  });
  const preparationTime = activeOrders.length > 0
    ? Math.floor((Date.now() - new Date(activeOrders[0].createdAt).getTime()) / 60000)
    : 0;
  const tableTotal = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div
      className={`flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors ${
        hasUnpaid ? "bg-red-50/50" : hasDelayed ? "bg-orange-50/50" : ""
      }`}
      onClick={onClick}
    >
      <div className={`size-3 rounded-full ${statusConfig.color}`} />
      <div className="w-20 font-semibold">T{table.tableNumber}</div>
      <div className="flex-1 text-sm text-muted-foreground">{table.area || "Main"}</div>
      <div className="w-16 text-center text-sm">{table.capacity || 4}</div>
      <div className="w-28">
        <Badge className={`${statusConfig.color} text-white text-xs`}>{statusConfig.label}</Badge>
      </div>
      <div className="w-16 text-center text-sm">{activeOrders.length}</div>
      <div className="w-24 text-right font-semibold text-sm">{(tableTotal || 0).toLocaleString()}</div>
      <div className="w-16 text-right text-sm text-muted-foreground">{preparationTime}m</div>
      <div className="w-12 text-right">
        {hasDelayed && <AlertCircle className="size-4 text-orange-500" />}
        {hasUnpaid && <CreditCard className="size-4 text-red-500" />}
      </div>
    </div>
  );
};

const ManagerTableOverview = ({ tables: propTables, orders: propOrders, statusFilter }) => {
  const { tables: storeTables, getTables, isLoading: tablesLoading } = useTableStore();
  const { orders: storeOrders, getOrders, isLoading: ordersLoading } = useOrderStore();

  const tables = propTables || storeTables || [];
  const orders = propOrders || storeOrders || [];

  const [viewMode, setViewMode] = useState("grid");
  const [selectedTable, setSelectedTable] = useState(null);

  useEffect(() => {
    if (!propTables) {
      getTables();
    }
  }, [propTables, getTables]);

  useEffect(() => {
    if (!propOrders) {
      getOrders({ limit: 100 });
    }
  }, [propOrders, getOrders]);

  const tableOrderMap = useMemo(() => {
    const map = {};
    const activeOrders = orders.filter(o => !["COMPLETED", "CANCELLED"].includes(o.orderStatus));
    activeOrders.forEach(order => {
      if (order.tableId?._id) {
        if (!map[order.tableId._id]) {
          map[order.tableId._id] = [];
        }
        map[order.tableId._id].push(order);
      }
    });
    return map;
  }, [orders]);

  const statusCounts = useMemo(() => {
    const counts = { all: tables.length, available: 0, occupied: 0, attention: 0 };
    tables.forEach(table => {
      const tableOrders = tableOrderMap[table._id] || [];
      const status = calculateTableStatus(table, tableOrders);
      if (status === "available") counts.available++;
      else if (["occupied", "ordering", "preparing", "ready", "served"].includes(status)) counts.occupied++;
      else if (["attention", "payment_pending"].includes(status)) counts.attention++;
    });
    return counts;
  }, [tables, tableOrderMap]);

  const filteredTables = useMemo(() => {
    if (!statusFilter) return tables;
    return tables.filter(table => {
      const tableOrders = tableOrderMap[table._id] || [];
      const status = calculateTableStatus(table, tableOrders);
      if (statusFilter === "available") return status === "available";
      if (statusFilter === "occupied") return ["occupied", "ordering", "preparing", "ready", "served"].includes(status);
      if (statusFilter === "attention") return ["attention", "payment_pending"].includes(status);
      return true;
    });
  }, [tables, tableOrderMap, statusFilter]);

  const statusTabs = [
    { key: null, label: "All", count: statusCounts.all },
    { key: "available", label: "Available", count: statusCounts.available },
    { key: "occupied", label: "Occupied", count: statusCounts.occupied },
    { key: "attention", label: "Attention", count: statusCounts.attention },
  ];

  if (tablesLoading && tables.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Floor Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Floor Overview
            </CardTitle>
            <div className="flex border rounded-lg overflow-hidden">
              <Button variant="ghost" size="sm" className={`h-8 px-3 ${viewMode === "grid" ? "bg-muted" : ""}`} onClick={() => setViewMode("grid")}>
                <LayoutGrid className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" className={`h-8 px-3 ${viewMode === "list" ? "bg-muted" : ""}`} onClick={() => setViewMode("list")}>
                <List className="size-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {statusTabs.map(tab => (
              <Badge
                key={tab.key || "all"}
                variant={statusFilter === tab.key ? "default" : "outline"}
                className={`cursor-pointer px-3 py-1 ${
                  tab.key === "attention" && tab.count > 0 ? "border-pink-500 text-pink-600" : ""
                }`}
              >
                {tab.label} ({tab.count})
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {tables.length === 0 ? (
            <EmptyState title="No tables" description="Tables will appear here once configured." />
          ) : filteredTables.length === 0 ? (
            <EmptyState title="No tables match filter" description="Try selecting a different status filter." />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredTables.map(table => (
                <TableCard
                  key={table._id}
                  table={table}
                  activeOrders={tableOrderMap[table._id] || []}
                  onClick={() => setSelectedTable(table)}
                />
              ))}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/50">
                <div className="w-3" />
                <div className="w-20">Table</div>
                <div className="flex-1">Area</div>
                <div className="w-16 text-center">Seats</div>
                <div className="w-28 text-center">Status</div>
                <div className="w-16 text-center">Orders</div>
                <div className="w-24 text-right">Total</div>
                <div className="w-16 text-right">Time</div>
                <div className="w-12 text-right">!</div>
              </div>
              {filteredTables.map(table => (
                <TableListRow
                  key={table._id}
                  table={table}
                  activeOrders={tableOrderMap[table._id] || []}
                  onClick={() => setSelectedTable(table)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TableDetailsDrawer
        table={selectedTable}
        orders={orders}
        open={!!selectedTable}
        onClose={() => setSelectedTable(null)}
        onOrderClick={() => {}}
      />
    </>
  );
};

export default ManagerTableOverview;
