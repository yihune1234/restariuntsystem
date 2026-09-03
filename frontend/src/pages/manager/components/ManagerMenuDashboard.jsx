import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useMenuStore } from "@/store/useMenuStore";
import { useInventoryStore } from "@/store/useInventoryStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
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
  UtensilsCrossed,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  ChefHat,
  Percent,
  Image as ImageIcon,
} from "lucide-react";

const STOCK_STATUS_CONFIG = {
  AVAILABLE: { color: "bg-green-500", label: "In Stock", textColor: "text-green-600" },
  LOW_STOCK: { color: "bg-yellow-500", label: "Low Stock", textColor: "text-yellow-600" },
  OUT_OF_STOCK: { color: "bg-red-500", label: "Out of Stock", textColor: "text-red-600" },
};

const MenuItemDetailsDrawer = ({ item, stock, open, onClose, onToggleAvailability }) => {
  if (!item) return null;

  const stockStatus = stock
    ? STOCK_STATUS_CONFIG[stock.status] || STOCK_STATUS_CONFIG.AVAILABLE
    : null;

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()} direction="right">
      <DrawerContent className="max-w-md">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>{item.name}</DrawerTitle>
              <DrawerDescription>
                {item.categoryId?.name || "Uncategorized"}
              </DrawerDescription>
            </div>
            <Badge className={item.isAvailable ? "bg-green-600" : "bg-gray-500"}>
              {item.isAvailable ? "Available" : "Unavailable"}
            </Badge>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {/* Image */}
            <div className="size-32 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <UtensilsCrossed className="size-8 text-muted-foreground" />
              )}
            </div>

            {/* Price & Prep Time */}
            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <DollarSign className="size-4" /> Price
                  </span>
                  <span className="font-bold text-lg">{Number(item.price || 0).toLocaleString()} ETB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="size-4" /> Prep Time
                  </span>
                  <span className="font-medium">{item.preparationTimeMinutes || 15} min</span>
                </div>
              </CardContent>
            </Card>

            {/* Stock Status */}
            {stockStatus && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Stock Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className={`size-3 rounded-full ${stockStatus.color}`} />
                    <span className={`font-medium ${stockStatus.textColor}`}>
                      {stockStatus.label}
                    </span>
                    {stock?.remainingQuantity !== undefined && (
                      <span className="text-sm text-muted-foreground ml-auto">
                        {stock.remainingQuantity} remaining
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            {(item.description || item.descriptionEn) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {item.description || item.descriptionEn}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Quick Availability Toggle */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.isAvailable ? (
                      <CheckCircle className="size-4 text-green-600" />
                    ) : (
                      <XCircle className="size-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium">
                      {item.isAvailable ? "Available for orders" : "Not available"}
                    </span>
                  </div>
                  <Switch
                    checked={item.isAvailable !== false}
                    onCheckedChange={() => onToggleAvailability(item)}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

const MenuItemCard = ({ item, stock, onClick, onToggle }) => {
  const stockStatus = stock
    ? STOCK_STATUS_CONFIG[stock.status] || STOCK_STATUS_CONFIG.AVAILABLE
    : null;
  const isLowStock = stock?.status === "LOW_STOCK";
  const isOutOfStock = stock?.status === "OUT_OF_STOCK" || !stock;

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all ${
        !item.isAvailable ? "opacity-60" : ""
      } ${isOutOfStock ? "border-red-200" : isLowStock ? "border-yellow-200" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="size-14 rounded-lg bg-muted flex-none overflow-hidden flex items-center justify-center">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <UtensilsCrossed className="size-6 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.categoryId?.name || item.category?.name || "Uncategorized"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-bold text-sm text-primary">
                  {Number(item.price || 0).toLocaleString()} ETB
                </span>
                {stockStatus && (
                  <div className={`flex items-center gap-1 text-xs ${stockStatus.textColor}`}>
                    <div className={`size-1.5 rounded-full ${stockStatus.color}`} />
                    <span>{stockStatus.label}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={item.isAvailable ? "default" : "outline"}
                  className={`text-xs ${item.isAvailable ? "bg-green-600" : ""}`}
                >
                  {item.isAvailable ? "Available" : "Unavailable"}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" />
                  {item.preparationTimeMinutes || 15}m
                </span>
              </div>

              <Switch
                checked={item.isAvailable !== false}
                onCheckedChange={(e) => {
                  e.stopPropagation();
                  onToggle(item);
                }}
                className="data-[state=checked]:bg-green-600 h-4 w-8"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ManagerMenuDashboard = ({ branchId }) => {
  const { authUser } = useAuthStore();
  const effectiveBranchId = branchId || authUser?.branchId;

  const {
    menu,
    category,
    mealTypes,
    isLoading,
    getMealPeriodsByBranch,
    getCategoriesByBranch,
    getFoodItemsByBranch,
    updateFoodItem,
  } = useMenuStore();

  const {
    items: stockItems,
    fetchTodayStock,
  } = useInventoryStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedMealPeriod, setSelectedMealPeriod] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (!effectiveBranchId) return;
    getMealPeriodsByBranch(effectiveBranchId);
    getFoodItemsByBranch(effectiveBranchId, { activeOnly: true });
    fetchTodayStock(effectiveBranchId);
  }, [effectiveBranchId, getMealPeriodsByBranch, getFoodItemsByBranch, fetchTodayStock]);

  const stockMap = useMemo(() => {
    const map = {};
    stockItems.forEach((s) => {
      const foodId = s.foodItemId?._id || s.foodItemId;
      if (foodId) map[foodId] = s;
    });
    return map;
  }, [stockItems]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: menu.length,
      available: 0,
      unavailable: 0,
      lowStock: 0,
      outOfStock: 0,
    };

    menu.forEach((item) => {
      const stock = stockMap[item._id];
      if (!item.isAvailable) {
        counts.unavailable++;
      } else if (stock?.status === "OUT_OF_STOCK" || !stock) {
        counts.outOfStock++;
        counts.unavailable++;
      } else if (stock?.status === "LOW_STOCK") {
        counts.lowStock++;
      } else {
        counts.available++;
      }
    });

    return counts;
  }, [menu, stockMap]);

  const filteredItems = useMemo(() => {
    let items = menu;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          (i.name || "").toLowerCase().includes(q) ||
          (i.nameEn || "").toLowerCase().includes(q) ||
          (i.categoryId?.name || "").toLowerCase().includes(q)
      );
    }

    if (statusFilter === "available") {
      items = items.filter((i) => i.isAvailable && stockMap[i._id]?.status !== "LOW_STOCK" && stockMap[i._id]?.status !== "OUT_OF_STOCK");
    } else if (statusFilter === "unavailable") {
      items = items.filter((i) => !i.isAvailable);
    } else if (statusFilter === "lowStock") {
      items = items.filter((i) => i.isAvailable && stockMap[i._id]?.status === "LOW_STOCK");
    } else if (statusFilter === "outOfStock") {
      items = items.filter((i) => !i.isAvailable || !stockMap[i._id] || stockMap[i._id].status === "OUT_OF_STOCK");
    } else if (statusFilter === "promotions") {
      items = items.filter((i) => i.promotion?.active);
    }

    return items;
  }, [menu, searchQuery, statusFilter, stockMap]);

  const handleToggleAvailability = async (item) => {
    await updateFoodItem(item._id, { isAvailable: !item.isAvailable });
    getFoodItemsByBranch(effectiveBranchId, { activeOnly: true });
  };

  const statusTabs = [
    { key: null, label: "All", count: statusCounts.all },
    { key: "available", label: "Available", count: statusCounts.available, color: "text-green-600" },
    { key: "unavailable", label: "Unavailable", count: statusCounts.unavailable, color: "text-gray-600" },
    { key: "lowStock", label: "Low Stock", count: statusCounts.lowStock, color: "text-yellow-600" },
    { key: "outOfStock", label: "Out of Stock", count: statusCounts.outOfStock, color: "text-red-600" },
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
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="size-4" />
              Menu Overview
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 w-48"
                />
              </div>
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
          {isLoading && menu.length === 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              title="No menu items"
              description={searchQuery ? "No items match your search." : "Menu items will appear here."}
              icon={UtensilsCrossed}
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredItems.map((item) => (
                <MenuItemCard
                  key={item._id}
                  item={item}
                  stock={stockMap[item._id]}
                  onClick={() => setSelectedItem(item)}
                  onToggle={handleToggleAvailability}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <MenuItemDetailsDrawer
        item={selectedItem}
        stock={selectedItem ? stockMap[selectedItem._id] : null}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onToggleAvailability={handleToggleAvailability}
      />
    </div>
  );
};

export default ManagerMenuDashboard;
