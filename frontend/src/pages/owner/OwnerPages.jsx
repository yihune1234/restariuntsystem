import React, { useState } from "react";
import OwnerMenuManager from "./OwnerMenuManager";
import OwnerDashboardPage from "./OwnerDashboard";
import TableManagement from "../manager/TableManagement";
import CreateOrder from "../shared/CreateOrder";
import { OrganizationSettingsPage } from "./OrganizationSettingsPage";
import OwnerFinancialOverview from "./components/OwnerFinancialOverview";
import OwnerRevenueAnalytics from "./components/OwnerRevenueAnalytics";
import OwnerPermissionsComponent from "./components/OwnerPermissions";
import OwnerInventoryOverview from "./components/OwnerInventoryOverview";
import OwnerFeedbackAnalytics from "./components/OwnerFeedbackAnalytics";
import OwnerStaffPanel from "./components/OwnerStaffPanel";
import StaffProfile from "../shared/StaffProfile";
import { Card, CardContent } from "@/components/ui/card";
import { UtensilsCrossed, Users, LayoutGrid, BarChart3, Settings, ShoppingCart, DollarSign } from "lucide-react";
import ManagerTableOverview from "../manager/components/ManagerTableOverview";
import ManagerLiveOrders from "../manager/components/ManagerLiveOrders";

export const OwnerDashboard = () => <OwnerDashboardPage />;

export const OwnerOrders = () => (
  <div className="p-4 lg:p-6 space-y-4">
    <div>
      <h1 className="text-xl font-bold flex items-center gap-2">
        <ShoppingCart className="size-5" /> Orders
      </h1>
      <p className="text-sm text-muted-foreground">Manage all orders and confirm payments</p>
    </div>
    <ManagerLiveOrders title="All Orders" />
  </div>
);

export const OwnerCreateOrder = () => (
  <div className="p-4 lg:p-6 space-y-4">
    <div>
      <h1 className="text-xl font-bold flex items-center gap-2">
        <ShoppingCart className="size-5" /> Create Order
      </h1>
      <p className="text-sm text-muted-foreground">Create a new order for a table or walk-in customer</p>
    </div>
    <CreateOrder />
  </div>
);

export const OwnerMenu = () => <OwnerMenuManager />;

export const OwnerTables = () => {
  const [tab, setTab] = useState("overview");
  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <LayoutGrid className="size-5" /> Tables & QR
        </h1>
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

export const OwnerEmployees = () => (
  <div className="p-4 lg:p-6 space-y-4">
    <div>
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Users className="size-5" /> Employees
      </h1>
      <p className="text-sm text-muted-foreground">Track staff activity and manage all employees with full CRUD</p>
    </div>
    <OwnerStaffPanel />
  </div>
);

export const OwnerUsers = () => <OwnerEmployees />;
export const OwnerProfile = () => <StaffProfile />;
export const OwnerSettingsPage = () => <OrganizationSettingsPage />;

export const OwnerReports = () => (
  <div className="p-4 lg:p-6 space-y-4">
    <div>
      <h1 className="text-xl font-bold flex items-center gap-2">
        <BarChart3 className="size-5" /> Reports & Analytics
      </h1>
      <p className="text-sm text-muted-foreground">View restaurant performance and analytics</p>
    </div>
    <OwnerRevenueAnalytics />
  </div>
);

export const OwnerSales = () => <OwnerFinancialOverview />;
export const OwnerPermissions = () => <OwnerPermissionsComponent />;
export const OwnerOperations = () => (
  <Card>
    <CardContent className="p-6">
      <p className="text-muted-foreground">Operations management not available in single-restaurant mode.</p>
    </CardContent>
  </Card>
);
export const OwnerFeedback = () => <OwnerFeedbackAnalytics />;
export const OwnerInventoryPage = () => <OwnerInventoryOverview />;
export const OwnerCrossBranch = () => (
  <Card>
    <CardContent className="p-6">
      <p className="text-muted-foreground">Cross-branch analysis is not available in single-restaurant mode.</p>
    </CardContent>
  </Card>
);
