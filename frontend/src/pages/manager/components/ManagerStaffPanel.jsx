import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUserStore } from "@/store/useUserStore";
import { useShiftStore } from "@/store/useShiftStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useTableStore } from "@/store/useTableStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Users,
  UserRound,
  ChefHat,
  Wallet,
  Clock,
  CheckCircle,
  AlertTriangle,
  LayoutGrid,
  List,
  UserCog,
  ArrowRightLeft,
  Settings,
} from "lucide-react";

const ROLE_CONFIG = {
  manager: { icon: UserRound, color: "text-purple-600", bg: "bg-purple-50", label: "Manager" },
  waiter: { icon: Users, color: "text-blue-600", bg: "bg-blue-50", label: "Waiter" },
  cashier: { icon: Wallet, color: "text-green-600", bg: "bg-green-50", label: "Cashier" },
  kitchen: { icon: ChefHat, color: "text-orange-600", bg: "bg-orange-50", label: "Kitchen" },
};

const STATUS_CONFIG = {
  working: { color: "bg-green-500", label: "Working", textColor: "text-green-600" },
  available: { color: "bg-blue-500", label: "Available", textColor: "text-blue-600" },
  busy: { color: "bg-orange-500", label: "Busy", textColor: "text-orange-600" },
  break: { color: "bg-yellow-500", label: "On Break", textColor: "text-yellow-600" },
  offline: { color: "bg-gray-400", label: "Offline", textColor: "text-gray-500" },
};

const getStaffStatus = (staff, shift, activeOrders) => {
  if (!shift || shift.status !== "OPEN") {
    return shift ? STATUS_CONFIG.break : STATUS_CONFIG.offline;
  }

  const staffOrders = activeOrders.filter(
    (o) => o.assignedWaiterId === staff._id && !["COMPLETED", "CANCELLED"].includes(o.orderStatus)
  );

  if (staffOrders.length === 0) {
    return STATUS_CONFIG.available;
  }

  const hasPreparing = staffOrders.some((o) => ["PREPARING", "CONFIRMED"].includes(o.orderStatus));
  if (hasPreparing) {
    return STATUS_CONFIG.busy;
  }

  return STATUS_CONFIG.working;
};

