import { useEffect, useMemo, useState } from "react";
import { useFeedbackStore } from "@/store/useFeedbackStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertCircle,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Utensils,
  DollarSign,
  Truck,
  Package,
} from "lucide-react";

const COMPLAINT_TYPES = {
  delayed_food: { icon: Clock, color: "text-orange-500", bg: "bg-orange-50", label: "Delayed Food" },
  wrong_order: { icon: Utensils, color: "text-red-500", bg: "bg-red-50", label: "Wrong Order" },
  missing_item: { icon: Package, color: "text-purple-500", bg: "bg-purple-50", label: "Missing Item" },
  poor_service: { icon: User, color: "text-yellow-500", bg: "bg-yellow-50", label: "Poor Service" },
  payment_issue: { icon: DollarSign, color: "text-red-500", bg: "bg-red-50", label: "Payment Issue" },
  quality_complaint: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", label: "Quality Complaint" },
  refund_request: { icon: DollarSign, color: "text-blue-500", bg: "bg-blue-50", label: "Refund Request" },
  other: { icon: MessageSquare, color: "text-gray-500", bg: "bg-gray-50", label: "Other" },
};

const COMPLAINT_STATUS = {
  OPEN: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-100", label: "Open" },
  INVESTIGATING: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100", label: "Investigating" },
  RESOLVED: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100", label: "Resolved" },
  CLOSED: { icon: XCircle, color: "text-gray-500", bg: "bg-gray-100", label: "Closed" },
};

