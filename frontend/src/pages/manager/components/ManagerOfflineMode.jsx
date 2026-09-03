import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import axiosInstance from "@/axios/axiosInstace";
import OfflineEntryForm from "@/components/offline/OfflineEntryForm";
import { PAYMENT_METHOD_OPTIONS } from "@/config/paymentMethods";
import { appliedSummary } from "@/components/offline/manualEntryStatus";
import {
  WifiOff, Plus, Clock, User, CheckCircle, XCircle, AlertCircle,
  Banknote, CreditCard, Smartphone, RefreshCw, Package, Trash2, Receipt,
  History, ChevronRight,
} from "lucide-react";

const methodIcon = (id) => PAYMENT_METHOD_OPTIONS.find((m) => m.id === id)?.icon || Receipt;
const operationIcon = (type) => {
  switch (type) {
    case 'ORDER': return Receipt;
    case 'PAYMENT': return Banknote;
    case 'STOCK': return Package;
    case 'WASTE': return Trash2;
    case 'EXPENSE': return CreditCard;
    default: return Receipt;
  }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const ManualTransactionCard = ({ transaction, onApprove, onReject, canApprove, isProcessing }) => {
  const isPending = transaction.status === "PENDING";
  const isApproved = transaction.status === "APPROVED";
  const isRejected = transaction.status === "REJECTED";
  const OperationIcon = operationIcon(transaction.operationType);

  return (
    <Card className={`${isPending ? 'border-yellow-200 bg-yellow-50/30' : isApproved ? 'border-green-200' : isRejected ? 'border-red-200 opacity-75' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-lg flex items-center justify-center ${
              isPending ? 'bg-yellow-100' : isApproved ? 'bg-green-100' : isRejected ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              <OperationIcon className={`size-5 ${
                isPending ? 'text-yellow-600' : isApproved ? 'text-green-600' : isRejected ? 'text-red-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">
                  {transaction.operationType === 'STOCK' && transaction.stockData?.operationType === 'RECEIVED' 
                    ? `+${transaction.stockData?.changeQuantity || 0}`
                    : transaction.operationType === 'WASTE'
                    ? `-${transaction.stockData?.changeQuantity || 0}`
                    : `${(transaction.total || 0).toLocaleString()} ETB`}
                </p>
                <Badge variant={isPending ? "secondary" : isApproved ? "default" : "destructive"} className="text-xs">
                  {transaction.operationType}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {transaction.stockData?.foodNameSnapshot || transaction.reason || 'Manual entry'}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mb-2">
          <Badge variant={isPending ? "outline" : isApproved ? "default" : "destructive"} className="capitalize">
            {transaction.status?.toLowerCase()}
          </Badge>
          {appliedSummary(transaction) && (
            <Badge variant="default" className="text-green-700 border-green-300 bg-green-50">
              Applied
            </Badge>
          )}
          </div>
        </div>

        <div className="space-y-1.5 mb-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="size-3" />
            <span>Actual: {formatDateTime(transaction.originalTransactionTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="size-3" />
            <span>Entered by: {transaction.enteredBy?.name || 'Unknown'}</span>
            <span className="text-muted">·</span>
            <span>{formatDateTime(transaction.createdAt)}</span>
          </div>
          {isApproved && transaction.approvedBy && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="size-3" />
              <span>Approved by: {transaction.approvedBy?.name || 'Unknown'}</span>
              <span className="text-muted">·</span>
              <span>{formatDateTime(transaction.approvedAt)}</span>
            </div>
          )}
          {appliedSummary(transaction) && (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="size-3" />
              <span>{appliedSummary(transaction)}</span>
            </div>
          )}
          {isRejected && transaction.rejectedBy && (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="size-3" />
              <span>Rejected by: {transaction.rejectedBy?.name || 'Unknown'}</span>
              <span className="text-muted">·</span>
              <span>{formatDateTime(transaction.rejectedAt)}</span>
            </div>
          )}
          {transaction.rejectionReason && (
            <div className="flex items-start gap-2 text-red-500 mt-1 pl-5">
              <AlertCircle className="size-3 mt-0.5" />
              <span className="text-xs">Reason: {transaction.rejectionReason}</span>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground mb-3">
          <span className="capitalize">Reason: {transaction.reason || 'System outage'}</span>
          {transaction.outageType && transaction.outageType !== 'OTHER' && (
            <span className="ml-2 text-muted">({transaction.outageType.replace('_', ' ').toLowerCase()})</span>
          )}
        </div>

        {transaction.notes && (
          <div className="p-2 bg-muted rounded text-xs mb-3">
            Notes: {transaction.notes}
          </div>
        )}

        {transaction.orderId && (
          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <History className="size-3" />
            <span>Order created: {transaction.orderId}</span>
          </div>
        )}

        {isPending && canApprove && (
          <div className="flex gap-2 pt-3 border-t">
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => onApprove(transaction._id)} disabled={isProcessing}>
              <CheckCircle className="size-3 mr-1" />{isProcessing ? "Processing..." : "Approve"}
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => onReject(transaction._id)} disabled={isProcessing}>
              <XCircle className="size-3 mr-1" /> Reject
            </Button>
          </div>
        )}

        {isPending && !canApprove && (
          <div className="text-xs text-muted-foreground text-center pt-3 border-t">
            Awaiting manager approval
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ManagerOfflineMode = ({ branchId }) => {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0, rejected: 0, totalAmount: 0 });
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const loadTransactions = async () => {
    if (!branchId) return;
    setIsLoading(true);
    try {
      const res = await axiosInstance.get(`/offline-transactions/${branchId}/pending`);
      setTransactions(res.data?.data?.transactions || []);
    } catch (err) {
      console.error("Failed to load offline transactions", err);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!branchId) return;
    try {
      const res = await axiosInstance.get(`/offline-transactions/${branchId}/stats`);
      const s = res.data?.data?.stats || {};
      setStats({
        total: s.totalTransactions || 0,
        pending: s.pendingCount || 0,
        verified: s.approvedCount || 0,
        rejected: s.rejectedCount || 0,
        totalAmount: s.totalAmount || 0
      });
    } catch (err) {
      console.error("Failed to load offline stats", err);
    }
  };

  useEffect(() => { loadTransactions(); loadStats(); }, [branchId]);

  const approveTransaction = async (id) => {
    setProcessingId(id);
    try {
      await axiosInstance.post(`/offline-transactions/${id}/approve`);
      toast.success("Transaction approved. Business logic applied.");
      await Promise.all([loadTransactions(), loadStats()]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve");
    } finally {
      setProcessingId(null);
    }
  };

  const rejectTransaction = async (id) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;
    
    setProcessingId(id);
    try {
      await axiosInstance.post(`/offline-transactions/${id}/reject`, { reason });
      toast.success("Transaction rejected");
      await Promise.all([loadTransactions(), loadStats()]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (activeTab === "pending") return t.status === "PENDING";
    if (activeTab === "approved") return t.status === "APPROVED";
    if (activeTab === "rejected") return t.status === "REJECTED";
    return true;
  });

  const refreshAll = () => { loadTransactions(); loadStats(); };

  return (
    <div className="space-y-4">
      <Card className="border-orange-200 bg-orange-50/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <WifiOff className="size-6 text-orange-600" />
              <div>
                <p className="font-semibold">Manual / Offline Operations</p>
                <p className="text-sm text-muted-foreground">
                  Record operations that happened outside the system. Approved entries become real POS transactions.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refreshAll} disabled={isLoading}>
                <RefreshCw className={`size-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
              <Button size="sm" onClick={() => setShowForm(!showForm)}>
                <Plus className="size-4 mr-1" /> Add Entry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center"><Receipt className="size-5 mx-auto mb-1 text-gray-600" /><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card className="bg-yellow-50 border-yellow-200"><CardContent className="p-3 text-center"><Clock className="size-5 mx-auto mb-1 text-yellow-600" /><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card className="bg-green-50 border-green-200"><CardContent className="p-3 text-center"><CheckCircle className="size-5 mx-auto mb-1 text-green-600" /><p className="text-2xl font-bold text-green-600">{stats.verified}</p><p className="text-xs text-muted-foreground">Approved</p></CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardContent className="p-3 text-center"><XCircle className="size-5 mx-auto mb-1 text-red-600" /><p className="text-2xl font-bold text-red-600">{stats.rejected}</p><p className="text-xs text-muted-foreground">Rejected</p></CardContent></Card>
        <Card className="bg-blue-50 border-blue-200"><CardContent className="p-3 text-center"><Banknote className="size-5 mx-auto mb-1 text-blue-600" /><p className="text-2xl font-bold text-blue-600">{stats.totalAmount.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total ETB</p></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="size-4" /> Record Manual Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OfflineEntryForm onSuccess={() => { setShowForm(false); refreshAll(); }} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="size-4" /> Manual Entries
            </CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                <TabsTrigger value="pending" className="text-yellow-600">Pending ({stats.pending})</TabsTrigger>
                <TabsTrigger value="approved" className="text-green-600">Approved ({stats.verified})</TabsTrigger>
                <TabsTrigger value="rejected" className="text-red-600">Rejected ({stats.rejected})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <EmptyState
              title="No entries found"
              description={activeTab === "all" ? "Manual entries will appear here once recorded." : `No ${activeTab} entries.`}
              icon={WifiOff}
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTransactions.map((transaction) => (
                <ManualTransactionCard
                  key={transaction._id}
                  transaction={transaction}
                  onApprove={approveTransaction}
                  onReject={rejectTransaction}
                  canApprove={true}
                  isProcessing={processingId === transaction._id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">How Manual Entries Work:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Staff records an operation that happened offline/marually</li>
              <li>Entry is saved as PENDING with full details</li>
              <li>Manager reviews and approves or rejects</li>
              <li>On approval: Real POS transaction is created (Order, Payment, Inventory, etc.)</li>
              <li>Complete audit trail is maintained (who, when, what, why)</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerOfflineMode;