const StaffWorkloadCard = ({ staff, shift, activeOrders, tables, onClick }) => {
  const roleConfig = ROLE_CONFIG[staff.role?.toLowerCase()] || ROLE_CONFIG.waiter;
  const RoleIcon = roleConfig.icon;

  const staffOrders = useMemo(
    () =>
      activeOrders.filter(
        (o) => o.assignedWaiterId === staff._id && !["COMPLETED", "CANCELLED"].includes(o.orderStatus)
      ),
    [activeOrders, staff._id]
  );

  const assignedTableIds = useMemo(() => {
    const ids = new Set();
    staffOrders.forEach((o) => {
      if (o.tableId?._id) ids.add(o.tableId._id);
    });
    return ids;
  }, [staffOrders]);

  const assignedTables = useMemo(
    () => tables.filter((t) => assignedTableIds.has(t._id)),
    [tables, assignedTableIds]
  );

  const status = getStaffStatus(staff, shift, activeOrders);

  const preparingCount = staffOrders.filter((o) => ["PREPARING", "CONFIRMED"].includes(o.orderStatus)).length;
  const readyCount = staffOrders.filter((o) => o.orderStatus === "READY").length;
  const servedCount = staffOrders.filter((o) => ["TAKEN_BY_WAITER", "DELIVERED"].includes(o.orderStatus)).length;

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all ${
        status.key === "busy" ? "border-orange-200 bg-orange-50/30" : ""
      } ${status.key === "available" ? "border-green-200 bg-green-50/30" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={`size-10 rounded-full ${roleConfig.bg} flex items-center justify-center`}>
            <RoleIcon className={`size-5 ${roleConfig.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm truncate">{staff.name || staff.email?.split("@")[0]}</p>
              <Badge variant="outline" className="text-xs">
                {roleConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className={`size-2 rounded-full ${status.color}`} />
              <span className={`text-xs ${status.textColor}`}>{status.label}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t">
          <div className="text-center">
            <p className="text-lg font-bold">{staffOrders.length}</p>
            <p className="text-xs text-muted-foreground">Orders</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-orange-600">{preparingCount}</p>
            <p className="text-xs text-muted-foreground">Preparing</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">{readyCount}</p>
            <p className="text-xs text-muted-foreground">Ready</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-purple-600">{assignedTables.length}</p>
            <p className="text-xs text-muted-foreground">Tables</p>
          </div>
        </div>

        {assignedTables.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Assigned Tables:</p>
            <div className="flex gap-1 flex-wrap">
              {assignedTables.slice(0, 5).map((t) => (
                <Badge key={t._id} variant="outline" className="text-xs">
                  T{t.tableNumber}
                </Badge>
              ))}
              {assignedTables.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{assignedTables.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const StaffDetailsDrawer = ({ staff, shift, activeOrders, tables, allStaff, open, onClose, onAssignTable }) => {
  const roleConfig = ROLE_CONFIG[staff?.role?.toLowerCase()] || ROLE_CONFIG.waiter;
  const RoleIcon = roleConfig.icon;

  const staffOrders = useMemo(
    () =>
      activeOrders.filter(
        (o) => o.assignedWaiterId === staff?._id && !["COMPLETED", "CANCELLED"].includes(o.orderStatus)
      ),
    [activeOrders, staff]
  );

  const assignedTableIds = useMemo(() => {
    const ids = new Set();
    staffOrders.forEach((o) => {
      if (o.tableId?._id) ids.add(o.tableId._id);
    });
    return ids;
  }, [staffOrders]);

  const assignedTables = useMemo(
    () => tables.filter((t) => assignedTableIds.has(t._id)),
    [tables, assignedTableIds]
  );

  const status = staff ? getStaffStatus(staff, shift, activeOrders) : null;
  const preparingCount = staffOrders.filter((o) => ["PREPARING", "CONFIRMED"].includes(o.orderStatus)).length;
  const readyCount = staffOrders.filter((o) => o.orderStatus === "READY").length;

  if (!staff) return null;

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()} direction="right">
      <DrawerContent className="max-w-md">
        <DrawerHeader>
          <div className="flex items-center gap-3">
            <div className={`size-12 rounded-full ${roleConfig.bg} flex items-center justify-center`}>
              <RoleIcon className={`size-6 ${roleConfig.color}`} />
            </div>
            <div>
              <DrawerTitle>{staff.name}</DrawerTitle>
              <DrawerDescription>{staff.email}</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {/* Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`size-3 rounded-full ${status?.color}`} />
                  <span className={`font-medium ${status?.textColor}`}>{status?.label}</span>
                </div>
                {shift && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Shift started: {new Date(shift.startedAt).toLocaleTimeString()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workload */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Current Workload</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{staffOrders.length}</p>
                    <p className="text-xs text-muted-foreground">Active Orders</p>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{preparingCount}</p>
                    <p className="text-xs text-muted-foreground">Preparing</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{readyCount}</p>
                    <p className="text-xs text-muted-foreground">Ready</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assigned Tables */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Assigned Tables ({assignedTables.length})</span>
                  <Button size="sm" variant="outline" onClick={() => onAssignTable?.(staff)}>
                    <UserCog className="size-3 mr-1" /> Reassign
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignedTables.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tables assigned</p>
                ) : (
                  <div className="space-y-2">
                    {assignedTables.map((table) => {
                      const tableOrders = staffOrders.filter(
                        (o) => o.tableId?._id === table._id
                      );
                      return (
                        <div
                          key={table._id}
                          className="flex items-center justify-between p-2 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">Table {table.tableNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {tableOrders.length} orders
                            </p>
                          </div>
                          <Badge variant="outline">
                            {table.capacity || 4} seats
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Orders */}
            {staffOrders.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Active Orders ({staffOrders.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {staffOrders.slice(0, 5).map((order) => (
                      <div
                        key={order._id}
                        className="flex items-center justify-between p-2 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            #{order.orderNumber || order._id?.slice(-6)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Table {order.tableId?.tableNumber || "—"}
                          </p>
                        </div>
                        <Badge
                          className={
                            order.orderStatus === "PREPARING"
                              ? "bg-orange-500"
                              : order.orderStatus === "READY"
                              ? "bg-green-500"
                              : "bg-blue-500"
                          }
                        >
                          {order.orderStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

const ManagerStaffPanel = ({ branchId }) => {
  const navigate = useNavigate();
  const { staff, fetchStaffByBranch, isLoading } = useUserStore();
  const { branchShifts, fetchBranchShifts } = useShiftStore();
  const { orders, getBranchOrders } = useOrderStore();
  const { tables, getTablesByBranch } = useTableStore();

  const [viewMode, setViewMode] = useState("cards");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    if (branchId) {
      fetchStaffByBranch(branchId);
      fetchBranchShifts(branchId);
      getBranchOrders(branchId, { limit: 100 });
      getTablesByBranch(branchId);
    }
  }, [branchId, fetchStaffByBranch, fetchBranchShifts, getBranchOrders, getTablesByBranch]);

  const shiftStaffMap = useMemo(() => {
    const map = {};
    (branchShifts || []).forEach((shift) => {
      if (shift.userId?._id) {
        map[shift.userId._id] = shift;
      }
    });
    return map;
  }, [branchShifts]);

  const activeOrders = useMemo(
    () => orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.orderStatus)),
    [orders]
  );

  const filteredStaff = useMemo(() => {
    let result = staff;

    if (roleFilter !== "all") {
      result = result.filter((s) => s.role?.toLowerCase() === roleFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((s) => {
        const shift = shiftStaffMap[s._id];
        const status = getStaffStatus(s, shift, activeOrders);
        return status.key === statusFilter;
      });
    }

    return result;
  }, [staff, roleFilter, statusFilter, shiftStaffMap, activeOrders]);

  const statusCounts = useMemo(() => {
    const counts = { all: staff.length, working: 0, available: 0, busy: 0, break: 0, offline: 0 };

    staff.forEach((s) => {
      const shift = shiftStaffMap[s._id];
      const status = getStaffStatus(s, shift, activeOrders);
      counts[status.key]++;
    });

    return counts;
  }, [staff, shiftStaffMap, activeOrders]);

  const staffByRole = useMemo(() => ({
    manager: staff.filter((s) => s.role?.toLowerCase() === "manager"),
    waiter: staff.filter((s) => s.role?.toLowerCase() === "waiter"),
    cashier: staff.filter((s) => s.role?.toLowerCase() === "cashier"),
    kitchen: staff.filter((s) => s.role?.toLowerCase() === "kitchen"),
  }), [staff]);

  const statusTabs = [
    { key: "all", label: "All", count: statusCounts.all },
    { key: "working", label: "Working", count: statusCounts.working, color: "text-green-600" },
    { key: "available", label: "Available", count: statusCounts.available, color: "text-blue-600" },
    { key: "busy", label: "Busy", count: statusCounts.busy, color: "text-orange-600" },
    { key: "break", label: "Break", count: statusCounts.break, color: "text-yellow-600" },
    { key: "offline", label: "Offline", count: statusCounts.offline, color: "text-gray-500" },
  ];

  const roleTabs = [
    { key: "all", label: "All Staff" },
    { key: "waiter", label: `Waiters (${staffByRole.waiter.length})` },
    { key: "kitchen", label: `Kitchen (${staffByRole.kitchen.length})` },
    { key: "cashier", label: `Cashiers (${staffByRole.cashier.length})` },
    { key: "manager", label: `Managers (${staffByRole.manager.length})` },
  ];

  if (isLoading && staff.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staff Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4" />
              Staff Overview
            </CardTitle>
            <div className="flex gap-2">
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-2 ${viewMode === "cards" ? "bg-muted" : ""}`}
                  onClick={() => setViewMode("cards")}
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

          {/* Role Filter */}
          <div className="flex gap-1 flex-wrap mt-2 overflow-x-auto pb-1">
            {roleTabs.map((tab) => (
              <Badge
                key={tab.key}
                variant={roleFilter === tab.key ? "default" : "outline"}
                className="cursor-pointer text-xs whitespace-nowrap"
                onClick={() => setRoleFilter(tab.key)}
              >
                {tab.label}
              </Badge>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex gap-1 flex-wrap mt-1 overflow-x-auto pb-1">
            {statusTabs.map((tab) => (
              <Badge
                key={tab.key}
                variant={statusFilter === tab.key ? "default" : "outline"}
                className={`cursor-pointer text-xs whitespace-nowrap ${tab.color || ""}`}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label} ({tab.count})
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {filteredStaff.length === 0 ? (
            <EmptyState
              title="No staff found"
              description="Staff will appear here once added."
              icon={Users}
            />
          ) : viewMode === "cards" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredStaff.map((s) => (
                <StaffWorkloadCard
                  key={s._id}
                  staff={s}
                  shift={shiftStaffMap[s._id]}
                  activeOrders={activeOrders}
                  tables={tables}
                  onClick={() => setSelectedStaff(s)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStaff.map((s) => {
                const shift = shiftStaffMap[s._id];
                const staffOrders = activeOrders.filter(
                  (o) => o.assignedWaiterId === s._id
                );
                const status = getStaffStatus(s, shift, activeOrders);
                const roleConfig = ROLE_CONFIG[s.role?.toLowerCase()] || ROLE_CONFIG.waiter;

                return (
                  <div
                    key={s._id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedStaff(s)}
                  >
                    <div className={`size-10 rounded-full ${roleConfig.bg} flex items-center justify-center`}>
                      <roleConfig.icon className={`size-5 ${roleConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {roleConfig.label}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <div className={`size-2 rounded-full ${status.color}`} />
                      <span className={`text-xs ${status.textColor}`}>{status.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{staffOrders.length}</p>
                      <p className="text-xs text-muted-foreground">orders</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <StaffDetailsDrawer
        staff={selectedStaff}
        shift={selectedStaff ? shiftStaffMap[selectedStaff._id] : null}
        activeOrders={activeOrders}
        tables={tables}
        allStaff={staff}
        open={!!selectedStaff}
        onClose={() => setSelectedStaff(null)}
        onAssignTable={(staff) => {
          // No server-side table-assignment model exists (W1): the Table model
          // has no assignedWaiterId. Route the manager to Table Management,
          // where tables and QR codes are actually managed.
          setSelectedStaff(null);
          toast.info(`Manage ${staff?.name || "staff"} tables in Table Management`);
          navigate("/manager/tables");
        }}
      />
    </>
  );
};

export default ManagerStaffPanel;