const ComplaintCard = ({ complaint, onUpdateStatus }) => {
  const typeConfig = COMPLAINT_TYPES[complaint.type] || COMPLAINT_TYPES.other;
  const statusConfig = COMPLAINT_STATUS[complaint.status] || COMPLAINT_STATUS.OPEN;
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  const nextStatus = (current) => {
    if (current === "OPEN") return "INVESTIGATING";
    if (current === "INVESTIGATING") return "RESOLVED";
    if (current === "RESOLVED") return "CLOSED";
    return null;
  };
  const next = nextStatus(complaint.status);

  return (
    <Card className={statusConfig.bg ? `${statusConfig.bg}` : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-lg ${typeConfig.bg} flex items-center justify-center`}>
              <TypeIcon className={`size-5 ${typeConfig.color}`} />
            </div>
            <div>
              <p className="font-semibold">{typeConfig.label}</p>
              <p className="text-xs text-muted-foreground">
                {complaint.orderId ? `Order #${complaint.orderId}` : "No Order"}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={`${statusConfig.color} ${statusConfig.bg}`}>
            <StatusIcon className="size-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>

        <p className="text-sm mb-3">{complaint.description}</p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <span>Table {complaint.tableNumber || "—"}</span>
          <span>•</span>
          <span>{complaint.customerName || "Guest"}</span>
          <span>•</span>
          <span>{new Date(complaint.createdAt).toLocaleString()}</span>
        </div>

        {complaint.resolution && (
          <div className="p-2 bg-green-50 rounded border border-green-200 mb-3">
            <p className="text-xs text-green-700 font-medium">Resolution:</p>
            <p className="text-sm text-green-600">{complaint.resolution}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            By: {complaint.reportedBy || "Staff"}
          </span>
          {next && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onUpdateStatus(complaint._id, next)}>
                {next === "INVESTIGATING" && "Start Investigation"}
                {next === "RESOLVED" && "Mark Resolved"}
                {next === "CLOSED" && "Close"}
              </Button>
            </div>
          )}
          {!next && (
            <span className="text-xs text-muted-foreground italic">Closed</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ManagerComplaints = ({ branchId }) => {
  const {
    feedbacks,
    stats,
    fetchBranchFeedback,
    updateFeedbackStatus,
    setBranchId,
  } = useFeedbackStore();
  const [filter, setFilter] = useState("all");

  // Map a feedback record to the complaint-card shape this panel renders.
  const toComplaint = (fb) => {
    const orderNo = fb.orderId?.orderNumber || "";
    const tableNo =
      typeof fb.tableId === "object" && fb.tableId
        ? fb.tableId.tableNumber
        : fb.tableNumber || "";
    // Derive a display type from the lowest-scoring dimension so the
    // complaint is actionable. Falls back to a generic quality complaint.
    let type = "quality_complaint";
    const dims = [
      { key: "foodRating", type: "quality_complaint" },
      { key: "serviceRating", type: "poor_service" },
      { key: "cleanlinessRating", type: "quality_complaint" },
      { key: "waitTimeRating", type: "delayed_food" },
    ];
    for (const d of dims) {
      const val = fb[d.key];
      if (typeof val === "number" && val <= 2) {
        type = d.type;
        break;
      }
    }
    const description =
      fb.feedbackText ||
      `Customer rated overall experience ${fb.overallRating}/5 "${
        fb.overallRating <= 2 ? "complaint" : "feedback"
      }".`;

    return {
      _id: fb._id,
      type,
      description,
      orderId: orderNo || fb.orderId?._id?.slice(-6) || "—",
      tableNumber: tableNo || "—",
      status: fb.status || (fb.isResolved ? "RESOLVED" : "OPEN"),
      createdAt: fb.createdAt,
      reportedBy: fb.source === "MANUAL" ? "Staff" : "Customer",
      resolution: fb.resolutionNotes || null,
      customerName: "Guest",
      rating: fb.overallRating,
    };
  };

  // Load real feedback whenever the branch changes.
  useEffect(() => {
    if (branchId) {
      setBranchId(branchId);
      fetchBranchFeedback(branchId, { includeResolved: true, limit: 100 });
    }
  }, [branchId, fetchBranchFeedback, setBranchId]);

  const complaints = useMemo(
    () => feedbacks.map(toComplaint),
    [feedbacks]
  );

  const handleUpdateStatus = (id, status) => {
    updateFeedbackStatus(id, status);
  };

  const filteredComplaints = filter === "all"
    ? complaints
    : complaints.filter((c) => c.status === filter.toUpperCase());

  const computedStats = {
    open: complaints.filter((c) => c.status === "OPEN").length,
    investigating: complaints.filter((c) => c.status === "INVESTIGATING").length,
    resolved: complaints.filter((c) => c.status === "RESOLVED").length,
    closed: complaints.filter((c) => c.status === "CLOSED").length,
    total: stats?.stats?.totalFeedback ?? complaints.length,
    complaintCount: stats?.stats?.complaintCount ?? 0,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3 text-center">
            <AlertCircle className="size-5 mx-auto mb-1 text-red-600" />
            <p className="text-2xl font-bold text-red-600">{computedStats.open}</p>
            <p className="text-xs text-muted-foreground">Open</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-3 text-center">
            <Clock className="size-5 mx-auto mb-1 text-yellow-600" />
            <p className="text-2xl font-bold text-yellow-600">{computedStats.investigating}</p>
            <p className="text-xs text-muted-foreground">Investigating</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3 text-center">
            <CheckCircle className="size-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{computedStats.resolved}</p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-3 text-center">
            <XCircle className="size-5 mx-auto mb-1 text-gray-600" />
            <p className="text-2xl font-bold text-gray-600">{computedStats.closed}</p>
            <p className="text-xs text-muted-foreground">Closed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="size-4" />
              Customer Issues
            </CardTitle>
            <div className="flex gap-2">
              {["all", "open", "investigating", "resolved", "closed"].map((f) => (
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
          </div>
        </CardHeader>
        <CardContent>
          {filteredComplaints.length === 0 ? (
            <EmptyState
              title="No complaints"
              description="Customer issues will appear here."
              icon={CheckCircle}
            />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredComplaints.map((complaint) => (
                <ComplaintCard
                  key={complaint._id}
                  complaint={complaint}
                  onUpdateStatus={handleUpdateStatus}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerComplaints;
