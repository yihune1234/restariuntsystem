import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Banknote,
  CreditCard,
  Smartphone,
  Receipt,
  Wallet,
  Calendar,
} from "lucide-react";
import axiosInstance from "@/axios/axiosInstace";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

const statusConfig = {
  OPEN: { label: "Open", color: "bg-green-100 text-green-800", icon: Clock },
  CLOSED: { label: "Closed", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  RECONCILED: { label: "Reconciled", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
};

export const DailyClosingManager = ({ branchId }) => {
  const { authUser } = useAuthStore();
  const [closing, setClosing] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReconcileDialog, setShowReconcileDialog] = useState(false);
  const [actualCash, setActualCash] = useState("");
  const [differenceReason, setDifferenceReason] = useState("");
  const [reconcileNotes, setReconcileNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (branchId) {
      fetchTodayMetrics();
      fetchClosingHistory();
    }
  }, [branchId]);

  const fetchTodayMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get(`/branches/${branchId}/daily-closing/today-metrics`);
      setMetrics(res.data?.data);
      setClosing(res.data?.data);
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClosingHistory = async () => {
    try {
      const res = await axiosInstance.get(`/branches/${branchId}/daily-closing/history`);
      setHistory(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const handleOpenDay = async () => {
    setIsSubmitting(true);
    try {
      const openingCash = parseFloat(actualCash) || 0;
      await axiosInstance.post(`/branches/${branchId}/daily-closing/open`, { openingCash });
      toast.success("Day opened successfully");
      fetchTodayMetrics();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to open day");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseDay = async () => {
    setIsSubmitting(true);
    try {
      await axiosInstance.post(`/branches/${branchId}/daily-closing/close`, {
        actualCash: parseFloat(actualCash),
        differenceReason,
      });
      toast.success("Day closed successfully");
      setShowCloseDialog(false);
      setActualCash("");
      setDifferenceReason("");
      fetchTodayMetrics();
      fetchClosingHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to close day");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReconcile = async () => {
    setIsSubmitting(true);
    try {
      await axiosInstance.post(`/branches/${branchId}/daily-closing/reconcile`, {
        notes: reconcileNotes,
      });
      toast.success("Day reconciled successfully");
      setShowReconcileDialog(false);
      setReconcileNotes("");
      fetchTodayMetrics();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reconcile day");
    } finally {
      setIsSubmitting(false);
    }
  };

  const summary = closing?.summary || {};
  const difference = closing?.actualCash != null
    ? closing.actualCash - (summary?.expectedCash || 0)
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Daily Closing & Reconciliation
          </CardTitle>
          <CardDescription>
            Business Date: {closing?.businessDate || new Date().toISOString().split('T')[0]}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={statusConfig[closing?.status]?.color}>
                  {statusConfig[closing?.status]?.label || "Unknown"}
                </Badge>
              </div>

              {closing?.status === "OPEN" && (
                <div className="space-y-2">
                  <Label>Opening Cash</Label>
                  <Input
                    type="number"
                    placeholder="Enter opening cash"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                  />
                  <Button onClick={handleOpenDay} disabled={isSubmitting} className="w-full">
                    Start Day
                  </Button>
                </div>
              )}

              {closing?.status === "CLOSED" && (
                <Button
                  onClick={() => setShowReconcileDialog(true)}
                  className="w-full"
                >
                  Reconcile Day
                </Button>
              )}
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <DollarSign className="size-8 mx-auto text-green-600" />
                  <p className="text-sm text-muted-foreground">Expected Cash</p>
                  <p className="text-2xl font-bold">
                    {(summary?.expectedCash || 0).toLocaleString()} ETB
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  {difference !== null && (
                    <>
                      {difference >= 0 ? (
                        <TrendingUp className="size-8 mx-auto text-green-600" />
                      ) : (
                        <TrendingDown className="size-8 mx-auto text-red-600" />
                      )}
                    </>
                  )}
                  <p className="text-sm text-muted-foreground">Actual Cash</p>
                  <p className="text-2xl font-bold">
                    {closing && closing.actualCash !== null
                      ? `${closing.actualCash.toLocaleString()} ETB`
                      : "—"}
                  </p>
                  {difference !== null && (
                    <p className={`text-sm font-medium ${difference >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {difference >= 0 ? "+" : ""}{difference.toLocaleString()} ETB
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Today's Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Total Orders</span>
                <span className="font-medium">{summary?.totalOrders || 0}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Total Revenue</span>
                <span className="font-medium">{(summary?.totalRevenue || 0).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Cash Sales</span>
                <span className="font-medium">{(summary?.cashSales || 0).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Card Sales</span>
                <span className="font-medium">{(summary?.cardSales || 0).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Digital Sales</span>
                <span className="font-medium">{(summary?.digitalSales || 0).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Discounts</span>
                <span className="font-medium text-red-500">-{(summary?.totalDiscount || 0).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Refunds</span>
                <span className="font-medium text-red-500">-{(summary?.totalRefunds || 0).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Cancelled Orders</span>
                <span className="font-medium">{summary?.cancelledOrders || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(closing?.paymentBreakdown || {}).map(([method, amount]) => (
                <div key={method} className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    {method.includes("CASH") && <Banknote className="size-4" />}
                    {method.includes("CARD") && <CreditCard className="size-4" />}
                    {method === "CHAPA" && <Smartphone className="size-4" />}
                    {method === "TELEBIRR" && <Smartphone className="size-4" />}
                    {method}
                  </span>
                  <span className="font-medium">{amount.toLocaleString()} ETB</span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Unpaid Amount</span>
                <span className="font-medium text-yellow-500">
                  {(summary?.unpaidAmount || 0).toLocaleString()} ETB
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Manual Transactions</span>
                <span className="font-medium">{summary?.manualTransactions || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Close Day</CardTitle>
          <CardDescription>
            Enter the actual cash amount in the register to close the day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Actual cash in register"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
              />
            </div>
            <Button
              onClick={() => setShowCloseDialog(true)}
              disabled={!actualCash || closing?.status !== "OPEN"}
            >
              Close Day
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Closing History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="space-y-2">
              {history.slice(0, 7).map((record) => (
                <div key={record._id} className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-3">
                    <Badge className={statusConfig[record.status]?.color}>
                      {statusConfig[record.status]?.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{record.businessDate}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>Expected: {record.expectedCash?.toLocaleString() || 0} ETB</span>
                    <span>Actual: {record.actualCash?.toLocaleString() || "—"} ETB</span>
                    {record.cashDifference !== 0 && (
                      <span className={record.cashDifference >= 0 ? "text-green-600" : "text-red-600"}>
                        {record.cashDifference >= 0 ? "+" : ""}{record.cashDifference.toLocaleString()} ETB
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No closing history available</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Day</DialogTitle>
            <DialogDescription>
              Are you sure you want to close the day? This action will calculate expected
              cash and require reconciliation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Actual Cash in Register</Label>
              <Input
                type="number"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                placeholder="Enter actual cash amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason for Difference (if any)</Label>
              <Textarea
                value={differenceReason}
                onChange={(e) => setDifferenceReason(e.target.value)}
                placeholder="Explain any difference between expected and actual cash..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloseDay} disabled={isSubmitting}>
              Confirm Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReconcileDialog} onOpenChange={setShowReconcileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconcile Day</DialogTitle>
            <DialogDescription>
              Once reconciled, the day's records will be locked and cannot be modified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Expected Cash:</span>
                <span className="font-medium">{(summary?.expectedCash || 0).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between">
                <span>Actual Cash:</span>
                <span className="font-medium">{(closing?.actualCash || 0).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between">
                <span>Difference:</span>
                <span className={`font-medium ${difference >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {(difference || 0).toLocaleString()} ETB
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reconciliation Notes</Label>
              <Textarea
                value={reconcileNotes}
                onChange={(e) => setReconcileNotes(e.target.value)}
                placeholder="Add any final notes before reconciling..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReconcileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReconcile} disabled={isSubmitting}>
              Reconcile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};