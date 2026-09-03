import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useInventoryStore } from "@/store/useInventoryStore";
import { useMenuStore } from "@/store/useMenuStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Package, Pencil, Trash2, Search, AlertTriangle, Boxes } from "lucide-react";

/**
 * Manager: Daily food stock manager.
 * Backend model: DailyStock { branchId, foodItemId, businessDate, preparedQuantity, soldQuantity, remainingQuantity, status }
 *
 *   GET  /branches/:branchId/stock/today   - list today's rows
 *   POST /branches/:branchId/stock         - upsert a single row
 *   POST /branches/:branchId/stock/bulk    - bulk upsert
 *   PATCH /stock/:stockId                  - update existing row
 */
const ManagerInventory = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId;
  const { items, fetchTodayStock, setDailyStock, bulkSetDailyStock, isLoading } = useInventoryStore();
  const { menu, getFoodItemsByBranch } = useMenuStore();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ foodItemId: "", preparedQuantity: 0, lowStockThreshold: 5 });

  useEffect(() => {
    if (!branchId) return;
    fetchTodayStock(branchId);
    getFoodItemsByBranch(branchId);
  }, [branchId, fetchTodayStock, getFoodItemsByBranch]);

  const save = async () => {
    if (!form.foodItemId) return;
    const res = await setDailyStock(branchId, {
      foodItemId: form.foodItemId,
      preparedQuantity: Number(form.preparedQuantity) || 0,
      lowStockThreshold: Number(form.lowStockThreshold) || 5,
    });
    if (res.success) {
      setOpen(false);
      setEditing(null);
    }
  };

  const bulkSaveAll = async () => {
    const payload = menu
      .filter((f) => !items.find((s) => (s.foodItemId?._id || s.foodItemId) === f._id))
      .map((f) => ({ foodItemId: f._id, preparedQuantity: 50, lowStockThreshold: 5 }));
    if (payload.length === 0) return;
    await bulkSetDailyStock(branchId, payload);
  };

  const filtered = items.filter((it) => {
    if (!search) return true;
    const name = it.foodItemId?.name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const lowStock = items.filter((it) => it.status === "LOW_STOCK");
  const soldOut = items.filter((it) => it.status === "SOLD_OUT");

  if (!branchId) {
    return <div className="p-6"><p className="text-muted-foreground">No branch assigned yet.</p></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Boxes className="size-5" /> Daily Food Stock
          </h1>
          <p className="text-sm text-muted-foreground">
            Track today's stock levels per branch. The kitchen auto-deducts on order confirmation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={bulkSaveAll}>Init all foods to 50</Button>
          <Button
            onClick={() => {
              setEditing(null);
              setForm({ foodItemId: menu[0]?._id || "", preparedQuantity: 50, lowStockThreshold: 5 });
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> Set / Update Stock
          </Button>
        </div>
      </div>

      {(lowStock.length > 0 || soldOut.length > 0) && (
        <div className="grid md:grid-cols-2 gap-3">
          <Card className="border-amber-500/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="size-4 text-amber-500" />
                <span className="font-semibold">Low stock ({lowStock.length})</span>
              </div>
              <p className="text-xs text-muted-foreground">Consider preparing more portions before service.</p>
            </CardContent>
          </Card>
          {soldOut.length > 0 && (
            <Card className="border-red-500/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="size-4 text-red-500" />
                  <span className="font-semibold">Sold out ({soldOut.length})</span>
                </div>
                <p className="text-xs text-muted-foreground">These items are hidden from the customer menu.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Today's Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Search className="size-4 text-muted-foreground" />
            <Input
              placeholder="Search by food name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {isLoading && items.length === 0 ? (
            <Skeleton className="h-32 w-full" />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No stock rows yet"
              description="Use 'Set / Update Stock' to initialize today's portions."
              icon={Package}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2">Food</th>
                    <th className="py-2">Prepared</th>
                    <th className="py-2">Sold</th>
                    <th className="py-2">Remaining</th>
                    <th className="py-2">Status</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const name = s.foodItemId?.name || "Unknown";
                    const remaining = s.remainingQuantity;
                    return (
                      <tr key={s._id} className="border-b">
                        <td className="py-2 font-medium">{name}</td>
                        <td className="py-2">{s.preparedQuantity}</td>
                        <td className="py-2">{s.soldQuantity}</td>
                        <td className="py-2">{remaining}</td>
                        <td className="py-2">
                          <Badge
                            className={
                              s.status === "SOLD_OUT" ? "bg-red-500" :
                              s.status === "LOW_STOCK" ? "bg-amber-500" : "bg-green-600"
                            }
                          >
                            {s.status?.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setEditing(s._id);
                              setForm({
                                foodItemId: s.foodItemId?._id || s.foodItemId,
                                preparedQuantity: s.preparedQuantity,
                                lowStockThreshold: s.lowStockThreshold,
                              });
                              setOpen(true);
                            }}
                          >
                            <Pencil className="size-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Update stock" : "Set / update stock"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Food item</Label>
              <select
                className="w-full h-9 rounded-md border bg-transparent px-2 text-sm"
                value={form.foodItemId}
                onChange={(e) => setForm({ ...form, foodItemId: e.target.value })}
                disabled={!!editing}
              >
                <option value="">Select food</option>
                {menu.map((f) => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Prepared qty</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.preparedQuantity}
                  onChange={(e) => setForm({ ...form, preparedQuantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Low-stock threshold</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.lowStockThreshold}
                  onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerInventory;
