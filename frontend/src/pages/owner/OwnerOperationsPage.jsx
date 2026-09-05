import React, { useState } from "react";
import { useOfflineStore } from "@/store/useOfflineStore";
import ManagerKitchenBoard from "../manager/components/ManagerKitchenBoard";
import OfflineStatusBanner from "@/components/offline/OfflineStatusBanner";
import SyncProgress from "@/components/offline/SyncProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import axiosInstance from "@/axios/axiosInstace";
import { syncEngine } from "@/lib/syncEngine";
import { ChefHat, Package, Banknote, WifiOff, Loader2 } from "lucide-react";

const OwnerOperationsPage = () => {
  const { pendingCount, isSyncing } = useOfflineStore();
  const [reconciling, setReconciling] = useState(false);

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

      <div>
        <h1 className="text-2xl font-bold">Operations</h1>
        <p className="text-sm text-muted-foreground">
          Monitor kitchen, inventory, and daily operations.
        </p>
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
        </TabsList>
        <TabsContent value="kitchen" className="mt-4">
          <ManagerKitchenBoard />
        </TabsContent>
        <TabsContent value="inventory" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Inventory management is available in the Manager view.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OwnerOperationsPage;
