import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useOfflineStore } from "@/store/useOfflineStore";
import axiosInstance from "@/axios/axiosInstace";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import OfflineStatusBanner from "@/components/offline/OfflineStatusBanner";
import { PAYMENT_METHODS } from "@/config/paymentMethods";
import { MANUAL_ENTRY_STATUS, appliedSummary } from "@/components/offline/manualEntryStatus";
import {
  WifiOff, Plus, Clock, Banknote, RefreshCw, AlertTriangle, CheckCircle, XCircle, Send,
} from "lucide-react";

const OUTAGE_TYPES = [
  { value: "INTERNET", label: "Internet outage" },
  { value: "PAYMENT_PROVIDER", label: "Payment terminal / provider failure" },
  { value: "POS_DEVICE", label: "POS device failure" },
  { value: "POWER", label: "Power outage" },
  { value: "OTHER", label: "Other" },
];

/** Cashier manual payment entry — becomes PENDING until Manager/Owner approves. */
const CashierManualEntry = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [outageType, setOutageType] = useState("INTERNET");
  const [reason, setReason] = useState("");
  const [originalTime, setOriginalTime] = useState("");
  const [reference, setReference] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myEntries, setMyEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMyEntries = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get("/offline-transactions/my-entries");
      setMyEntries(res.data?.data?.transactions || []);
    } catch {
      setMyEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMyEntries(); /* eslint-disable-next-line */ }, [branchId]);

  const handleSubmit = async (saveAsDraft = false) => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return toast.error("Enter a valid amount");
    if (!reason.trim()) return toast.error("Reason is required for offline entry");
    setSubmitting(true);
    try {
      // Manual entries are recorded on the backend (authoritative) as a DRAFT
      // first. Non-draft submissions are immediately promoted to PENDING so the
      // entry enters the Manager/Owner approval queue.
      const res = await axiosInstance.post("/offline-transactions", {
        originalTransactionTime: originalTime
          ? new Date(originalTime).toISOString()
          : new Date().toISOString(),
        outageType,
        reason,
        source: "OFFLINE_ENTERED",
        operationType: "PAYMENT",
        items: [],
        subtotal: amt,
        tax: 0,
        serviceCharge: 0,
        total: amt,
        paymentMethod,
        tableId: null,
        customerCount: 1,
        status: "DRAFT",
        paymentData: {
          orderId: orderRef || null,
          amount: amt,
          paymentMethod,
          transactionReference: reference || `MANUAL-${Date.now()}`,
        },
        notes: [reference ? `Ref: ${reference}` : "", notes].filter(Boolean).join(" \u2014 "),
      });
      const txId = res.data?.data?._id;
      if (!saveAsDraft && txId) {
        await axiosInstance.post(`/offline-transactions/${txId}/submit`);
        toast.success("Manual payment submitted \u2014 Pending Manager/Owner approval");
      } else {
        toast.success("Manual payment saved as draft");
      }
      setAmount(""); setReason(""); setReference(""); setOrderRef(""); setNotes("");
      loadMyEntries();
    } catch (err) {
      toast.error(err.backendMessage || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const submitDraft = async (txId) => {
    try {
      await axiosInstance.post(`/offline-transactions/${txId}/submit`);
      toast.success("Draft submitted for approval");
      loadMyEntries();
    } catch (err) {
      toast.error(err.backendMessage || "Failed to submit draft");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <OfflineStatusBanner />

      <div>
        <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
          <WifiOff className="size-6 text-amber-600" /> Manual Payment Entry
        </h1>
        <p className="text-sm text-slate-500">
          Record payments taken during outages. Entries require Manager/Owner approval
          before they become final financial records.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">New Manual Payment</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Amount (ETB) *</label>
              <Input type="number" min={0} step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-9 rounded-md border bg-white px-2 text-sm">
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Outage Type</label>
              <select value={outageType} onChange={(e) => setOutageType(e.target.value)}
                className="w-full h-9 rounded-md border bg-white px-2 text-sm">
                {OUTAGE_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Original Transaction Time</label>
              <Input type="datetime-local" value={originalTime}
                onChange={(e) => setOriginalTime(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Reference (receipt/cheque #)</label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Order ID (paying for which order?)</label>
              <Input value={orderRef} onChange={(e) => setOrderRef(e.target.value)} placeholder="Paste the order ID to link this payment, or leave empty to discard" />
              <p className="text-[10px] text-slate-400 mt-1">A manual payment is applied to the linked order's bill.</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Reason (required)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this payment being entered manually? e.g. Internet outage \u2014 cash taken at table 5"
              rows={2} maxLength={500}
              className="w-full rounded-md border bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2} maxLength={1000}
              className="w-full rounded-md border bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
          </div>

          <div className="flex items-center gap-2 p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <AlertTriangle className="size-4" />
            <span>Source: <strong>Manual / Offline</strong> &middot; Entered by: <strong>{authUser?.name || "Cashier"}</strong> &middot; Status: <strong>Pending Approval</strong></span>
          </div>

          <Button onClick={() => handleSubmit(false)} disabled={submitting}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white">
            {submitting ? <RefreshCw className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
            Submit for Approval
          </Button>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">My Submissions</h3>
          <Button size="sm" variant="outline" onClick={loadMyEntries} disabled={loading}>
            <RefreshCw className={`size-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
        {loading ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : myEntries.length === 0 ? (
          <EmptyState title="No submissions" description="Drafts and entries you submit will appear here." icon={Clock} />
        ) : (
          myEntries.map((tx) => {
            const status = MANUAL_ENTRY_STATUS[String(tx.status || "PENDING").toUpperCase()] || MANUAL_ENTRY_STATUS.PENDING;
            const summary = appliedSummary(tx);
            return (
              <Card key={tx._id} className="mb-2 border-yellow-200">
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Badge variant={status.badge} className={`mb-1 ${status.text} ${status.border}`}>{status.label}</Badge>
                    <p className="text-xs text-slate-500">{new Date(tx.originalTransactionTime).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{tx.reason}</p>
                    {summary && (
                      <p className="text-xs text-green-700 mt-1 font-medium">{summary}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {String(tx.status || "").toUpperCase() === "DRAFT" && (
                      <Button size="sm" variant="outline" onClick={() => submitDraft(tx._id)}>
                        <Send className="size-3 mr-1" /> Submit
                      </Button>
                    )}
                    <p className="text-sm font-bold">{tx.total?.toLocaleString()} ETB</p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CashierManualEntry;
