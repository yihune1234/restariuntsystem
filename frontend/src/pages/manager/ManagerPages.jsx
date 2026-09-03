import React, { useEffect } from "react";
import ReportsAnalytics from "../shared/ReportsAnalytics";
import OrderList from "../shared/OrderList";
import MenuManager from "../shared/MenuManager";
import StaffRoster from "../shared/StaffRoster";
import StaffProfile from "../shared/StaffProfile";
import BranchSettings from "./BranchSettings";
import TableManagement from "./TableManagement";
import WaiterAssignmentPortal from "./components/WaiterAssignmentPortal";
import { DailyClosingManager } from "./DailyClosingManager";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrderStore } from "@/store/useOrderStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ManagerDashboardRealTime,
  ManagerOverview,
  ManagerLive,
  ManagerLiveOrders,
  ManagerTableOverview,
  ManagerAlerts,
  ManagerPaymentsPanel,
  ManagerStaffPanel,
  ManagerKitchenBoard,
  ManagerComplaints,
  ManagerWasteManagement,
  ManagerOfflineMode,
  ManagerMenuDashboard,
  ManagerInventoryDashboard,
} from "./components";
import {
  Users,
  ShoppingCart,
  Wallet,
  Receipt,
  ChefHat,
  Truck,
  Banknote,
  Clock,
  CheckCircle,
  AlertTriangle,
  UtensilsCrossed,
  Boxes,
} from "lucide-react";

export const ManagerDashboard = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  if (!branchId) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">No branch assigned yet. Please contact your system administrator.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ManagerOverview branchId={branchId} />
  );
};

export const ManagerOrders = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">Manage all branch orders</p>
      </div>
      <ManagerLiveOrders branchId={branchId} title="All Orders" />
    </div>
  );
};

export const ManagerKitchen = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kitchen Board</h1>
        <p className="text-sm text-muted-foreground">Monitor kitchen stations and order preparation</p>
      </div>
      <ManagerKitchenBoard branchId={branchId} />
    </div>
  );
};

export const ManagerTables = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tables & QR</h1>
        <p className="text-sm text-muted-foreground">Manage tables and QR code sessions</p>
      </div>
      <ManagerTableOverview branchId={branchId} />
    </div>
  );
};

export const ManagerPayments = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground">Monitor payments by method and status</p>
      </div>
      <ManagerPaymentsPanel branchId={branchId} />
    </div>
  );
};

export const ManagerTransactions = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;
  const { orders, getBranchOrders, isLoading } = useOrderStore();

  useEffect(() => {
    if (branchId) {
      getBranchOrders(branchId, { limit: 100 });
    }
  }, [branchId, getBranchOrders]);

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  const transactions = orders.filter(o => o.paymentStatus === "COMPLETED" || o.status === "DELIVERED" || o.status === "CANCELLED");
  const completedTx = transactions.filter(o => o.status !== "CANCELLED");
  const cancelledTx = transactions.filter(o => o.status === "CANCELLED");

  const totalCompleted = completedTx.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCancelled = cancelledTx.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-sm text-muted-foreground">View all completed and cancelled transactions</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-600">{completedTx.length}</p>
            <p className="text-sm font-semibold">{totalCompleted.toLocaleString()} ETB</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Cancelled</p>
            <p className="text-2xl font-bold text-red-600">{cancelledTx.length}</p>
            <p className="text-sm font-semibold">{totalCancelled.toLocaleString()} ETB</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Net Revenue</p>
            <p className="text-2xl font-bold">{(totalCompleted - totalCancelled).toLocaleString()} ETB</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <EmptyState title="No transactions" description="Transactions will appear here." />
          ) : (
            <div className="space-y-2">
              {transactions.map((order) => (
                <div key={order._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={order.status === "CANCELLED" ? "destructive" : "default"}>{order.status}</Badge>
                    <div>
                      <p className="font-medium">#{order.orderNumber || order._id?.slice(-6)}</p>
                      <p className="text-xs text-muted-foreground">{order.paymentStatus}</p>
                    </div>
                  </div>
                  <p className={`font-bold ${order.status === "CANCELLED" ? "text-red-600" : "text-green-600"}`}>
                    {order.status === "CANCELLED" ? "-" : "+"}{(order.total || 0).toLocaleString()} ETB
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const ManagerCustomers = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customer Issues</h1>
        <p className="text-sm text-muted-foreground">Handle customer complaints and feedback</p>
      </div>
      <ManagerComplaints branchId={branchId} />
    </div>
  );
};

export const ManagerMenu = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UtensilsCrossed className="size-6" />
          Menu Management
        </h1>
        <p className="text-sm text-muted-foreground">Manage meal types, categories, and food items</p>
      </div>
      <MenuManager externalBranchId={branchId} />
    </div>
  );
};
export const ManagerStaff = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="size-6" />
          Staff & Assignments
        </h1>
        <p className="text-sm text-muted-foreground">Manage staff, assignments, and workload distribution</p>
      </div>
      <ManagerStaffPanel branchId={branchId} />
    </div>
  );
};
export const ManagerProfile = () => <StaffProfile />;
export const ManagerReports = () => <ReportsAnalytics />;
export const ManagerInventoryPage = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Boxes className="size-6" />
          Inventory Management
        </h1>
        <p className="text-sm text-muted-foreground">Track stock levels, waste, and inventory operations</p>
      </div>
      <ManagerInventoryDashboard branchId={branchId} />
    </div>
  );
};
export const ManagerBranchSettings = () => <BranchSettings />;

export const ManagerDaily = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  return <DailyClosingManager branchId={branchId} />;
};

export const ManagerWaste = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Waste Management</h1>
        <p className="text-sm text-muted-foreground">Track and approve waste records</p>
      </div>
      <ManagerWasteManagement branchId={branchId} />
    </div>
  );
};

export const ManagerWaiterAssignment = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  return <WaiterAssignmentPortal branchId={branchId} />;
};

export const ManagerOffline = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Offline Mode</h1>
        <p className="text-sm text-muted-foreground">Record manual transactions during system outages</p>
      </div>
      <ManagerOfflineMode branchId={branchId} />
    </div>
  );
};
