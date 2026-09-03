import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import axiosInstance from "@/axios/axiosInstace";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Trash2,
  Plus,
  AlertTriangle,
  Clock,
  User,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";

const WASTE_REASONS = [
  "Burned during preparation",
  "Dropped",
  "Customer returned",
  "Expired",
  "Damaged packaging",
  "Wrong order prepared",
  "Quality issue",
  "Other",
];

const WasteRecordCard = ({ record, onApprove, onReject, canApprove = true, actionLoading }) => {
  const recordedByName = record.recordedByUser?.name || record.recordedByName || record.recordedBy || "Staff";
  const approvedByName = record.approvedByUser?.name || record.approvedByName || record.approvedBy;
  return (
    <Card className={record.status === "PENDING" ? "border-yellow-200 bg-yellow-50/50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold">{record.itemName}</p>
            <p className="text-sm text-muted-foreground">Qty: {record.quantity}</p>
          </div>
          <Badge variant={record.status === "APPROVED" ? "default" : record.status === "REJECTED" ? "destructive" : "secondary"}>
            {record.status}
          </Badge>
        </div>

        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="size-3" />
            <span>{record.reason}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="size-3" />
            <span>{recordedByName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3" />
            <span>{new Date(record.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {record.estimatedCost > 0 && (
          <div className="p-2 mb-2 bg-muted rounded text-xs">
            Estimated cost: {record.estimatedCost.toLocaleString()} ETB
          </div>
        )}

        {record.status === "APPROVED" && approvedByName && (
          <div className="p-2 bg-green-50 rounded text-xs text-green-700">
            Approved by: {approvedByName}
          </div>
        )}
        {record.status === "REJECTED" && (
          <div className="p-2 bg-red-50 rounded text-xs text-red-700">
            Rejected{record.rejectedReason ? `: ${record.rejectedReason}` : ""}
          </div>
        )}

        {record.status === "PENDING" && canApprove && (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button size="sm" className="flex-1" onClick={() => onApprove(record._id)} disabled={actionLoading === record._id}>
              <CheckCircle className="size-3 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onReject(record._id)} disabled={actionLoading === record._id}>
              <XCircle className="size-3 mr-1" /> Reject
            </Button>
          </div>
        )}
        {record.status === "PENDING" && !canApprove && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            Awaiting manager approval
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const WasteForm = ({ onSubmit, onCancel }) => {
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemName || !reason) return;
    onSubmit({ itemName, quantity, reason, notes });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Record Waste</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Item Name</label>
              <Input
                placeholder="e.g., Burger"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Quantity</label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Reason</label>
            <select
              className="w-full h-10 rounded-md border bg-transparent px-3 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            >
              <option value="">Select reason...</option>
              {WASTE_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
            <Input
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              <Plus className="size-4 mr-1" /> Record Waste
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const ManagerWasteManagement = ({ branchId }) => {
  const { authUser } = useAuthStore();
  const [wasteRecords, setWasteRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const isApprover = ["OWNER", "MANAGER"].includes(authUser?.role?.toUpperCase?.());

  const loadWaste = async () => {
    if (!branchId) return;
    setIsLoading(true);
    try {
      const res = await axiosInstance.get(`/branches/${branchId}/waste`, { params: { status: filter } });
      const data = res.data?.data || {};
      setWasteRecords(data.waste || []);
      setStats(data.stats || { total: 0, pending: 0, approved: 0, rejected: 0 });
    } catch (err) {
      toast.error(err.backendMessage || "Failed to load waste records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWaste();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, filter]);

  const addWasteRecord = async (data) => {
    if (!branchId) return toast.error("No branch assigned.");
    try {
      await axiosInstance.post(`/branches/${branchId}/waste`, data);
      toast.success("Waste record submitted for approval");
      setShowForm(false);
      loadWaste();
    } catch (err) {
      toast.error(err.backendMessage || "Failed to record waste");
    }
  };

  const approveWaste = async (id) => {
    setActionLoading(id);
    try {
      await axiosInstance.post(`/branches/${branchId}/waste/${id}/approve`);
      toast.success("Waste record approved");
      loadWaste();
    } catch (err) {
      toast.error(err.backendMessage || "Failed to approve waste record");
    } finally {
      setActionLoading(null);
    }
  };

  const rejectWaste = async (id) => {
    setActionLoading(id);
    try {
      await axiosInstance.post(`/branches/${branchId}/waste/${id}/reject`, { reason: "Rejected by manager" });
      toast.success("Waste record rejected");
      loadWaste();
    } catch (err) {
      toast.error(err.backendMessage || "Failed to reject waste record");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRecords = filter === "all"
    ? wasteRecords
    : wasteRecords.filter((r) => r.status.toLowerCase() === filter);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Trash2 className="size-5 mx-auto mb-1 text-gray-600" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Records</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-3 text-center">
            <Clock className="size-5 mx-auto mb-1 text-yellow-600" />
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3 text-center">
            <CheckCircle className="size-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="size-5 mx-auto mb-1 text-red-600" />
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Trash2 className="size-4" />
              Waste Records
            </CardTitle>
            <div className="flex gap-2">
              <div className="flex gap-1">
                {["all", "pending", "approved", "rejected"].map((f) => (
                  <Badge
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </Badge>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={loadWaste} disabled={isLoading}>
                <RefreshCw className={`size-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button size="sm" onClick={() => setShowForm(!showForm)}>
                <Plus className="size-4 mr-1" /> Record Waste
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-6">
              <WasteForm
                onSubmit={addWasteRecord}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : filteredRecords.length === 0 ? (
            <EmptyState
              title="No waste records"
              description="Waste records will appear here."
              icon={Trash2}
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecords.map((record) => (
                <WasteRecordCard
                  key={record._id}
                  record={record}
                  onApprove={approveWaste}
                  onReject={rejectWaste}
                  canApprove={isApprover}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerWasteManagement;
