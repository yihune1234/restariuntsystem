import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useInventoryStore } from "@/store/useInventoryStore";
import { useMenuStore } from "@/store/useMenuStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Package,
  Search,
  Boxes,
  AlertTriangle,
  CheckCircle,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  History,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const STOCK_STATUS_CONFIG = {
  AVAILABLE: { color: "bg-green-500", label: "In Stock", textColor: "text-green-600" },
  LOW_STOCK: { color: "bg-yellow-500", label: "Low Stock", textColor: "text-yellow-600" },
  SOLD_OUT: { color: "bg-red-500", label: "Sold Out", textColor: "text-red-600" },
};

const StockMovementDrawer = ({ stock, open, onClose }) => {
  if (!stock) return null;

  // NOTE: the backend stores a daily stock snapshot (prepared, sold, remaining)
  // per food item but does not yet persist a time-ordered movement ledger.
  // We therefore present the true, current snapshot rather than fabricating
  // individual movement rows that would imply a server-side history that
  // doesn't exist.
  const summary = {
    prepared: stock.preparedQuantity || 0,
    sold: stock.soldQuantity || 0,
    remaining: stock.remainingQuantity ?? 0,
    lowStockThreshold: stock.lowStockThreshold,
  };

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()} direction="right">
      <DrawerContent className="max-w-md">
        <DrawerHeader>
          <DrawerTitle>Stock Summary</DrawerTitle>
          <DrawerDescription>
            {stock.foodItemId?.name || "Item"} - {stock.businessDate}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {summary.prepared === 0 && summary.sold === 0 && summary.remaining === 0 ? (
            <EmptyState
              title="No stock recorded"
              description="Set today's prepared quantity to begin tracking this item."
              icon={Package}
            />
          ) : (
            <div className="space-y-3">
              <div className={`p-4 rounded-lg border ${STOCK_STATUS_CONFIG[stock.status]?.color === "bg-green-500" ? "border-green-200 bg-green-50" : stock.status === "LOW_STOCK" ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Remaining</span>
                  <span className="font-bold">{summary.remaining}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Currently {stock.status === "AVAILABLE" ? "in stock" : stock.status === "LOW_STOCK" ? "low stock" : "sold out"}
                </div>
              </div>
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Prepared Today</span>
                  <span className="font-bold">{summary.prepared}</span>
                </div>
              </div>
              <div className="p-4 rounded-lg border border-indigo-200 bg-indigo-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sold Today</span>
                  <span className="font-bold">{summary.sold}</span>
                </div>
              </div>
              <div className="p-4 rounded-lg border border-muted bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Low-Stock Threshold</span>
                  <span className="font-bold">{summary.lowStockThreshold ?? "-"}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                A per-movement history (prepared/sold/waste) is not persisted by the
                backend yet. This view reflects the current daily snapshot.
              </p>
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

const StockItemCard = ({ stock, onClick, onAdjust }) => {
  const statusConfig = STOCK_STATUS_CONFIG[stock.status] || STOCK_STATUS_CONFIG.AVAILABLE;
  const stockPercent = stock.preparedQuantity > 0
    ? Math.round((stock.remainingQuantity / stock.preparedQuantity) * 100)
    : 0;

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all ${
        stock.status === "LOW_STOCK" ? "border-yellow-200" :
        stock.status === "SOLD_OUT" ? "border-red-200" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {stock.foodItemId?.name || "Unknown Item"}
            </p>
            <p className="text-xs text-muted-foreground">
              {stock.foodItemId?.categoryId?.name || stock.foodItemId?.category?.name || "Uncategorized"}
            </p>
          </div>
          <Badge className={`${statusConfig.color} text-white text-xs`}>
            {statusConfig.label}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-bold">{stock.remainingQuantity}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Prepared: {stock.preparedQuantity}</span>
            <span>Sold: {stock.soldQuantity}</span>
          </div>

          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full ${statusConfig.color}`}
              style={{ width: `${stockPercent}%` }}
            />
          </div>

          {stock.status === "LOW_STOCK" && (
            <div className="flex items-center gap-1 text-xs text-yellow-600">
              <AlertTriangle className="size-3" />
              <span>Below threshold ({stock.lowStockThreshold})</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 mt-3 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7"
            onClick={(e) => {
              e.stopPropagation();
              onAdjust(stock, "RESTOCK");
            }}
          >
            <Plus className="size-3 mr-1" /> Add
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7"
            onClick={(e) => {
              e.stopPropagation();
              onAdjust(stock, "WASTE");
            }}
          >
            <Trash2 className="size-3 mr-1" /> Waste
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={(e) => {
              e.stopPropagation();
              onClick(stock);
            }}
          >
            <History className="size-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const StockAdjustmentDialog = ({ stock, type, open, onClose, onSave }) => {
  const [quantity, setQuantity] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (stock) {
      setQuantity(type === "WASTE" ? 1 : 10);
    }
  }, [stock, type]);

  const handleSave = () => {
    if (quantity <= 0) return;
    onSave(stock, type, quantity, note);
    onClose();
  };

  const isWaste = type === "WASTE";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isWaste ? "Record Waste" : "Add Stock"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">
              {stock?.foodItemId?.name || "Item"}
            </p>
            <p className="text-xs text-muted-foreground">
              Current stock: {stock?.remainingQuantity || 0}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              {isWaste ? "Quantity wasted" : "Quantity to add"}
            </label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Note (optional)
            </label>
            <Input
              placeholder={isWaste ? "Reason for waste..." : "Source of stock..."}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant={isWaste ? "destructive" : "default"}
            onClick={handleSave}
            disabled={quantity <= 0}
          >
            {isWaste ? "Record Waste" : "Add Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ManagerInventoryDashboard = ({ branchId }) => {
  const { authUser } = useAuthStore();
  const effectiveBranchId = branchId || authUser?.branchId;

  const {
    items: stockItems,
    fetchTodayStock,
    setDailyStock,
    updateStock,
    isLoading,
  } = useInventoryStore();

  const {
    menu,
    getFoodItemsByBranch,
  } = useMenuStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [adjustDialog, setAdjustDialog] = useState({ open: false, stock: null, type: null });
  const [movementDrawer, setMovementDrawer] = useState(null);

  useEffect(() => {
    if (!effectiveBranchId) return;
    fetchTodayStock(effectiveBranchId);
    getFoodItemsByBranch(effectiveBranchId);
  }, [effectiveBranchId, fetchTodayStock, getFoodItemsByBranch]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: stockItems.length,
      available: 0,
      lowStock: 0,
      soldOut: 0,
      attention: 0,
    };

    stockItems.forEach((item) => {
      if (item.status === "SOLD_OUT") {
        counts.soldOut++;
        counts.attention++;
      } else if (item.status === "LOW_STOCK") {
        counts.lowStock++;
        counts.attention++;
      } else {
        counts.available++;
      }
    });

    return counts;
  }, [stockItems]);

  const filteredItems = useMemo(() => {
    let items = stockItems;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          (i.foodItemId?.name || "").toLowerCase().includes(q) ||
          (i.foodItemId?.categoryId?.name || "").toLowerCase().includes(q)
      );
    }

    if (statusFilter === "available") {
      items = items.filter((i) => i.status === "AVAILABLE");
    } else if (statusFilter === "lowStock") {
      items = items.filter((i) => i.status === "LOW_STOCK");
    } else if (statusFilter === "soldOut") {
      items = items.filter((i) => i.status === "SOLD_OUT");
    } else if (statusFilter === "attention") {
      items = items.filter((i) => i.status !== "AVAILABLE");
    }

    return items;
  }, [stockItems, searchQuery, statusFilter]);

  const handleAdjustStock = async (stock, type, quantity, note) => {
    if (type === "WASTE") {
      const newRemaining = Math.max(0, stock.remainingQuantity - quantity);
      await updateStock(stock._id, {
        preparedQuantity: newRemaining + stock.soldQuantity,
        lowStockThreshold: stock.lowStockThreshold,
      });
    } else if (type === "RESTOCK") {
      const newPrepared = stock.remainingQuantity + quantity;
      await setDailyStock(effectiveBranchId, {
        foodItemId: stock.foodItemId?._id || stock.foodItemId,
        preparedQuantity: newPrepared,
        lowStockThreshold: stock.lowStockThreshold,
      });
    }
    fetchTodayStock(effectiveBranchId);
  };

  const statsCards = [
    {
      label: "Total Items",
      value: statusCounts.all,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "In Stock",
      value: statusCounts.available,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Low Stock",
      value: statusCounts.lowStock,
      icon: TrendingDown,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Sold Out",
      value: statusCounts.soldOut,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  const statusTabs = [
    { key: null, label: "All", count: statusCounts.all },
    { key: "available", label: "In Stock", count: statusCounts.available, color: "text-green-600" },
    { key: "lowStock", label: "Low Stock", count: statusCounts.lowStock, color: "text-yellow-600" },
    { key: "soldOut", label: "Sold Out", count: statusCounts.soldOut, color: "text-red-600" },
    { key: "attention", label: "Attention", count: statusCounts.attention, color: "text-orange-600" },
  ];

  if (!effectiveBranchId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No branch assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`size-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Stock List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Boxes className="size-4" />
              Daily Stock
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 w-48"
              />
            </div>
          </div>

          <div className="flex gap-1 flex-wrap mt-2 overflow-x-auto pb-1">
            {statusTabs.map((tab) => (
              <Badge
                key={tab.key || "all"}
                variant={statusFilter === tab.key ? "default" : "outline"}
                className={`cursor-pointer text-xs whitespace-nowrap ${
                  tab.color ? tab.color : ""
                }`}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label} ({tab.count})
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading && stockItems.length === 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              title="No stock items"
              description={searchQuery ? "No items match your search." : "Stock items will appear here."}
              icon={Package}
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredItems.map((stock) => (
                <StockItemCard
                  key={stock._id}
                  stock={stock}
                  onClick={() => setMovementDrawer(stock)}
                  onAdjust={(s, type) => setAdjustDialog({ open: true, stock: s, type })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        stock={adjustDialog.stock}
        type={adjustDialog.type}
        open={adjustDialog.open}
        onClose={() => setAdjustDialog({ open: false, stock: null, type: null })}
        onSave={handleAdjustStock}
      />

      {/* Movement History Drawer */}
      <StockMovementDrawer
        stock={movementDrawer}
        open={!!movementDrawer}
        onClose={() => setMovementDrawer(null)}
      />
    </div>
  );
};

export default ManagerInventoryDashboard;
