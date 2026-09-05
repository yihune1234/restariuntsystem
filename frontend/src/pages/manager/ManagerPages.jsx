import React, { useState } from "react";
import ReportsAnalytics from "../shared/ReportsAnalytics";
import OrderList from "../shared/OrderList";
import MenuManager from "../shared/MenuManager";
import StaffRoster from "../shared/StaffRoster";
import StaffProfile from "../shared/StaffProfile";
import BranchSettings from "./BranchSettings";
import TableManagement from "./TableManagement";
import CreateOrder from "../shared/CreateOrder";
import { DailyClosingManager } from "./DailyClosingManager";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ManagerOverview,
  ManagerLiveOrders,
  ManagerTableOverview,
  ManagerStaffPanel,
  ManagerKitchenBoard,
  ManagerComplaints,
  ManagerMenuDashboard,
} from "./components";
import {
  Users,
  UtensilsCrossed,
  Boxes,
} from "lucide-react";

export const ManagerDashboard = () => {
  return <ManagerOverview />;
};

export const ManagerOrders = () => {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">Manage all restaurant orders</p>
      </div>
      <ManagerLiveOrders title="All Orders" />
    </div>
  );
};

export const ManagerCreateOrder = () => {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Order</h1>
        <p className="text-sm text-muted-foreground">Create a new order for a table or walk-in customer</p>
      </div>
      <CreateOrder />
    </div>
  );
};

export const ManagerKitchen = () => {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kitchen Board</h1>
        <p className="text-sm text-muted-foreground">Monitor kitchen stations and order preparation</p>
      </div>
      <ManagerKitchenBoard />
    </div>
  );
};

export const ManagerTables = () => {
  const [tab, setTab] = useState("overview");
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tables & QR</h1>
        <p className="text-sm text-muted-foreground">Manage tables and QR code sessions</p>
      </div>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setTab("overview")}
            className={`px-1 py-2 text-sm font-medium border-b-2 transition-all ${
              tab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Floor Overview
          </button>
          <button
            onClick={() => setTab("manage")}
            className={`px-1 py-2 text-sm font-medium border-b-2 transition-all ${
              tab === "manage"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Manage Tables
          </button>
        </div>
      </div>
      {tab === "overview" && <ManagerTableOverview />}
      {tab === "manage" && <TableManagement />}
    </div>
  );
};

export const ManagerTransactions = () => {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-sm text-muted-foreground">View all completed and cancelled transactions</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
        <CardContent>
          <EmptyState title="No transactions" description="Transactions will appear here." />
        </CardContent>
      </Card>
    </div>
  );
};

export const ManagerCustomers = () => {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customer Issues</h1>
        <p className="text-sm text-muted-foreground">Handle customer complaints and feedback</p>
      </div>
      <ManagerComplaints />
    </div>
  );
};

export const ManagerMenu = () => {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UtensilsCrossed className="size-6" />
          Menu Management
        </h1>
        <p className="text-sm text-muted-foreground">Manage categories and food items</p>
      </div>
      <MenuManager />
    </div>
  );
};

export const ManagerStaff = () => {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="size-6" />
          Staff & Assignments
        </h1>
        <p className="text-sm text-muted-foreground">Manage staff and workload distribution</p>
      </div>
      <ManagerStaffPanel />
    </div>
  );
};

export const ManagerProfile = () => <StaffProfile />;
export const ManagerReports = () => <ReportsAnalytics />;

export const ManagerInventoryPage = () => {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Boxes className="size-6" />
          Inventory Management
        </h1>
        <p className="text-sm text-muted-foreground">Track stock levels and inventory operations</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Inventory management is not available in single-restaurant mode.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export const ManagerBranchSettings = () => <BranchSettings />;

export const ManagerDaily = () => {
  return <DailyClosingManager />;
};

export const ManagerWaste = () => {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Waste Management</h1>
        <p className="text-sm text-muted-foreground">Track and approve waste records</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Waste management is not available in single-restaurant mode.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export const ManagerWaiterAssignment = () => {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Waiter Assignment</h1>
        <p className="text-sm text-muted-foreground">Assign waiters to sections</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Waiter assignment is not available in single-restaurant mode.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export const ManagerOffline = () => {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Offline Mode</h1>
        <p className="text-sm text-muted-foreground">Record manual transactions during system outages</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Offline mode is not available in single-restaurant mode.</p>
        </CardContent>
      </Card>
    </div>
  );
};
