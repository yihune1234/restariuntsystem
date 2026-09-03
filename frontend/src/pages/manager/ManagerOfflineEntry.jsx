import React, { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useMenuStore } from "@/store/useMenuStore";
import { useTableStore } from "@/store/useTableStore";
import { useBranchStore } from "@/store/useBranchStore";
import axiosInstance from "@/axios/axiosInstace";
import { toast } from "sonner";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import {
  WifiOff, Plus, Clock, CheckCircle, XCircle, AlertTriangle, Search,
  ShoppingCart, Banknote, Package, Trash2, Eye, RefreshCw, FileText,
} from "lucide-react";
import { PAYMENT_METHODS } from "@/config/paymentMethods";

const RECORD_TYPES = [
  { id: "ORDER", label: "Order", icon: ShoppingCart, color: "text-blue-600" },
  { id: "PAYMENT", label: "Payment", icon: Banknote, color: "text-green-600" },
  { id: "INVENTORY", label: "Inventory", icon: Package, color: "text-purple-600" },
  { id: "WASTE", label: "Waste", icon: Trash2, color: "text-red-600" },
  { id: "EXPENSE", label: "Expense", icon: FileText, color: "text-orange-600" },
];

const OUTAGE_TYPES = [
  { value: "INTERNET", label: "Internet outage" },
  { value: "POS_DEVICE", label: "POS device failure" },
  { value: "QR_SYSTEM", label: "QR system failure" },
  { value: "PAYMENT_PROVIDER", label: "Payment provider failure" },
  { value: "KITCHEN_DISPLAY", label: "Kitchen display failure" },
  { value: "POWER", label: "Power outage" },
  { value: "OTHER", label: "Other technical issue" },
];

