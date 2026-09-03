import React, { useEffect, useState } from "react";
import SharedCashierDashboard from "../shared/CashierDashboard";
import SharedCreateOrder from "../shared/CreateOrder";
import SharedStaffProfile from "../shared/StaffProfile";
import { usePaymentStore } from "@/store/usePaymentStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Receipt, Wallet, CreditCard, Smartphone, Landmark,
  RefreshCw, Search, Calendar, DollarSign, TrendingUp, KeyRound,
} from "lucide-react";

const PAYMENT_ICONS = {
  CASH: Wallet,
  CARD: CreditCard,
  CHAPA: Smartphone,
  TELEBIRR: Smartphone,
  BANK_TRANSFER: Landmark,
  CASHIER_CASH: Wallet,
  CASHIER_CARD: CreditCard,
  CASHIER_BANK_TRANSFER: Landmark,
};

/** Maps a payment provider to a human-friendly display label. */
const PROVIDER_LABEL = (provider) => {
  switch (provider) {
    case "CASHIER_CASH":
    case "CASH":
      return "Cash";
    case "CASHIER_CARD":
    case "CARD":
      return "Card";
    case "CASHIER_BANK_TRANSFER":
    case "BANK_TRANSFER":
      return "Bank Transfer";
    case "CHAPA":
    case "TELEBIRR":
      return "Online";
    default:
      return provider || "Other";
  }
};

/**
 * Cashier pages (thin wrappers over real backend-connected components).
 */
export const CashierDashboard = () => <SharedCashierDashboard />;
export const CashierCreateOrder = () => <SharedCreateOrder />;
export const CashierProfile = () => <SharedStaffProfile />;

/**
 * Digital transaction history - aggregated from the branch payments-report.
 */
export const CashierTransactions = () => {
  const { authUser } = useAuthStore();
  const { transactions, fetchTransactions, isLoading } = usePaymentStore();
  const branchId = authUser?.branchId;

  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (branchId) fetchTransactions(branchId);
  }, [branchId, fetchTransactions]);

  const handleRefresh = () => {
    fetchTransactions(branchId, { startDate: startDate || undefined, endDate: endDate || undefined });
  };

  const filteredTransactions = transactions.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (t.provider || "").toLowerCase().includes(q);
  });

  const totalAmount = transactions.reduce((s, t) => s + (t.totalAmount || 0), 0);
  const totalCount = transactions.reduce((s, t) => s + (t.count || t.totalCount || 0), 0);

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          <p className="text-sm text-gray-500">View payment history and reports</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`size-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center">
                <DollarSign className="size-5" />
              </div>
              <div>
                <p className="text-xs text-white/80">Total Revenue</p>
                <p className="text-xl font-black">{totalAmount.toLocaleString()} ETB</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Receipt className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Transactions</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <TrendingUp className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg. Order</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {totalCount > 0 ? Math.round(totalAmount / totalCount).toLocaleString() : 0} ETB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <Wallet className="size-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment Methods</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search payment method..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-gray-400" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-36"
              />
              <span className="text-gray-400">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-36"
              />
            </div>
            <Button size="sm" onClick={handleRefresh}>Apply</Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      {isLoading && transactions.length === 0 ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <EmptyState title="No transactions" description="Confirmed payments will appear here." icon={Receipt} />
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((t, i) => {
            const Icon = PAYMENT_ICONS[t.provider] || CreditCard;
            const count = t.count || t.totalCount || 0;
            const amount = t.totalAmount || 0;
            const avgAmount = count > 0 ? Math.round(amount / count) : 0;

            return (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                      <Icon className="size-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white capitalize">{PROVIDER_LABEL(t.provider)}</p>
                      <p className="text-xs text-gray-500">{count} transaction{count !== 1 ? "s" : ""} • avg {avgAmount.toLocaleString()} ETB</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{amount.toLocaleString()} ETB</p>
                    <Badge variant="outline" className="text-[10px]">
                      {PROVIDER_LABEL(t.provider)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
