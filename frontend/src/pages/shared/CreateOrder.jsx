import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useMenuStore } from "@/store/useMenuStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useTableStore } from "@/store/useTableStore";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, Plus, Utensils, AlertCircle, RefreshCw } from "lucide-react";
import CartPanel from "./CartPanel";
import { usePaymentStore } from "@/store/usePaymentStore";

const getDisplayName = (entity, lang) => {
  if (!entity) return "";
  if (lang === "om" && entity.nameOm) return entity.nameOm;
  if (lang === "am" && entity.nameAm) return entity.nameAm;
  if (lang === "en" && entity.nameEn) return entity.nameEn;
  return entity.name || "";
};

const CreateOrder = () => {
  const { authUser } = useAuthStore();
  const { t, lang } = useTranslation();
  const role = authUser?.role;
  const canConfirmPayment = role === "CASHIER" || role === "MANAGER" || role === "OWNER";

  const menuStore = useMenuStore();
  const getCategories = menuStore.getCategories;
  const getFoodItems = menuStore.getFoodItems;
  const getMealPeriods = menuStore.getMealPeriods;

  const { cart, addToCart, removeFromCart, placeOrder, getCartTotal, clearCart } = useOrderStore();
  const { tables, getTables } = useTableStore();
  const { confirmCashierPayment } = usePaymentStore();

  const [categories, setCategories] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [catsError, setCatsError] = useState(null);

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [mealPeriods, setMealPeriods] = useState([]);
  const [selectedMealId, setSelectedMealId] = useState("all");
  const [tableId, setTableId] = useState("");
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInPhone, setWalkInPhone] = useState("");
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountReceived, setAmountReceived] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const loadCategories = useCallback(async () => {
    setCatsLoading(true);
    setCatsError(null);
    try {
      const cats = await getCategories({ activeOnly: true });
      setCategories(cats || []);
      if (cats?.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0]);
      }
    } catch (err) {
      setCatsError(err.message || "Failed to load categories");
      toast.error("Failed to load categories");
    } finally {
      setCatsLoading(false);
    }
  }, [getCategories]);

  const loadFoodItems = useCallback(async (categoryId) => {
    setItemsLoading(true);
    try {
      const items = await getFoodItems({ categoryId: categoryId || undefined });
      setFoodItems(items || []);
    } catch (err) {
      toast.error("Failed to load food items");
    } finally {
      setItemsLoading(false);
    }
  }, [getFoodItems]);

  useEffect(() => {
    getTables();
  }, [getTables]);

  const loadMealPeriods = useCallback(async () => {
    const list = await getMealPeriods({ activeOnly: true });
    setMealPeriods(Array.isArray(list) ? list : []);
  }, [getMealPeriods]);

  useEffect(() => {
    loadCategories();
    loadMealPeriods();
  }, [loadCategories, loadMealPeriods]);

  const meals = useMemo(() => {
    const opts = (mealPeriods || []).map(mp => ({ id: String(mp._id), label: getDisplayName(mp, lang) || mp.name }));
    return [{ id: "all", label: "All" }, ...opts];
  }, [mealPeriods, lang]);

  const visibleCategories = useMemo(() => {
    if (selectedMealId === "all") return categories;
    const selectedMeal = (mealPeriods || []).find(mp => String(mp._id) === selectedMealId);
    if (selectedMeal && (selectedMeal.name === "ALL_DAY" || (selectedMeal.nameEn || "").toLowerCase().includes("all-day"))) {
      return categories;
    }
    return categories.filter(c => {
      const ids = (c.mealPeriodIds || []).map(String);
      return ids.length === 0 || ids.includes(selectedMealId);
    });
  }, [categories, selectedMealId, mealPeriods]);

  useEffect(() => {
    if (visibleCategories.length > 0 && !visibleCategories.some(c => c._id === selectedCategory?._id)) {
      setSelectedCategory(visibleCategories[0]);
    } else if (visibleCategories.length === 0) {
      setSelectedCategory(null);
    }
  }, [visibleCategories, selectedCategory]);

  useEffect(() => {
    if (selectedCategory) {
      loadFoodItems(selectedCategory._id);
    } else {
      loadFoodItems();
    }
  }, [selectedCategory, loadFoodItems]);

  const filteredItems = useMemo(() => {
    let items = foodItems;
    if (selectedMealId !== "all") {
      items = items.filter(i => {
        const itemMpIds = (i.mealPeriodIds || []).map(id => String(id?._id || id));
        if (itemMpIds.length === 0) return true;
        return itemMpIds.includes(selectedMealId);
      });
    }
    if (selectedCategory) {
      items = items.filter(i => String(i.categoryId) === String(selectedCategory._id));
    }
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(i => getDisplayName(i, lang).toLowerCase().includes(q));
    }
    if (sortBy === "name") {
      items = [...items].sort((a, b) => (getDisplayName(a, lang) || a.name).localeCompare(getDisplayName(b, lang) || b.name));
    } else if (sortBy === "price") {
      items = [...items].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "category") {
      items = [...items].sort((a, b) => String(a.categoryId).localeCompare(String(b.categoryId)));
    }
    return items;
  }, [foodItems, selectedCategory, query, lang, sortBy, selectedMealId, mealPeriods]);

  const handlePlace = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    if (!isWalkIn && !tableId) return toast.error("Please select a table");
    if (isWalkIn && !walkInPhone.trim()) return toast.error("Enter customer phone number");
    setPlacing(true);
    const items = cart.map(c => ({ foodItemId: c.foodItemId, quantity: c.quantity }));
    const orderData = {
      tableId: isWalkIn ? null : tableId,
      items,
      source: "CASHIER",
      customerName: isWalkIn ? walkInPhone.trim() : null,
    };
    const res = await placeOrder(orderData);
    setPlacing(false);
    if (res.success) {
      toast.success(`Placed • Code: ${res.order.securityCode}`);
      clearCart();
      setTableId("");
      setWalkInPhone("");
      setIsWalkIn(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    if (!isWalkIn && !tableId) return toast.error("Please select a table");
    if (isWalkIn && !walkInPhone.trim()) return toast.error("Enter customer phone number");
    if (!paymentMethod) return toast.error("Select a payment method");
    if (paymentMethod === "CASH" && (!amountReceived || Number(amountReceived) < getCartTotal())) {
      return toast.error("Enter valid amount received");
    }
    setPlacing(true);
    try {
      const items = cart.map(c => ({ foodItemId: c.foodItemId, quantity: c.quantity }));
      const orderRes = await placeOrder({
        tableId: isWalkIn ? null : tableId,
        items,
        source: "CASHIER",
        customerName: isWalkIn ? walkInPhone.trim() : null,
      });
      if (!orderRes.success) {
        setPlacing(false);
        return;
      }
      const order = orderRes.order;
      const paymentRes = await confirmCashierPayment(order._id, { paymentMethod });
      if (paymentRes.success) {
        toast.success(`Paid & Sent to Kitchen • Code: ${order.securityCode}`);
        clearCart();
        setTableId("");
        setWalkInPhone("");
        setIsWalkIn(false);
        setAmountReceived("");
      } else {
        toast.error(paymentRes.message || "Payment failed");
      }
    } catch (err) {
      toast.error(err.message || "Failed to confirm payment");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 grid lg:grid-cols-[1fr_340px] gap-5">
      <div className="w-full space-y-4">
        <div className="flex items-center gap-2">
          <Search className="text-muted-foreground" />
          <Input placeholder="Search items..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {catsError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="text-red-500" />
              <p className="text-sm text-red-700">{catsError}</p>
              <Button size="sm" variant="outline" onClick={loadCategories}>
                <RefreshCw className="size-3 mr-1" /> Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {catsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-24" />)}
            </div>
          </div>
        ) : (
          <>
            {meals.length > 1 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Meal Types</h3>
                <div className="flex gap-2 overflow-x-auto">
                  {meals.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMealId(m.id)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                        selectedMealId === m.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-gray-200 dark:border-gray-700 hover:bg-muted"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {visibleCategories.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{t('manager.categories')}</h3>
                <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                  {visibleCategories.map(c => (
                    <button
                      key={c._id}
                      onClick={() => setSelectedCategory(c._id === selectedCategory?._id ? null : c)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                        selectedCategory?._id === c._id
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {getDisplayName(c, lang) || c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{t('manager.foodItems')} ({filteredItems.length})</h3>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="h-8 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-2 focus:ring-ring"
                title="Sort items"
              >
                <option value="name">Sort: Name (A–Z)</option>
                <option value="price">Sort: Price (Low–High)</option>
                <option value="category">Sort: Category</option>
              </select>
            </div>
          </div>
          {itemsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full mb-2" /><Skeleton className="h-4 w-3/4 mb-1" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Utensils className="size-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No food items found.</p>
                {categories.length === 0 && !catsLoading && (
                  <p className="text-xs text-muted-foreground mt-1">No categories available. Add categories from the Manager menu.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredItems.map(item => {
                const isSoldOut = item.isAvailable === false;
                const isHidden = item.isHidden === true;
                return (
                  <Card key={item._id} className={isSoldOut || isHidden ? "opacity-60" : ""}>
                    <CardContent className="p-3">
                      <div className="h-16 mb-2 rounded bg-muted flex items-center justify-center overflow-hidden relative">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} className="h-full w-full object-cover" alt={item.name} />
                        ) : (
                          <Utensils className="text-muted-foreground" />
                        )}
                        {isSoldOut && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Sold Out</span>
                          </div>
                        )}
                        {isHidden && !isSoldOut && (
                          <div className="absolute top-1 right-1">
                            <span className="bg-gray-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Hidden</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-semibold line-clamp-1">{getDisplayName(item, lang) || item.name}</p>
                      <p className="text-sm font-bold text-primary">
                        {Number(item.price || 0).toLocaleString()} ETB
                      </p>
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        disabled={isSoldOut || isHidden}
                        onClick={() => addToCart({ ...item, unitPrice: item.price, foodName: item.name })}
                      >
                        <Plus className="size-3" /> {isSoldOut ? "Sold Out" : "Add"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CartPanel
        cart={cart}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        tableId={tableId}
        setTableId={setTableId}
        tables={tables}
        total={getCartTotal()}
        placing={placing}
        handlePlace={handlePlace}
        isCashier={canConfirmPayment}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        amountReceived={amountReceived}
        setAmountReceived={setAmountReceived}
        handleConfirmPayment={handleConfirmPayment}
        isWalkIn={isWalkIn}
        setIsWalkIn={setIsWalkIn}
        walkInPhone={walkInPhone}
        setWalkInPhone={setWalkInPhone}
      />
    </div>
  );
};

export default CreateOrder;
