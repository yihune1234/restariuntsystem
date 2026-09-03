import React, { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useMenuStore } from "@/store/useMenuStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useTableStore } from "@/store/useTableStore";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, Plus, Utensils, Layers, Clock } from "lucide-react";
import CartPanel from "./CartPanel";
import { usePaymentStore, PAYMENT_METHODS } from "@/store/usePaymentStore";

/**
 * Resolve display name from multilingual API fields.
 */
const getDisplayName = (entity, lang) => {
  if (!entity) return "";
  if (lang === "om" && entity.nameOm) return entity.nameOm;
  if (lang === "am" && entity.nameAm) return entity.nameAm;
  if (lang === "en" && entity.nameEn) return entity.nameEn;
  return entity.name || entity.nameEn || "";
};

/**
 * "Create Order" page shared by waiter + cashier with proper menu hierarchy:
 * Meal Type → Category → Food Items (available only)
 * 
 * Cashier: Creates order + confirms payment in one step
 * Waiter: Creates order only (payment handled by cashier)
 */
const CreateOrder = () => {
  const { authUser } = useAuthStore();
  const branchId = authUser?.branchId?._id || authUser?.branchId;
  const { t, lang } = useTranslation();
  const isCashier = authUser?.role === "CASHIER";

  const { menu, getFoodItemsByBranch, category, getCategoriesByBranch, mealTypes, getMealPeriodsByBranch, isLoading } = useMenuStore();
  const { cart, addToCart, removeFromCart, placeOrder, getCartTotal, clearCart } = useOrderStore();
  const { tables, getTablesByBranch } = useTableStore();
  const { confirmCashierPayment } = usePaymentStore();

  const [query, setQuery] = useState("");
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [tableId, setTableId] = useState("");
  const [placing, setPlacing] = useState(false);

  // Cashier payment state
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountReceived, setAmountReceived] = useState("");

  useEffect(() => {
    if (!branchId) return;
    getMealPeriodsByBranch(branchId);
    getTablesByBranch(branchId);
  }, [branchId, getMealPeriodsByBranch, getTablesByBranch]);

  const filteredCategories = useMemo(() => {
    if (!selectedMealType) return [];
    return category.filter(c => (c.mealPeriodId?._id || c.mealPeriodId) === selectedMealType._id);
  }, [category, selectedMealType]);

  // Auto-select first meal type
  useEffect(() => {
    if (mealTypes.length > 0 && !selectedMealType) {
      setSelectedMealType(mealTypes[0]);
    }
  }, [mealTypes, selectedMealType]);

  useEffect(() => {
    if (!branchId || !selectedMealType) return;
    getCategoriesByBranch(branchId, { mealPeriodId: selectedMealType._id });
    setSelectedCategory(null);
  }, [branchId, selectedMealType, getCategoriesByBranch]);

  // Auto-select first category
  useEffect(() => {
    if (filteredCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(filteredCategories[0]);
    }
  }, [filteredCategories, selectedCategory]);

  useEffect(() => {
    if (!branchId || !selectedCategory) return;
    const timer = setTimeout(
      () => getFoodItemsByBranch(branchId, { categoryId: selectedCategory._id, availableOnly: true }),
      250
    );
    return () => clearTimeout(timer);
  }, [branchId, selectedCategory, getFoodItemsByBranch]);

  const visible = useMemo(
    () => (Array.isArray(menu) ? menu.filter(i => i.isAvailable !== false && i.isActive !== false) : []),
    [menu]
  );

  const filteredVisible = useMemo(() => {
    if (!query) return visible;
    const q = query.toLowerCase();
    return visible.filter(i => {
      const name = getDisplayName(i, lang).toLowerCase();
      return name.includes(q);
    });
  }, [visible, query, lang]);

  // Waiter places order (source: WAITER) - goes to cashier queue for payment
  const handlePlace = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    if (!branchId) return toast.error("No branch assigned to your account");
    if (!tableId) return toast.error("Please select a table");
    setPlacing(true);
    const items = cart.map(c => ({ foodItemId: c.foodItemId, quantity: c.quantity }));
    const source = isCashier ? "CASHIER" : "WAITER";
    const res = await placeOrder({ branchId, tableId, items, source });
    setPlacing(false);
    if (res.success) {
      toast.success(`Placed • Code: ${res.order.securityCode}`);
      clearCart();
      setTableId("");
    }
  };

  // Cashier confirms payment + places order in one step
  const handleConfirmPayment = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    if (!branchId) return toast.error("No branch assigned to your account");
    if (!tableId) return toast.error("Please select a table");
    if (!paymentMethod) return toast.error("Select a payment method");
    if (paymentMethod === "CASH" && (!amountReceived || Number(amountReceived) < getCartTotal())) {
      return toast.error("Enter valid amount received");
    }
    setPlacing(true);
    try {
      // 1. Create order first
      const items = cart.map(c => ({ foodItemId: c.foodItemId, quantity: c.quantity }));
      const orderRes = await placeOrder({ branchId, tableId, items, source: "CASHIER" });
      if (!orderRes.success) {
        setPlacing(false);
        return;
      }
      const order = orderRes.order;
      // 2. Confirm payment
      const paymentRes = await confirmCashierPayment(order._id, { paymentMethod });
      if (paymentRes.success) {
        toast.success(`Order confirmed & sent to kitchen • Code: ${order.securityCode}`);
        clearCart();
        setTableId("");
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

  if (!branchId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You are not assigned to a branch yet. Ask your manager.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 grid lg:grid-cols-[1fr_340px] gap-5">
      <div className="w-full space-y-4">
        <div className="flex items-center gap-2">
          <Search className="text-muted-foreground" />
          <Input placeholder="Search items..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {/* Level 1: Meal Types */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Layers className="size-4" /> {t('manager.mealTypes')}
          </h3>
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-3 overflow-x-auto scrollbar-hide">
            {mealTypes.map(m => (
              <button
                key={m._id}
                onClick={() => setSelectedMealType(selectedMealType?._id === m._id ? null : m)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap flex-none ${
                  selectedMealType?._id === m._id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                {getDisplayName(m, lang) || m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Level 2: Categories */}
        {selectedMealType && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Layers className="size-4" /> {t('manager.categories')}
            </h3>
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-3 overflow-x-auto scrollbar-hide">
              {filteredCategories.map(c => (
                <button
                  key={c._id}
                  onClick={() => setSelectedCategory(selectedCategory?._id === c._id ? null : c)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap flex-none ${
                    selectedCategory?._id === c._id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {getDisplayName(c, lang) || c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Level 3: Food Items */}
        {selectedCategory && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Layers className="size-4" /> {t('manager.foodItems')}
            </h3>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="h-28"><CardContent className="p-4"><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>
                ))}
              </div>
            ) : filteredVisible.length === 0 ? (
              <p className="text-muted-foreground">No food items in this category yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredVisible.map(item => (
                  <Card key={item._id}>
                    <CardContent className="p-3">
                      <div className="h-16 mb-2 rounded bg-muted flex items-center justify-center overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} className="h-full w-full object-cover" alt={item.name} />
                        ) : (
                          <Utensils className="text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm font-semibold line-clamp-1">{getDisplayName(item, lang) || item.name}</p>
                      <p className="text-sm font-bold text-primary">
                        {Number(item.price || 0).toLocaleString()} ETB
                      </p>
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => addToCart({ ...item, unitPrice: item.price, foodName: item.name })}
                      >
                        <Plus className="size-3" /> Add
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {!selectedMealType && (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="size-8 mx-auto mb-2 opacity-50" />
            <p>{t('manager.selectMealType')}</p>
          </div>
        )}
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
        isCashier={isCashier}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        amountReceived={amountReceived}
        setAmountReceived={setAmountReceived}
        handleConfirmPayment={handleConfirmPayment}
      />
    </div>
  );
};

export default CreateOrder;