const ManualEntryForm = ({ branchId, onSuccess }) => {
  const { authUser } = useAuthStore();
  const { menuItems, fetchMenu } = useMenuStore();
  const { tables, fetchTables } = useTableStore();

  const [recordType, setRecordType] = useState("ORDER");
  const [outageType, setOutageType] = useState("INTERNET");
  const [reason, setReason] = useState("");
  const [originalTime, setOriginalTime] = useState(new Date().toISOString().slice(0, 16));
  const [tableId, setTableId] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [customerCount, setCustomerCount] = useState(1);
  const [orderItems, setOrderItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (branchId) {
      fetchMenu(branchId);
      fetchTables(branchId);
    }
  }, [branchId, fetchMenu, fetchTables]);

  const addItem = (item) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.foodItemId === item._id);
      if (existing) {
        return prev.map((i) => i.foodItemId === item._id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        foodItemId: item._id,
        foodNameSnapshot: item.name,
        unitPriceSnapshot: item.price,
        quantity: 1,
        subtotal: item.price,
        notes: "",
      }];
    });
  };

  const updateItemQty = (foodItemId, qty) => {
    setOrderItems((prev) => prev.map((i) => {
      if (i.foodItemId !== foodItemId) return i;
      const q = Math.max(1, qty);
      return { ...i, quantity: q, subtotal: i.unitPriceSnapshot * q };
    }));
  };

  const removeItem = (foodItemId) => {
    setOrderItems((prev) => prev.filter((i) => i.foodItemId !== foodItemId));
  };

  const calcSubtotal = () => orderItems.reduce((s, i) => s + i.subtotal, 0);
  const calcTax = () => Math.round(calcSubtotal() * 0.15 * 100) / 100;
  const calcTotal = () => calcSubtotal() + calcTax();

  const handleSubmit = async (saveAsDraft = false) => {
    if (!reason.trim()) return toast.error("Reason is required for manual entry");
    setSubmitting(true);
    try {
      let txId = null;
      if (recordType === "ORDER") {
        if (!orderItems.length) return toast.error("Add at least one item");
        const res = await axiosInstance.post("/offline-transactions", {
          originalTransactionTime: new Date(originalTime).toISOString(),
          outageType,
          reason,
          source: "OFFLINE_ENTERED",
          operationType: "ORDER",
          status: "DRAFT",
          items: orderItems,
          subtotal: calcSubtotal(),
          tax: calcTax(),
          serviceCharge: 0,
          total: calcTotal(),
          paymentMethod,
          tableId: tableId || null,
          customerCount,
          notes,
        });
        txId = res.data?.data?._id;
      } else if (recordType === "PAYMENT") {
        if (!orderRef.trim()) return toast.error("A manual payment must reference an existing order ID");
        const res = await axiosInstance.post("/offline-transactions", {
          originalTransactionTime: new Date(originalTime).toISOString(),
          outageType,
          reason,
          source: "OFFLINE_ENTERED",
          operationType: "PAYMENT",
          status: "DRAFT",
          items: [],
          subtotal: 0,
          tax: 0,
          serviceCharge: 0,
          total: 0,
          paymentMethod,
          tableId: tableId || null,
          customerCount: 1,
          notes,
          paymentData: {
            orderId: orderRef.trim(),
            amount: 0,
            paymentMethod,
            transactionReference: `MANUAL-${Date.now()}`,
          },
        });
        txId = res.data?.data?._id;
      }
      if (!saveAsDraft && txId) {
        await axiosInstance.post(`/offline-transactions/${txId}/submit`);
        toast.success("Manual entry submitted for approval");
      } else {
        toast.success("Manual entry saved as draft");
      }
      onSuccess?.();
    } catch (err) {
      toast.error(err.backendMessage || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Record Type</label>
          <select value={recordType} onChange={(e) => setRecordType(e.target.value)}
            className="w-full h-9 rounded-md border bg-white px-2 text-sm">
            {RECORD_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
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
          <Input type="datetime-local" value={originalTime} onChange={(e) => setOriginalTime(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Table</label>
          <select value={tableId} onChange={(e) => setTableId(e.target.value)}
            className="w-full h-9 rounded-md border bg-white px-2 text-sm">
            <option value="">No table</option>
            {tables?.map((t) => <option key={t._id} value={t._id}>Table {t.tableNumber}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Reason (required)</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this entry being made manually/offline?"
          rows={2} maxLength={500}
          className="w-full rounded-md border bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
      </div>

      {recordType === "PAYMENT" && (
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Order ID (which order is being paid off?) *</label>
          <Input value={orderRef} onChange={(e) => setOrderRef(e.target.value)}
            placeholder="Paste the order ID this payment settles" />
          <p className="text-[10px] text-slate-400 mt-1">Approval applies this payment to the linked order's bill.</p>
        </div>
      )}

      {recordType === "ORDER" && (
        <>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Menu Items</label>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
              {menuItems?.map((item) => (
                <button key={item._id} onClick={() => addItem(item)}
                  className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1 hover:bg-amber-100">
                  + {item.name} ({item.price} ETB)
                </button>
              ))}
            </div>
          </div>
          {orderItems.length > 0 && (
            <div className="space-y-1">
              {orderItems.map((item) => (
                <div key={item.foodItemId} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{item.foodNameSnapshot}</span>
                  <Input type="number" min={1} value={item.quantity}
                    onChange={(e) => updateItemQty(item.foodItemId, parseInt(e.target.value) || 1)}
                    className="w-16 h-7 text-xs" />
                  <span className="w-20 text-right text-xs">{item.subtotal.toLocaleString()} ETB</span>
                  <button onClick={() => removeItem(item.foodItemId)} className="text-red-500">
                    <XCircle className="size-4" />
                  </button>
                </div>
              ))}
              <div className="border-t pt-2 text-sm space-y-0.5">
                <div className="flex justify-between"><span>Subtotal</span><span>{calcSubtotal().toLocaleString()} ETB</span></div>
                <div className="flex justify-between"><span>Tax (15%)</span><span>{calcTax().toLocaleString()} ETB</span></div>
                <div className="flex justify-between font-bold"><span>Total</span><span>{calcTotal().toLocaleString()} ETB</span></div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-9 rounded-md border bg-white px-2 text-sm">
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Customer Count</label>
              <Input type="number" min={1} value={customerCount}
                onChange={(e) => setCustomerCount(parseInt(e.target.value) || 1)} />
            </div>
          </div>
        </>
      )}

      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional details..." rows={2} maxLength={1000}
          className="w-full rounded-md border bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
      </div>

      <div className="flex items-center gap-2 p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800">
        <WifiOff className="size-4" />
        <span>Source: <strong>Manual / Offline Entry</strong> &middot; Entered by: <strong>{authUser?.name || "Staff"}</strong> &middot; Status: <strong>Pending Approval</strong></span>
      </div>

      <Button onClick={() => handleSubmit(false)} disabled={submitting || !reason.trim()}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white">
        {submitting ? <RefreshCw className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
        Submit Manual Entry
      </Button>
      <Button variant="outline" disabled={submitting || !reason.trim()}
        onClick={() => handleSubmit(true)}
        className="w-full">
        Save as Draft
      </Button>
    </div>
  );
};

const ApprovalQueue = ({ branchId }) => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const loadPending = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/offline-transactions/${branchId}/pending`);
      setPending(res.data?.data?.transactions || []);
    } catch (err) {
      toast.error(err.backendMessage || "Failed to load pending approvals");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { loadPending(); }, [loadPending]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await axiosInstance.post(`/offline-transactions/${id}/approve`);
      toast.success("Approved and order created");
      loadPending();
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
      await axiosInstance.post(`/offline-transactions/${id}/reject`, { reason });
      toast.success("Rejected");
      loadPending();
    } catch (err) {
      toast.error(err.backendMessage || "Rejection failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Pending Approvals</h3>
        <Button size="sm" variant="outline" onClick={loadPending} disabled={loading}>
          <RefreshCw className={`size-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />)}</div>
      ) : pending.length === 0 ? (
        <EmptyState title="No pending approvals" icon={CheckCircle} />
      ) : (
        pending.map((tx) => (
          <Card key={tx._id} className="border-yellow-200">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-yellow-700 border-yellow-300">PENDING</Badge>
                    <span className="text-xs text-slate-500">{tx.outageType?.replace(/_/g, " ")}</span>
                  </div>
                  <p className="text-sm font-medium">{tx._id.slice(-8)} &middot; {tx.items?.length || 0} items</p>
                  <p className="text-xs text-slate-500">Entered by: {tx.enteredBy?.name || "Staff"}</p>
                  <p className="text-xs text-slate-500">Reason: {tx.reason}</p>
                  <p className="text-xs text-slate-500">Time: {new Date(tx.originalTransactionTime).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{tx.total?.toLocaleString()} ETB</p>
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleApprove(tx._id)} disabled={actionLoading === tx._id}>
                      <CheckCircle className="size-3" />
                    </Button>
                    <Button size="sm" variant="destructive"
                      onClick={() => handleReject(tx._id)} disabled={actionLoading === tx._id}>
                      <XCircle className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

const ManagerOfflinePage = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
          <WifiOff className="size-6 text-amber-600" /> Offline / Manual Entry
        </h1>
        <p className="text-sm text-slate-500">Record operations during system outages. Entries require approval.</p>
      </div>

      <Tabs defaultValue="entry">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="entry">New Entry</TabsTrigger>
          <TabsTrigger value="approvals">Approval Queue</TabsTrigger>
        </TabsList>
        <TabsContent value="entry">
          <Card>
            <CardHeader><CardTitle className="text-sm">Manual Record Entry</CardTitle></CardHeader>
            <CardContent>
              <ManualEntryForm branchId={branchId} onSuccess={() => {}} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="approvals">
          <ApprovalQueue branchId={branchId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManagerOfflinePage;
