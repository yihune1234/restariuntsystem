import React, { useEffect, useState } from "react";
import { useBranchStore } from "@/store/useBranchStore";
import { useAuthStore } from "@/store/useAuthStore";
import OwnerMenuManager from "./OwnerMenuManager";
import OwnerDashboardPage from "./OwnerDashboard";
import OwnerUsersPage from "./OwnerUsersPage";
import OwnerOperationsPage from "./OwnerOperationsPage";
import TableManagement from "../manager/TableManagement";
import { OrganizationSettingsPage } from "./OrganizationSettingsPage";
import OwnerFinancialOverview from "./components/OwnerFinancialOverview";
import OwnerTransactions from "./components/OwnerTransactions";
import OwnerRevenueAnalytics from "./components/OwnerRevenueAnalytics";
import OwnerOrdersList from "./components/OwnerOrdersList";
import OwnerPermissionsComponent from "./components/OwnerPermissions";
import OwnerCrossBranchAnalysis from "./components/OwnerCrossBranchAnalysis";
import OwnerInventoryOverview from "./components/OwnerInventoryOverview";
import OwnerFeedbackAnalytics from "./components/OwnerFeedbackAnalytics";
import WaiterAssignmentPortal from "../manager/components/WaiterAssignmentPortal";
import StaffProfile from "../shared/StaffProfile";
import { Card, CardContent } from "@/components/ui/card";

export const OwnerDashboard = () => <OwnerDashboardPage />;

export const OwnerOrders = () => <OwnerOrdersList />;
export const OwnerMenu = () => <OwnerMenuManager />;
export const OwnerPayments = () => <OwnerTransactions />;
export const OwnerSales = () => <OwnerFinancialOverview />;
export const OwnerReports = () => <OwnerRevenueAnalytics />;
export const OwnerManagers = () => <OwnerUsersPage />;
export const OwnerUsers = () => <OwnerUsersPage />;
export const OwnerProfile = () => <StaffProfile />;
export const OwnerSettingsPage = () => <OrganizationSettingsPage />;
export const OwnerTables = () => <OwnerTablesPage />;
export const OwnerPermissions = () => <OwnerPermissionsComponent />;
export const OwnerOperations = () => <OwnerOperationsPage />;
export const OwnerFeedback = () => <OwnerFeedbackAnalytics />;
export const OwnerWaiterAssignment = () => {
  const { authUser } = useAuthStore();
  return <WaiterAssignmentPortal branchId={authUser?.branchId} />;
};
export const OwnerCrossBranch = () => <OwnerCrossBranchAnalysis />;
export const OwnerInventoryPage = () => <OwnerInventoryOverview />;

const OwnerTablesPage = () => {
  const [selectedBranch, setSelectedBranch] = useState("");
  const { branches, fetchBranches } = useBranchStore();

  useEffect(() => {
    // Single-branch mode: auto-resolve organization
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0]._id);
    }
  }, [branches, selectedBranch]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          Tables &amp; QR
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage tables, QR codes, and regenerate table QR tokens.
        </p>
      </div>
      {selectedBranch ? (
        <TableManagement branchId={selectedBranch} />
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Loading branch information...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
