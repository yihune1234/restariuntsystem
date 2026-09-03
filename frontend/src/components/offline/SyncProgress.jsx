import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOfflineStore } from '@/store/useOfflineStore';

const SyncProgress = () => {
  const { pendingCount, syncErrors, lastSyncTime, isSyncing } = useOfflineStore();

  if (pendingCount === 0 && syncErrors.length === 0 && !lastSyncTime && !isSyncing) {
    return null;
  }

  const total = pendingCount + syncErrors.length;
  const syncedPercent = total > 0 ? Math.round(((total - pendingCount) / total) * 100) : 100;

  return (
    <div className="sync-progress p-4 border rounded-lg bg-white">
      <h6 className="mb-3 font-semibold">Sync Status</h6>
      
      {isSyncing && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-primary" />
            <span>Syncing in progress...</span>
          </div>
          <Progress value={75} />
        </div>
      )}

      {!isSyncing && pendingCount > 0 && (
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span>Pending operations:</span>
            <Badge variant="secondary">{pendingCount}</Badge>
          </div>
          <Progress value={syncedPercent} />
          <span className="text-xs text-muted-foreground mt-1">{syncedPercent}% complete</span>
        </div>
      )}

      {lastSyncTime && (
        <div className="text-muted-foreground text-xs mb-2">
          Last sync: {new Date(lastSyncTime).toLocaleString()}
        </div>
      )}

      {syncErrors.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-destructive" />
            <span>Sync Errors ({syncErrors.length})</span>
          </div>
          <div className="space-y-1">
            {syncErrors.slice(-5).map((err, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="text-destructive">{err.message}</span>
                <span className="text-muted-foreground text-xs">{new Date(err.time).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingCount === 0 && syncErrors.length === 0 && lastSyncTime && !isSyncing && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle size={16} />
          <span>All operations synced</span>
        </div>
      )}
    </div>
  );
};

export default SyncProgress;
