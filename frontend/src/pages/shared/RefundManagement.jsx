import React, { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useBranchStore } from "@/store/useBranchStore";
import axiosInstance from "@/axios/axiosInstace";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import {
  RefreshCw, CheckCircle, XCircle, Eye, DollarSign, Clock, AlertTriangle, FileText,
} from "lucide-react";

const REFUND_REASONS = [
  { value: "CUSTOMER_REQUEST", label: "Customer Request" },
  { value: "ORDER_ERROR", label: "Order Error" },
  { value: "FOOD_QUALITY", label: "Food Quality" },
  { value: "LATE_DELIVERY", label: "Late Delivery" },
  { value: "OVERCHARGE", label: "Overcharge" },
  { value: "DUPLICATE_CHARGE", label: "Duplicate Charge" },
  { value: "SERVICE_ISSUE", label: "Service Issue" },
  { value: "OTHER", label: "Other" },
];

const REFUND_METHODS = [
  { value: "ORIGINAL_PAYMENT_METHOD", label: "Original Payment Method" },
  { value: "CASH", label: "Cash" },
  { value: "STORE_CREDIT", label: "Store Credit" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
];

const STATUS_BADGE = {
  PENDING: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "Pending" },
  APPROVED: { color: "bg-blue-100 text-blue-800 border-blue-300", label: "Approved" },
  REJECTED: { color: "bg-red-100 text-red-800 border-red-300", label: "Rejected" },
  PROCESSED: { color: "bg-green-100 text-green-800 border-green-300", label: "Processed" },
};

