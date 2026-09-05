import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { usePaymentStore } from "@/store/usePaymentStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { RefreshCw, Search, Calendar, DollarSign, Receipt, CreditCard, Wallet } from "lucide-react";

const PAYMENT_ICONS = {
  CASH: Wallet,
  CARD: CreditCard,
  CHAPA: CreditCard,
  TELEBIRR: CreditCard,
  BANK_TRANSFER: CreditCard,
};

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
    return (t.provider || "").toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalAmount = transactions.reduce((s, t) => s + (t.totalAmount || 0), 0);
  const totalCount = transactions.reduce((s, t) => s + (t.count || t.totalCount || 0), 0);

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned.</p></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground">Payment history</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`size-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <DollarSign className="size-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-700">{totalAmount.toLocaleString()}</p>
            <p className="text-sm text-green-600">Total Revenue (ETB)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Receipt className="size-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold">{totalCount}</p>
            <p className="text-sm text-muted-foreground">Transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CreditCard className="size-6 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold">{totalCount > 0 ? Math.round(totalAmount / totalCount).toLocaleString() : 0}</p>
            <p className="text-sm text-muted-foreground">Avg Order (ETB)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search payment method..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-36" />
              <span className="text-muted-foreground">to</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 w-36" />
            </div>
            <Button size="sm" onClick={handleRefresh}>Apply</Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && transactions.length === 0 ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <EmptyState title="No transactions" description="No transactions found." icon={Receipt} />
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((t, i) => {
            const Icon = PAYMENT_ICONS[t.provider] || CreditCard;
            const count = t.count || t.totalCount || 0;
            const amount = t.totalAmount || 0;

            return (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{t.provider || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{count} transaction{count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-600">{amount.toLocaleString()} ETB</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const CashierDashboard = () => {
  const { transactions, fetchTransactions } = usePaymentStore();
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;

  useEffect(() => {
    if (branchId) fetchTransactions(branchId);
  }, [branchId, fetchTransactions]);

  const totalAmount = transactions.reduce((s, t) => s + (t.totalAmount || 0), 0);
  const totalCount = transactions.reduce((s, t) => s + (t.count || t.totalCount || 0), 0);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cashier Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {authUser?.name}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <DollarSign className="size-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-700">{totalAmount.toLocaleString()}</p>
            <p className="text-sm text-green-600">Total Revenue (ETB)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Receipt className="size-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold">{totalCount}</p>
            <p className="text-sm text-muted-foreground">Transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CreditCard className="size-6 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold">{totalCount > 0 ? Math.round(totalAmount / totalCount).toLocaleString() : 0}</p>
            <p className="text-sm text-muted-foreground">Avg Order (ETB)</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Use <strong>Create Order</strong> for manual entry or <strong>Payments</strong> to process customer payments.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export const CashierCreateOrder = () => {
  const CreateOrder = React.lazy(() => import('../shared/CreateOrder').then(m => ({ default: m.default })));
  return (
    <React.Suspense fallback={<div className="p-6"><p className="text-muted-foreground">Loading...</p></div>}>
      <CreateOrder />
    </React.Suspense>
  );
};

export const CashierProfile = () => {
  const { authUser } = useAuthStore();
  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <h1 className="text-xl font-bold mb-4">My Profile</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
              {authUser?.name?.slice(0, 2).toUpperCase() || "??"}
            </div>
            <div>
              <CardTitle className="text-lg">{authUser?.name}</CardTitle>
              <Badge variant="outline" className="capitalize mt-1">{authUser?.role}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{authUser?.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{authUser?.phone || "—"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
