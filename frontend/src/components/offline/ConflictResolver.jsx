import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, X, GitMerge } from 'lucide-react';
import { toast } from 'sonner';
import syncEngine from '@/lib/syncEngine';
import { useOfflineStore } from '@/store/useOfflineStore';

const ConflictResolver = ({ conflict }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { removeConflict } = useOfflineStore();

  if (!conflict) return null;

  const handleResolve = async (resolution) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await syncEngine.resolveConflict(conflict.clientRefId, resolution);
      if (res.success) {
        setResult({ type: 'success', message: 'Conflict resolved successfully' });
        setTimeout(() => {
          removeConflict(conflict.clientRefId);
        }, 1500);
      } else {
        setResult({ type: 'error', message: res.message });
      }
    } catch (err) {
      setResult({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const formatData = (data) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="conflict-resolver p-4 border rounded-lg bg-white border-yellow-200">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={20} className="text-yellow-600" />
        <h6 className="mb-0 font-semibold text-yellow-700">Sync Conflict Detected</h6>
        <Badge variant="secondary" className="ml-auto">{conflict.operationType}</Badge>
      </div>

      <div className="text-xs text-muted-foreground mb-2">
        Client Ref: <code className="text-xs">{conflict.clientRefId}</code>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-2 bg-muted rounded">
          <strong className="d-block mb-1 text-xs">Your Entry (Local)</strong>
          <pre className="text-xs mb-0 overflow-auto max-h-[150px]">
            {formatData(conflict.orderData || conflict.paymentData || conflict.stockData || conflict.data)}
          </pre>
        </div>
        <div className="p-2 bg-muted rounded">
          <strong className="d-block mb-1 text-xs">Server Data</strong>
          <pre className="text-xs mb-0 overflow-auto max-h-[150px]">
            {formatData(conflict.serverData || {})}
          </pre>
        </div>
      </div>

      {result && (
        <div className={`p-2 rounded text-sm mb-3 ${result.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {result.message}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleResolve('USE_LOCAL')}
          disabled={loading}
          className="flex items-center gap-1"
        >
          <Check size={14} />
          Use My Entry
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleResolve('USE_SERVER')}
          disabled={loading}
          className="flex items-center gap-1"
        >
          <X size={14} />
          Use Server Data
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleResolve('MERGE')}
          disabled={loading}
          className="flex items-center gap-1"
        >
          <GitMerge size={14} />
          Merge
        </Button>
      </div>
    </div>
  );
};

export default ConflictResolver;