const RefundRequestForm = ({ branchId, onSuccess }) => {
  const [orderId, setOrderId] = useState("");
  const [payments, setPayments] = useState([]);
  const [paymentId, setPaymentId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [reasonDetails, setReasonDetails] = useState("");
  const [refundMethod, setRefundMethod] = useState("ORIGINAL_PAYMENT_METHOD");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!orderId.trim()) return;
    try {
      const res = await axiosInstance.get(`/refunds/order/${orderId.trim()}/payments`);
      setPayments(res.data?.data || []);
    } catch (err) {
      toast.error(err.backendMessage || "Failed to load payments");
    }
  }, [orderId]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const selectedPayment = payments.find((p) => p.payment?._id === paymentId);
  const maxRefund = selectedPayment?.refundableAmount || 0;

  const handleSubmit = async () => {
    if (!paymentId || !amount || !reason) return toast.error("Payment, amount and reason are required");
    if (parseFloat(amount) > maxRefund) return toast.error(`Amount exceeds refundable maximum (${maxRefund} ETB)`);
    setSubmitting(true);
    try {
      await axiosInstance.post("/refunds", {
        paymentId,
        orderId: orderId.trim(),
        amount: parseFloat(amount),
        reason,
        reasonDetails,
        refundMethod,
        notes,
      });
      toast.success("Refund request submitted");
      onSuccess?.();
    } catch (err) {
      toast.error(err.backendMessage || "Failed to submit refund");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Order ID</label>
        <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Enter order ID" />
      </div>
      {payments.length > 0 && (
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Original Payment</label>
          <select value={paymentId} onChange={(e) => setPaymentId(e.target.value)}
            className="w-full h-9 rounded-md border bg-white px-2 text-sm">
            <option value="">Select payment</option>
            {payments.map((p) => (
              <option key={p.payment._id} value={p.payment._id}>
                {p.payment.provider} - {p.payment.amount} ETB (refundable: {p.refundableAmount} ETB)
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Refund Amount (max {maxRefund} ETB)</label>
        <Input type="number" min={0} max={maxRefund} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Reason</label>
        <select value={reason} onChange={(e) => setReason(e.target.value)}
          className="w-full h-9 rounded-md border bg-white px-2 text-sm">
          <option value="">Select reason</option>
          {REFUND_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      {reason === "OTHER" && (
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Details (required)</label>
          <textarea value={reasonDetails} onChange={(e) => setReasonDetails(e.target.value)}
            rows={2} maxLength={1000}
            className="w-full rounded-md border bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
        </div>
      )}
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Refund Method</label>
        <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}
          className="w-full h-9 rounded-md border bg-white px-2 text-sm">
          {REFUND_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={2} maxLength={1000}
          className="w-full rounded-md border bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
      </div>
      <Button onClick={handleSubmit} disabled={submitting || !paymentId || !amount || !reason}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white">
        {submitting ? <RefreshCw className="size-4 mr-2 animate-spin" /> : <DollarSign className="size-4 mr-2" />}
        Submit Refund Request
      </Button>
    </div>
  );
};

const RefundList = ({ branchId, isOwner }) => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (!isOwner && branchId) params.branchId = branchId;
      if (statusFilter) params.status = statusFilter;
      const res = await axiosInstance.get("/refunds", { params });
      setRefunds(res.data?.data?.refunds || []);
    } catch (err) {
      toast.error(err.backendMessage || "Failed to load refunds");
    } finally {
      setLoading(false);
    }
  }, [branchId, isOwner, statusFilter]);

  useEffect(() => { loadRefunds(); }, [loadRefunds]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await axiosInstance.post(`/refunds/${id}/approve`);
      toast.success("Refund approved");
      loadRefunds();
    } catch (err) {
      toast.error(err.backendMessage || "Approval failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Rejection reason:");
    if (!reason?.trim()) return;
    setActionLoading(id);
    try {
      await axiosInstance.post(`/refunds/${id}/reject`, { reason });
      toast.success("Refund rejected");
      loadRefunds();
    } catch (err) {
      toast.error(err.backendMessage || "Rejection failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleProcess = async (id) => {
    setActionLoading(id);
    try {
      await axiosInstance.post(`/refunds/${id}/process`);
      toast.success("Refund processed");
      loadRefunds();
    } catch (err) {
      toast.error(err.backendMessage || "Processing failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Refund Requests</h3>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border bg-white px-2 text-xs">
            <option value="">All</option>
            {Object.entries(STATUS_BADGE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={loadRefunds} disabled={loading}>
            <RefreshCw className={`size-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />)}</div>
      ) : refunds.length === 0 ? (
        <EmptyState title="No refund requests" icon={FileText} />
      ) : (
        refunds.map((r) => {
          const badge = STATUS_BADGE[r.status] || STATUS_BADGE.PENDING;
          return (
            <Card key={r._id} className="border-slate-200">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={badge.color}>{badge.label}</Badge>
                      <span className="text-xs text-slate-500">{r.referenceNumber || r._id.slice(-8)}</span>
                    </div>
                    <p className="text-sm font-medium">{r.orderId?.orderNumber || r.orderId?.slice(-6) || "Order"}</p>
                    <p className="text-xs text-slate-500">Reason: {r.reason?.replace(/_/g, " ")}</p>
                    <p className="text-xs text-slate-500">By: {r.requestedBy?.name || "Staff"} &middot; {new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{r.amount?.toLocaleString()} ETB</p>
                    <p className="text-xs text-slate-500">{r.refundMethod?.replace(/_/g, " ")}</p>
                    {r.status === "PENDING" && (
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApprove(r._id)} disabled={actionLoading === r._id}>
                          <CheckCircle className="size-3" />
                        </Button>
                        <Button size="sm" variant="destructive"
                          onClick={() => handleReject(r._id)} disabled={actionLoading === r._id}>
                          <XCircle className="size-3" />
                        </Button>
                      </div>
                    )}
                    {r.status === "APPROVED" && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white mt-2"
                        onClick={() => handleProcess(r._id)} disabled={actionLoading === r._id}>
                        Process
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

const RefundManagement = ({ isOwner = false }) => {
  const { authUser } = useAuthStore();
  const { branches, fetchBranches } = useBranchStore();
  const branchId = authUser?.branchId;

  useEffect(() => {
    if (isOwner && authUser?.organizationId) fetchBranches(authUser.organizationId);
  }, [isOwner, authUser, fetchBranches]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
          <DollarSign className="size-6 text-amber-600" /> Refund Management
        </h1>
        <p className="text-sm text-slate-500">{isOwner ? "Organization-wide refund oversight" : "Manage refunds for your restaurant"}</p>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="list">Refund Requests</TabsTrigger>
          <TabsTrigger value="new">New Refund</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <RefundList branchId={branchId} isOwner={isOwner} />
        </TabsContent>
        <TabsContent value="new">
          <Card>
            <CardHeader><CardTitle className="text-sm">Request a Refund</CardTitle></CardHeader>
            <CardContent>
              <RefundRequestForm branchId={branchId} onSuccess={() => {}} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RefundManagement;
