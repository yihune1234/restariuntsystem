import { useEffect, useState, useMemo } from "react";
import { useTableStore } from "@/store/useTableStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useUserStore } from "@/store/useUserStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Users,
  Clock,
  AlertCircle,
  Circle,
  CheckCircle,
  ChefHat,
  CreditCard,
  LayoutGrid,
  List,
} from "lucide-react";
import TableDetailsDrawer from "./TableDetailsDrawer";

const TABLE_STATUS_CONFIG = {
  available: { color: "bg-green-500", label: "Available", textColor: "text-green-600", borderColor: "border-green-200" },
  occupied: { color: "bg-blue-500", label: "Occupied", textColor: "text-blue-600", borderColor: "border-blue-200" },
  ordering: { color: "bg-yellow-500", label: "Ordering", textColor: "text-yellow-600", borderColor: "border-yellow-200" },
  preparing: { color: "bg-orange-500", label: "Preparing", textColor: "text-orange-600", borderColor: "border-orange-200" },
  ready: { color: "bg-purple-500", label: "Ready", textColor: "text-purple-600", borderColor: "border-purple-200" },
  served: { color: "bg-indigo-500", label: "Served", textColor: "text-indigo-600", borderColor: "border-indigo-200" },
  payment_pending: { color: "bg-red-500", label: "Payment Pending", textColor: "text-red-600", borderColor: "border-red-200" },
  attention: { color: "bg-pink-500", label: "Needs Attention", textColor: "text-pink-600", borderColor: "border-pink-200" },
  cleaning: { color: "bg-gray-400", label: "Cleaning", textColor: "text-gray-500", borderColor: "border-gray-200" },
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

const TableCard = ({ table, activeOrders, onClick, isFiltered }) => {
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
      className={`cursor-pointer hover:shadow-md transition-all ${
        hasUnpaid ? "border-red-300 bg-red-50/50" :
        hasDelayed ? "border-orange-300 bg-orange-50/50" :
        isFiltered ? statusConfig.borderColor : ""
      } ${statusKey === "ready" ? "border-purple-300 bg-purple-50/50" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold">T{table.tableNumber || table.number}</span>
            <div className={`size-2 rounded-full ${statusConfig.color}`} />
          </div>
          <Badge
            variant="outline"
            className={`${statusConfig.textColor} text-xs border-current`}
          >
            {statusConfig.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Users className="size-3" />
          <span>{table.capacity || 4} seats</span>
          {table.area && <span>• {table.area}</span>}
        </div>

        {activeOrders.length > 0 && (
          <div className="space-y-1 pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Orders</span>
              <span className="font-medium">{activeOrders.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">{(tableTotal || 0).toLocaleString()} ETB</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" /> {preparationTime}m
              </span>
              <div className="flex items-center gap-1">
                {hasDelayed && <AlertCircle className="size-3 text-orange-500" />}
                {hasUnpaid && <CreditCard className="size-3 text-red-500" />}
              </div>
            </div>
          </div>
        )}

        {table.qrToken && activeOrders.length === 0 && (
          <div className="pt-2 mt-2 border-t flex items-center gap-1 text-xs text-yellow-600">
            <Circle className="size-2 fill-yellow-500" />
            <span>QR Active</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TableListRow = ({ table, activeOrders, onClick, isFiltered }) => {
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
  const latestOrder = activeOrders[activeOrders.length - 1];

  return (
    <div
      className={`flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
        hasUnpaid ? "border-red-200 bg-red-50/30" :
        hasDelayed ? "border-orange-200 bg-orange-50/30" :
        statusKey === "ready" ? "border-purple-200 bg-purple-50/30" : ""
      }`}
      onClick={onClick}
    >
      <div className={`size-3 rounded-full ${statusConfig.color}`} />

      <div className="w-16 font-medium">T{table.tableNumber}</div>

      <div className="flex-1 text-sm text-muted-foreground">{table.area || "Main"}</div>

      <div className="w-16 text-center">
        <Badge variant="outline" className="text-xs">{table.capacity || 4} seats</Badge>
      </div>

      <div className="w-24 text-center">
        <Badge className={`${statusConfig.color} text-white text-xs`}>
          {statusConfig.label}
        </Badge>
      </div>

      <div className="w-16 text-center text-sm">
        {activeOrders.length}
      </div>

      <div className="w-24 text-right font-bold text-sm">
        {(tableTotal || 0).toLocaleString()} ETB
      </div>

      <div className="w-20 text-right text-xs text-muted-foreground">
        {preparationTime}m
      </div>

      <div className="w-20 text-right">
        {hasDelayed && <AlertCircle className="size-4 text-orange-500 ml-auto" />}
        {hasUnpaid && <CreditCard className="size-4 text-red-500 ml-auto" />}
      </div>
    </div>
  );
};

const ManagerTableOverview = ({ branchId, tables: propTables, orders: propOrders, statusFilter }) => {
  const { tables: storeTables, getTablesByBranch, isLoading: tablesLoading } = useTableStore();
  const { orders: storeOrders, getBranchOrders, isLoading: ordersLoading } = useOrderStore();
  const { staff, fetchStaffByBranch } = useUserStore();

  const tables = propTables || storeTables || [];
  const orders = propOrders || storeOrders || [];

  const [viewMode, setViewMode] = useState("grid");
  const [selectedTable, setSelectedTable] = useState(null);

  useEffect(() => {
    if (!propTables && branchId) {
      getTablesByBranch(branchId);
    }
  }, [branchId, propTables, getTablesByBranch]);

  useEffect(() => {
    if (!propOrders && branchId) {
      getBranchOrders(branchId, { limit: 100 });
    }
  }, [branchId, propOrders, getBranchOrders]);

  useEffect(() => {
    if (branchId) {
      fetchStaffByBranch(branchId);
    }
  }, [branchId, fetchStaffByBranch]);

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
    const counts = {
      all: tables.length,
      available: 0,
      occupied: 0,
      ordering: 0,
      preparing: 0,
      ready: 0,
      served: 0,
      payment_pending: 0,
      attention: 0,
      cleaning: 0,
    };

    tables.forEach(table => {
      const tableOrders = tableOrderMap[table._id] || [];
      const status = calculateTableStatus(table, tableOrders);
      if (status === "available") counts.available++;
      else if (status === "occupied") counts.occupied++;
      else if (status === "ordering") counts.ordering++;
      else if (status === "preparing") counts.preparing++;
      else if (status === "ready") counts.ready++;
      else if (status === "served") counts.served++;
      else if (status === "payment_pending") counts.payment_pending++;
      else if (status === "attention") counts.attention++;
      else if (status === "cleaning") counts.cleaning++;
    });

    return counts;
  }, [tables, tableOrderMap]);

  const filteredTables = useMemo(() => {
    if (!statusFilter) return tables;
    return tables.filter(table => {
      const tableOrders = tableOrderMap[table._id] || [];
      const status = calculateTableStatus(table, tableOrders);
      return status === statusFilter;
    });
  }, [tables, tableOrderMap, statusFilter]);

  const statusTabs = [
    { key: null, label: `All`, count: statusCounts.all },
    { key: "available", label: "Available", count: statusCounts.available },
    { key: "occupied", label: "Occupied", count: statusCounts.occupied },
    { key: "ordering", label: "Ordering", count: statusCounts.ordering },
    { key: "preparing", label: "Preparing", count: statusCounts.preparing },
    { key: "ready", label: "Ready", count: statusCounts.ready },
    { key: "served", label: "Served", count: statusCounts.served },
    { key: "payment_pending", label: "Pay Pending", count: statusCounts.payment_pending },
    { key: "attention", label: "Attention", count: statusCounts.attention },
  ];

  if (tablesLoading && tables.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Floor Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4" />
              Floor Overview
            </CardTitle>
            <div className="flex gap-2">
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-2 ${viewMode === "grid" ? "bg-muted" : ""}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-2 ${viewMode === "list" ? "bg-muted" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  <List className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-1 flex-wrap mt-2">
            {statusTabs.map(tab => (
              <Badge
                key={tab.key || "all"}
                variant={statusFilter === tab.key ? "default" : "outline"}
                className={`cursor-pointer text-xs ${
                  tab.key === "ready" && tab.count > 0 ? "border-purple-500 text-purple-600" :
                  tab.key === "attention" && tab.count > 0 ? "border-pink-500 text-pink-600" :
                  tab.key === "payment_pending" && tab.count > 0 ? "border-red-500 text-red-600" :
                  ""
                }`}
                onClick={() => {
                  // Parent handles filtering via statusFilter prop
                }}
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
            <EmptyState
              title="No tables match filter"
              description="Try selecting a different status filter."
            />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredTables.map(table => (
                <TableCard
                  key={table._id}
                  table={table}
                  activeOrders={tableOrderMap[table._id] || []}
                  isFiltered={!!statusFilter}
                  onClick={() => setSelectedTable(table)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-4 px-3 py-2 text-xs text-muted-foreground border-b">
                <div className="w-16">Table</div>
                <div className="flex-1">Area</div>
                <div className="w-16 text-center">Capacity</div>
                <div className="w-24 text-center">Status</div>
                <div className="w-16 text-center">Orders</div>
                <div className="w-24 text-right">Total</div>
                <div className="w-20 text-right">Time</div>
                <div className="w-20 text-right">Alerts</div>
              </div>
              {filteredTables.map(table => (
                <TableListRow
                  key={table._id}
                  table={table}
                  activeOrders={tableOrderMap[table._id] || []}
                  isFiltered={!!statusFilter}
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
        onOrderClick={(order) => {
          // Handle order click - could open order details
        }}
      />
    </>
  );
};

export default ManagerTableOverview;
