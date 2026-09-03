import { WifiOff, CloudUpload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOfflineStore } from '@/store/useOfflineStore';
import syncEngine from '@/lib/syncEngine';

const OfflineStatusBanner = () => {
  const { isOnline, isSyncing, pendingCount } = useOfflineStore();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="offline-status-banner p-2 mb-3 flex items-center justify-between rounded-lg"
         style={{ 
           backgroundColor: isOnline ? '#fff3cd' : '#f8d7da',
           border: `1px solid ${isOnline ? '#ffc107' : '#dc3545'}`
         }}>
      <div className="flex items-center gap-2">
        <WifiOff size={18} style={{ color: isOnline ? '#856404' : '#721c24' }} />
        <span style={{ color: isOnline ? '#856404' : '#721c24', fontWeight: 500 }}>
          {isOnline ? `${pendingCount} pending operation${pendingCount !== 1 ? 's' : ''} to sync` : 'You are offline'}
        </span>
      </div>
      {isOnline && pendingCount > 0 && (
        <Button
          size="sm"
          variant={isSyncing ? 'secondary' : 'outline'}
          onClick={() => syncEngine.checkAndSync()}
          disabled={isSyncing}
          className={isSyncing ? '' : 'border-yellow-500 text-yellow-700 hover:bg-yellow-50'}
        >
          {isSyncing ? (
            <CloudUpload className="size-4 animate-pulse" />
          ) : (
            <CloudUpload className="size-4" />
          )}
          <span className="ml-1">{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </Button>
      )}
    </div>
  );
};

export default OfflineStatusBanner;
