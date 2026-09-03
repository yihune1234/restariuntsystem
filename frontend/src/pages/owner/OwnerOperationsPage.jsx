import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useBranchStore } from "@/store/useBranchStore";
import { useOfflineStore } from "@/store/useOfflineStore";
import ManagerKitchenBoard from "../manager/components/ManagerKitchenBoard";
import ManagerInventoryDashboard from "../manager/components/ManagerInventoryDashboard";
import { DailyClosingManager } from "../manager/DailyClosingManager";
import OfflineStatusBanner from "@/components/offline/OfflineStatusBanner";
import SyncProgress from "@/components/offline/SyncProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import axiosInstance from "@/axios/axiosInstace";
import { syncEngine } from "@/lib/syncEngine";
import { ChefHat, Package, Banknote, WifiOff, Loader2, Building2 } from "lucide-react";

/**
 * Owner operations hub. The Owner holds full backend authority across every
 * branch in the organization, so this page lets them drill into a selected
 * branch for the operational views that were previously Manager-only:
 *  - Kitchen board (monitor preparation)
 *  - Inventory (stock levels)
 *  - Daily close (+ final reconcile, which is OWNER-exclusive)
 *  - Offline-transaction reconcile (OWNER-exclusive)
 */
const OwnerOperationsPage = () => {
  const { authUser } = useAuthStore();
  const { branches, fetchBranches } = useBranchStore();
  const { pendingCount, isSyncing } = useOfflineStore();
  const [branchId, setBranchId] = useState("");
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    // Single-branch mode: auto-resolve organization
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (branches.length > 0 && !branchId) {
      setBranchId(branches[0]._id);
    }
  }, [branches, branchId]);

  const handleReconcileOffline = async () => {
    if (!branchId) return;
    setReconciling(true);
    try {
      const res = await axiosInstance.post(
        `/offline-transactions/${branchId}/reconcile`
      );
      toast.success(res.data?.message || "Offline transactions reconciled");
    } catch (err) {
      toast.error(err.backendMessage || "Failed to reconcile offline transactions");
    } finally {
      setReconciling(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      const result = await syncEngine.checkAndSync();
      if (result?.success) {
        toast.success(
          result.synced
            ? `${result.synced} offline record${result.synced !== 1 ? "s" : ""} synced`
            : "No pending offline records to sync"
        );
      } else {
        toast.error(result?.message || "Failed to sync offline records");
      }
    } catch (err) {
      toast.error(err.backendMessage || "Failed to sync offline records");
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <OfflineStatusBanner />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Branch Operations</h1>
          <p className="text-sm text-muted-foreground">
            Monitor kitchen, inventory, and reconcile each branch. Manager capabilities,
            now available org-wide to the owner.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-muted-foreground" />
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm min-w-[200px]"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            {(branches || []).map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!branchId ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Select a branch to view its operations.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Owner-exclusive reconcile actions */}
          <div className="grid md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Banknote className="size-4" /> Daily Close Reconcile
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                View the daily close summary and perform the final owner-level
                reconcile for this branch below.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <WifiOff className="size-4" /> Offline Transaction Reconcile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Approve the entire pending offline batch for this branch in one
                  action (OWNER only).
                </p>
                <Button
                  size="sm"
                  onClick={handleReconcileOffline}
                  disabled={reconciling}
                >
                  {reconciling ? <Loader2 className="animate-spin size-4" /> : <WifiOff className="size-4" />}
                  Reconcile Offline Transactions
                </Button>
              </CardContent>
            </Card>
          </div>

          {pendingCount > 0 && (
            <div className="grid md:grid-cols-2 gap-3">
              <SyncProgress />
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <WifiOff className="size-4" /> Sync Controls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {pendingCount} records pending sync. Sync now to push all offline data to the server.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleSyncAll}
                    disabled={isSyncing}
                  >
                    {isSyncing ? <Loader2 className="animate-spin size-4" /> : <WifiOff className="size-4" />}
                    {isSyncing ? 'Syncing...' : 'Sync All Offline Records'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="kitchen">
            <TabsList>
              <TabsTrigger value="kitchen"><ChefHat className="size-4 mr-1" /> Kitchen</TabsTrigger>
              <TabsTrigger value="inventory"><Package className="size-4 mr-1" /> Inventory</TabsTrigger>
              <TabsTrigger value="daily"><Banknote className="size-4 mr-1" /> Daily Close</TabsTrigger>
            </TabsList>
            <TabsContent value="kitchen" className="mt-4">
              <ManagerKitchenBoard branchId={branchId} />
            </TabsContent>
            <TabsContent value="inventory" className="mt-4">
              <ManagerInventoryDashboard branchId={branchId} />
            </TabsContent>
            <TabsContent value="daily" className="mt-4">
              <DailyClosingManager branchId={branchId} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default OwnerOperationsPage;