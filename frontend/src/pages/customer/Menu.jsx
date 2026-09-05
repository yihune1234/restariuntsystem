import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useCustomerStore } from "@/store/useCustomerStore";
import { DEFAULT_RESTAURANT } from "@/config/restaurant";
import { useTranslation, useI18nStore, languages } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingCart, Search, Star, Utensils, QrCode, MapPin, Phone, Clock,
  ChefHat, Plus, Menu as MenuIcon, X, Home, LogIn, Send, AlertCircle,
  Flame, Leaf, Award, ChevronRight,
} from "lucide-react";

const TAG_CONFIG = {
  vegan: { label: "Vegan", icon: Leaf, color: "bg-green-100 text-green-700 border-green-200" },
  "gluten-free": { label: "Gluten-Free", icon: Leaf, color: "bg-amber-100 text-amber-700 border-amber-200" },
  "chef-special": { label: "Chef Special", icon: Award, color: "bg-rose-100 text-rose-700 border-rose-200" },
  "hot": { label: "Hot", icon: Flame, color: "bg-red-100 text-red-700 border-red-200" },
  "cold": { label: "Cold", icon: Leaf, color: "bg-blue-100 text-blue-700 border-blue-200" },
  "spicy": { label: "Spicy", icon: Flame, color: "bg-orange-100 text-orange-700 border-orange-200" },
  "popular": { label: "Popular", icon: Star, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
};

const getDisplayName = (entity, lang) => {
  if (!entity) return "";
  if (lang === "om" && entity.nameOm) return entity.nameOm;
  if (lang === "am" && entity.nameAm) return entity.nameAm;
  if (lang === "en" && entity.nameEn) return entity.nameEn;
  return entity.name || entity.nameEn || "";
};

const getDescription = (entity, lang) => {
  if (!entity) return "";
  if (lang === "om" && entity.descriptionOm) return entity.descriptionOm;
  if (lang === "am" && entity.descriptionAm) return entity.descriptionAm;
  if (lang === "en" && entity.descriptionEn) return entity.descriptionEn;
  return entity.description || entity.descriptionEn || "";
};

const TagBadge = ({ tag }) => {
  const config = TAG_CONFIG[tag.toLowerCase()];
  if (!config) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-600">
      {tag}
    </span>
  );
  const Icon = config.icon;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${config.color}`}>
      <Icon className="size-2.5" /> {config.label}
    </span>
  );
};

const FoodCard = ({ item, currency, onAdd, onView, translatedName, translatedDesc, lang, onTap, muted, servingTag }) => {
  const inStock = !item.isSoldOut && item.stockStatus !== "SOLD_OUT" && item.isAvailable !== false;
  const isLowStock = item.stockStatus === "LOW_STOCK" && !item.isSoldOut;
  const tags = (item.tags || []).slice(0, 3);

  return (
    <div
      onClick={onTap}
      className={`bg-white dark:bg-gray-800 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group border border-gray-100 dark:border-gray-700 shadow-sm active:scale-[0.98] cursor-pointer ${muted ? "opacity-90" : ""}`}
    >
      <div className="aspect-square bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-700 dark:to-gray-800 overflow-hidden relative flex-shrink-0">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={translatedName}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${muted ? "grayscale-[40%] opacity-60" : ""}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 dark:from-gray-700 dark:to-gray-800">
            <Utensils className="size-12 text-amber-300 dark:text-amber-600" />
          </div>
        )}
        {muted && servingTag && (
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-gray-900/90 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg">
              {servingTag}
            </span>
          </div>
        )}
        {tags.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {tags.map(tag => <TagBadge key={tag} tag={tag} />)}
          </div>
        )}
        {isLowStock && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">Low Stock</Badge>
          </div>
        )}
        {!inStock && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
              Sold Out
            </div>
          </div>
        )}
      </div>

      <div className="p-3.5 flex-1 flex flex-col gap-1.5">
        <h3 className={`text-base font-bold line-clamp-2 leading-snug transition-colors ${muted ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400"}`}>
          {translatedName}
        </h3>
        {translatedDesc && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{translatedDesc}</p>
        )}
        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {Number(item.price || 0).toLocaleString()} <span className="text-xs font-medium">{currency}</span>
            </span>
            {item.preparationTimeMinutes && (
              <span className="text-[11px] text-gray-400">{item.preparationTimeMinutes} min</span>
            )}
          </div>
          {inStock && !muted && (
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); if (inStock) onAdd(item); }}
              className="h-9 w-9 p-0 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white shadow-md hover:shadow-lg transition-all flex-shrink-0"
            >
              <Plus className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const ItemBottomSheet = ({ item, open, onClose, onAdd, currency, lang, canOrder }) => {
  const [qty, setQty] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open) {
      setQty(1);
      setSelectedVariants({});
      setSpecialInstructions("");
    }
  }, [open, item?._id]);

  if (!item) return null;

  const translatedName = getDisplayName(item, lang);
  const translatedDesc = getDescription(item, lang);
  const tags = item.tags || [];

  const calculateTotal = () => {
    let total = Number(item.price || 0) * qty;
    Object.values(selectedVariants).forEach(opt => {
      total += (opt.priceModifier || 0) * qty;
    });
    return total;
  };

  const handleVariantSelect = (groupId, option) => {
    setSelectedVariants(prev => ({ ...prev, [groupId]: option }));
  };

  const handleAdd = async () => {
    setAdding(true);
    const cartItem = {
      ...item,
      quantity: qty,
      unitPrice: item.price,
      selectedVariants,
      specialInstructions,
      variantTotal: Object.values(selectedVariants).reduce((s, o) => s + (o.priceModifier || 0), 0),
    };
    await onAdd(cartItem);
    setAdding(false);
    onClose();
  };

  const total = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bottom-sheet max-w-lg mx-auto p-0 gap-0 overflow-hidden rounded-t-2xl rounded-b-xl max-h-[90vh] flex flex-col">
        <div className="relative flex-shrink-0">
          <div className="aspect-video bg-gradient-to-br from-amber-100 to-orange-100 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={translatedName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Utensils className="size-16 text-amber-300" />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 size-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-sm"
          >
            <X className="size-4" />
          </button>
          {tags.length > 0 && (
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
              {tags.map(tag => <TagBadge key={tag} tag={tag} />)}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{translatedName}</h2>
              {item.categoryId?.name && (
                <p className="text-sm text-muted-foreground">{getDisplayName(item.categoryId, lang)}</p>
              )}
            </div>

            {translatedDesc && (
              <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">{translatedDesc}</p>
            )}

            {item.preparationTimeMinutes && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4" />
                <span>~{item.preparationTimeMinutes} min preparation</span>
              </div>
            )}

            {item.variantGroups?.length > 0 && (
              <div className="space-y-4 pt-2">
                {item.variantGroups.map(group => {
                  const selected = selectedVariants[group._id];
                  return (
                    <div key={group._id}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {getDisplayName(group, lang)}
                          {group.required && <span className="text-red-500 ml-1">*</span>}
                        </h4>
                        {group.multiSelect && (
                          <span className="text-xs text-muted-foreground">Select up to {group.maxSelect}</span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {group.options.map(opt => {
                          const isSelected = selected?._id === opt._id;
                          return (
                            <button
                              key={opt._id}
                              onClick={() => handleVariantSelect(group._id, opt)}
                              disabled={!opt.isAvailable}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm transition-all disabled:opacity-40 ${
                                isSelected
                                  ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                                  : "border-gray-200 dark:border-gray-700 hover:border-amber-300"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`size-4 rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? "border-amber-500 bg-amber-500" : "border-gray-300"
                                }`}>
                                  {isSelected && <div className="size-2 rounded-full bg-white" />}
                                </div>
                                <span>{getDisplayName(opt, lang)}</span>
                                {!opt.isAvailable && <span className="text-xs text-red-500 ml-1">(Unavailable)</span>}
                              </div>
                              {opt.priceModifier !== 0 && (
                                <span className="text-xs font-semibold text-amber-600">
                                  {opt.priceModifier > 0 ? '+' : ''}{opt.priceModifier.toLocaleString()} ETB
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {canOrder && (
              <div>
                <label className="text-sm font-semibold text-gray-900 dark:text-white block mb-1.5">Special Instructions</label>
                <textarea
                  value={specialInstructions}
                  onChange={e => setSpecialInstructions(e.target.value)}
                  placeholder="Any allergies or special requests..."
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={2}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 p-4 bg-background space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="size-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-lg font-bold hover:bg-muted transition"
              >
                −
              </button>
              <span className="w-8 text-center font-bold text-lg">{qty}</span>
              <button
                onClick={() => setQty(q => q + 1)}
                className="size-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-lg font-bold hover:bg-muted transition"
              >
                +
              </button>
            </div>
          </div>

          <Button
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 disabled:opacity-50"
            onClick={handleAdd}
            disabled={adding || !canOrder}
          >
            {adding ? "Adding..." : canOrder ? `Add to Cart — ${total.toLocaleString()} ETB` : "Scan QR to Order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StaffFooter = () => {
  const navigate = useNavigate();
  return (
    <footer className="border-t bg-muted/30 mt-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {DEFAULT_RESTAURANT.nameEn}
        </p>
        <button
          onClick={() => navigate("/login")}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <span className="size-1.5 rounded-full bg-current opacity-50" /> Staff Portal
        </button>
      </div>
    </footer>
  );
};

export const RestaurantMenu = ({ branchId }) => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const setLang = useI18nStore((s) => s.setLang);
  const {
    branch: b, menuTree, flatItems, activeMealPeriodIds,
    cart, addToCart, fetchMenu, canOrder, isLoading, error,
    session, lastPlacedOrder, resolveBranchFromToken,
  } = useCustomerStore();

  const [selectedMealId, setSelectedMealId] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [query, setQuery] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [addedItem, setAddedItem] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [searchParams] = useSearchParams();
  const categoryNavRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!branchId) return;
      const isValidObjectId = /^[a-f\d]{24}$/i.test(branchId);
      if (isValidObjectId) { fetchMenu(branchId); return; }
      const token = searchParams.get("t") || searchParams.get("token") || (isValidObjectId ? null : branchId);
      const resolved = await resolveBranchFromToken(token);
      if (cancelled || !resolved?.branchId) return;
      await fetchMenu(resolved.branchId);
      navigate(`/customer/menu/${resolved.branchId}`, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [branchId]);

  const branch = b;
  const currency = branch?.currency || branch?.settings?.currency || "ETB";

  useEffect(() => {
    if (menuTree.length > 0 && !selectedMealId) {
      const specificActive = activeMealPeriodIds.find(id => {
        const m = menuTree.find(mm => String(mm.id || mm._id) === id);
        return m && m.name !== 'ALL_DAY';
      });
      const fallbackActive = activeMealPeriodIds[0];
      setSelectedMealId(specificActive || fallbackActive || menuTree[0].id || menuTree[0]._id);
    }
  }, [menuTree, selectedMealId, activeMealPeriodIds]);

  const selectedMeal = useMemo(() => menuTree.find(m => (m.id || m._id) === selectedMealId), [menuTree, selectedMealId]);

  const allDayMeal = useMemo(() => menuTree.find(m => m.name === 'ALL_DAY'), [menuTree]);
  const isAllDayView = allDayMeal
    ? String(selectedMealId) === String(allDayMeal.id || allDayMeal._id)
    : selectedMealId === 'all';

  const activeMeal = useMemo(() => {
    if (!menuTree.length) return null;
    const specific = menuTree.find(m =>
      activeMealPeriodIds.includes(String(m.id || m._id)) && m.name !== 'ALL_DAY'
    );
    return specific || menuTree.find(m => activeMealPeriodIds.includes(String(m.id || m._id)));
  }, [menuTree, activeMealPeriodIds]);

  const activeMealName = activeMeal ? getDisplayName(activeMeal, lang) : "All-Day";

  const selectedMealActive = selectedMeal ? selectedMeal.isCurrentlyActive !== false : true;

  const toggleDaypartOverride = useCallback(() => {
    if (isAllDayView) {
      const target = activeMeal || menuTree[0];
      setSelectedMealId(String(target?.id || target?._id || ''));
    } else {
      const target = allDayMeal || { id: 'all', _id: 'all' };
      setSelectedMealId(String(target.id || target._id));
    }
    setSelectedCatId("");
  }, [isAllDayView, activeMeal, allDayMeal, menuTree]);

  const visibleCategories = useMemo(() => {
    if (!selectedMeal) return [];
    const cats = selectedMeal.categories || [];
    if (isAllDayView || selectedMealId === "all") return cats;
    if (selectedMealId) {
      return cats.filter(c => {
        const mpIds = c.mealPeriodIds || [];
        return mpIds.length === 0 || mpIds.includes(selectedMealId);
      });
    }
    return cats;
  }, [selectedMeal, selectedMealId, isAllDayView]);

  useEffect(() => {
    if (visibleCategories.length > 0 && !selectedCatId) {
      setSelectedCatId(visibleCategories[0].id || visibleCategories[0]._id);
    } else if (visibleCategories.length === 0) {
      setSelectedCatId("");
    }
  }, [visibleCategories, selectedCatId]);

  const mealCategoryIds = useMemo(() => {
    const ids = new Set();
    (selectedMeal?.categories || []).forEach(c => ids.add(String(c.id || c._id)));
    return ids;
  }, [selectedMeal]);

  const visible = useMemo(() => {
    return flatItems.filter(i => {
      const itemCatId = i.categoryId?._id || i.categoryId || i.category?._id || i.category;
      if (itemCatId && mealCategoryIds.size > 0 && !mealCategoryIds.has(String(itemCatId))) return false;
      if (query) {
        const q = query.toLowerCase();
        const name = getDisplayName(i, lang).toLowerCase();
        const desc = getDescription(i, lang).toLowerCase();
        if (!name.includes(q) && !desc.includes(q)) return false;
      } else if (selectedCatId && String(itemCatId) !== String(selectedCatId)) {
        return false;
      }
      return true;
    });
  }, [flatItems, query, lang, selectedCatId, mealCategoryIds]);

  const featuredItems = useMemo(() => flatItems.filter(i => {
    const catId = String(i.categoryId?._id || i.categoryId || i.category?._id || i.category);
    if (mealCategoryIds.size > 0 && !mealCategoryIds.has(catId)) return false;
    return i.isFeatured || (i.tags || []).includes('featured') || (i.tags || []).includes('popular');
  }), [flatItems, mealCategoryIds]);

  const count = cart.reduce((s, c) => s + c.quantity, 0);
  const total = cart.reduce((s, c) => s + ((c.unitPrice || 0) + (c.variantTotal || 0)) * c.quantity, 0);

  const handleAdd = useCallback((item) => {
    if (!canOrder) { setShowQr(true); return; }
    addToCart(item);
    setAddedItem(item);
    setTimeout(() => setAddedItem(null), 1500);
  }, [canOrder, addToCart]);

  const handleItemTap = useCallback((item) => {
    setSheetItem(item);
    setSheetOpen(true);
  }, []);

  const scrollToCategory = useCallback((catId) => {
    setSelectedCatId(catId);
    setSelectedMealId(prev => {
      const meal = menuTree.find(m => (m.categories || []).some(c => (c.id || c._id) === catId));
      return meal ? (meal.id || meal._id) : prev;
    });
  }, [menuTree]);

  const toCart = () => navigate(`/customer/cart/${branchId}`);

  if (isLoading && flatItems.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-5xl mx-auto space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && flatItems.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <EmptyState title="Menu currently unavailable" description="We're having trouble loading the menu right now. Please try again in a moment." icon={ChefHat} />
        <StaffFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      {/* Restaurant Header */}
      <header className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-11 flex-shrink-0 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30 shadow-lg">
                {branch?.logoUrl ? (
                  <img src={branch.logoUrl} alt="Logo" className="size-7 object-contain" />
                ) : (
                  <span className="text-lg font-bold">{(branch?.name || DEFAULT_RESTAURANT.nameEn).charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold leading-tight truncate">{branch?.name || DEFAULT_RESTAURANT.nameEn}</h1>
                  {canOrder && session?.table?.tableNumber && (
                    <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm whitespace-nowrap">
                      <div className="size-1.5 rounded-full bg-green-400 animate-pulse" />
                      Table {session.table.tableNumber}
                    </div>
                  )}
                </div>
                {branch?.tagline && <p className="text-[10px] text-white/80 truncate hidden sm:block mt-0.5">{branch.tagline}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => canOrder ? toCart() : setShowQr(true)} className="relative flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white px-3 py-2 rounded-xl transition-all" aria-label="View cart">
                <ShoppingCart className="size-5" />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 size-5 bg-white text-amber-600 text-xs font-bold rounded-full flex items-center justify-center shadow">{count}</span>
                )}
              </button>
              <button onClick={() => setDrawerOpen(true)} className="size-10 flex items-center justify-center bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white rounded-xl transition-all" aria-label="Menu">
                <MenuIcon className="size-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* View-only notice */}
      {!canOrder && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-b border-amber-200 dark:border-amber-800">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
            <QrCode className="size-4 flex-shrink-0" />
            <span>Browse freely — <button onClick={() => setShowQr(true)} className="underline font-semibold hover:text-amber-600 dark:hover:text-amber-200">scan the QR</button> to place an order</span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-32 w-full">
        {/* Search */}
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl blur opacity-20" />
          <div className="relative flex items-center">
            <Search className="absolute left-4 size-5 text-amber-600 dark:text-amber-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search menu..."
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-amber-200 dark:border-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base bg-white dark:bg-gray-800 shadow-sm placeholder:text-gray-400"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">×</button>
            )}
          </div>
        </div>

        {/* Sticky Meal Type Tabs + Dayparting Indicator */}
        <div className="sticky top-[73px] z-20 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-3 -mx-4 px-4 mb-3">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 min-w-0">
              <span className="relative flex size-2.5 flex-shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
              </span>
              <span className="truncate">Currently Serving: {activeMealName}</span>
            </div>
            <button
              onClick={toggleDaypartOverride}
              className="flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-amber-300 dark:border-amber-700 bg-white/70 dark:bg-gray-800 text-amber-800 dark:text-amber-300 hover:bg-white dark:hover:bg-gray-700 transition-all"
            >
              {isAllDayView ? `Back to ${activeMealName}` : "View All-Day Menu"}
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {menuTree.map(m => {
              const mealId = m.id || m._id;
              const displayName = getDisplayName(m, lang);
              const isSelected = selectedMealId === mealId;
              const mealOn = isSelected && m.isCurrentlyActive !== false;
              return (
                <button
                  key={mealId}
                  onClick={() => { setSelectedMealId(mealId); setSelectedCatId(""); }}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                    isSelected
                      ? "bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-lg shadow-amber-500/30"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-amber-300"
                  }`}
                >
                  {displayName}
                  {mealOn && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-white/90 align-middle" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sticky Category Sub-tabs */}
        {visibleCategories.length > 0 && (
          <div ref={categoryNavRef} className="sticky top-[180px] z-20 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-2 -mx-4 px-4 mb-4 border-b border-amber-100 dark:border-amber-900">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {visibleCategories.map(c => {
                const catId = c.id || c._id;
                const displayName = getDisplayName(c, lang);
                const isSelected = selectedCatId === catId;
                return (
                  <button
                    key={catId}
                    onClick={() => setSelectedCatId(isSelected ? "" : catId)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                      isSelected
                        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {displayName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Off-hours banner */}
        {!isAllDayView && !selectedMealActive && selectedMeal && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300/60 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 p-4">
            <Clock className="size-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                {getDisplayName(selectedMeal, lang)} is not being served right now
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                Available {selectedMeal.startTime} – {selectedMeal.endTime}. Items are shown muted for browsing.
              </p>
            </div>
          </div>
        )}

        {/* Featured Items */}
        {!query && !selectedCatId && featuredItems.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Star className="size-5 text-amber-500" /> Featured
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {featuredItems.slice(0, 5).map(item => {
                const itemId = item._id || item.id;
                return (
                  <FoodCard
                    key={`feat-${itemId}`}
                    item={item}
                    currency={currency}
                    onAdd={handleAdd}
                    onTap={() => handleItemTap(item)}
                    translatedName={getDisplayName(item, lang)}
                    translatedDesc={getDescription(item, lang)}
                    lang={lang}
                    muted={!selectedMealActive && !isAllDayView}
                    servingTag={selectedMeal ? `Available ${selectedMeal.startTime}–${selectedMeal.endTime}` : undefined}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Food Grid */}
        {visible.length === 0 ? (
          <div className="py-8">
            <EmptyState title={flatItems.length === 0 ? t('customer.menuError') : t('customer.noItems')} description={flatItems.length === 0 ? t('customer.menuLoading') : t('customer.noItems')} icon={Utensils} />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {visible.map(item => {
              const itemId = item._id || item.id;
              return (
                <FoodCard
                  key={itemId}
                  item={item}
                  currency={currency}
                  onAdd={handleAdd}
                  onTap={() => handleItemTap(item)}
                  translatedName={getDisplayName(item, lang)}
                  translatedDesc={getDescription(item, lang)}
                  lang={lang}
                  muted={!selectedMealActive && !isAllDayView}
                  servingTag={selectedMeal ? `Available ${selectedMeal.startTime}–${selectedMeal.endTime}` : undefined}
                />
              );
            })}
          </div>
        )}

        {/* Restaurant Info */}
        {(branch?.address || branch?.phone || (branch?.openTime && branch?.closeTime)) && (
          <section className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              {branch?.address && <div className="flex items-center gap-2"><MapPin className="size-4" /><span>{[branch.address.street, branch.address.subcity, branch.address.city].filter(Boolean).join(", ")}</span></div>}
              {branch?.phone && <div className="flex items-center gap-2"><Phone className="size-4" /><span>{branch.phone}</span></div>}
              {branch?.openTime && branch?.closeTime && <div className="flex items-center gap-2"><Clock className="size-4" /><span>{branch.openTime} – {branch.closeTime}</span></div>}
            </div>
          </section>
        )}
      </main>

      {/* Floating cart CTA */}
      {canOrder && count > 0 && (
        <div className="fixed bottom-6 inset-x-4 max-w-7xl mx-auto z-30">
          <button onClick={toCart} className="w-full h-14 flex items-center justify-between px-6 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white rounded-2xl shadow-2xl shadow-amber-500/40 transition-all">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-white/20 rounded-xl flex items-center justify-center"><ShoppingCart className="size-5" /></div>
              <span className="font-semibold text-sm">View Cart</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">{count}</span>
              <span className="font-bold text-lg">{total.toLocaleString()} {currency}</span>
            </div>
          </button>
        </div>
      )}

      {/* Quick added toast */}
      {addedItem && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-gray-900 dark:bg-gray-800 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg flex items-center gap-2 border border-gray-200 dark:border-gray-700">
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"><Plus className="size-2.5 text-white" /></div>
          {getDisplayName(addedItem, lang)} added
        </div>
      )}

      {/* Item Bottom Sheet */}
      <ItemBottomSheet
        item={sheetItem}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={handleAdd}
        currency={currency}
        lang={lang}
        canOrder={canOrder}
      />

      {/* QR Dialog */}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg"><QrCode className="size-4" /> Scan QR Code</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Scan the restaurant's QR code at your table to place orders.</p>
          <div className="flex gap-2 justify-end"><Button variant="outline" size="sm" onClick={() => setShowQr(false)}>Got it</Button></div>
        </DialogContent>
      </Dialog>

      {/* Right Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-[88%] max-w-sm bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 shadow-2xl flex flex-col">
            <div className="bg-gradient-to-r from-amber-600 to-orange-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 flex-shrink-0 rounded-xl bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                  {branch?.logoUrl ? <img src={branch.logoUrl} alt="Logo" className="size-6 object-contain" /> : <span className="font-bold">{(branch?.name || "T").charAt(0).toUpperCase()}</span>}
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate">{branch?.name || DEFAULT_RESTAURANT.nameEn}</p>
                  <p className="text-[10px] text-white/80 truncate">{session?.table?.tableNumber ? `Table ${session.table.tableNumber}` : "Welcome"}</p>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="size-9 flex items-center justify-center bg-white/15 hover:bg-white/25 rounded-lg" aria-label="Close"><X className="size-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <p className="px-3 pt-3 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">About</p>
              {(branch?.address || branch?.phone) && (
                <div className="px-3 py-2 text-sm text-muted-foreground space-y-1">
                  {branch?.address && <p className="flex items-start gap-2"><MapPin className="size-3.5 mt-0.5 flex-shrink-0" /><span>{[branch.address.street, branch.address.subcity, branch.address.city].filter(Boolean).join(", ")}</span></p>}
                  {branch?.phone && <p className="flex items-center gap-2"><Phone className="size-3.5" /><a href={`tel:${branch.phone}`} className="hover:underline">{branch.phone}</a></p>}
                </div>
              )}
              <p className="px-3 pt-4 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Your orders & feedback</p>
              <button onClick={() => { setDrawerOpen(false); navigate(lastPlacedOrder?._id ? `/customer/track/${lastPlacedOrder.branchId || branchId || "_"}/${lastPlacedOrder._id}` : "/customer"); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-sm">
                <Star className="size-4 text-amber-500" /><span className="font-medium">Track your order</span>
                {lastPlacedOrder?._id && <span className="ml-auto text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">Active</span>}
              </button>
              <p className="px-3 pt-4 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Feedback</p>
              <button onClick={() => { setDrawerOpen(false); navigate(`/customer/feedback${branchId ? `/${branchId}` : ""}?tab=rating`); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-sm"><Star className="size-4 text-amber-500" /> Rate us</button>
              <button onClick={() => { setDrawerOpen(false); navigate(`/customer/feedback${branchId ? `/${branchId}` : ""}?tab=idea`); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-sm"><Send className="size-4 text-emerald-500" /> Share an idea</button>
              <button onClick={() => { setDrawerOpen(false); navigate(`/customer/feedback${branchId ? `/${branchId}` : ""}?tab=complaint`); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-sm"><AlertCircle className="size-4 text-rose-500" /> Report an issue</button>
              <p className="px-3 pt-4 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Language</p>
              <div className="px-3 grid grid-cols-3 gap-1.5">
                {languages.map(l => (
                  <button key={l.code} onClick={() => setLang(l.code)} className={`py-2 rounded-lg text-xs font-medium border transition ${lang === l.code ? "bg-amber-600 text-white border-amber-600" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-300"}`}>{l.short}</button>
                ))}
              </div>
            </div>
            <div className="border-t bg-white/60 dark:bg-gray-800/60 p-3 space-y-1">
              <button onClick={() => { setDrawerOpen(false); navigate("/customer"); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-sm"><Home className="size-4 text-muted-foreground" /> Home</button>
              <button onClick={() => { setDrawerOpen(false); navigate("/login"); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-sm"><LogIn className="size-4 text-muted-foreground" /> Staff Portal</button>
              <p className="text-center text-[10px] text-muted-foreground pt-2">© {new Date().getFullYear()} {branch?.name || DEFAULT_RESTAURANT.nameEn}</p>
            </div>
          </aside>
        </div>
      )}

      <StaffFooter />
    </div>
  );
};

const CustomerMenu = () => {
  const { branch } = useParams();
  return <RestaurantMenu branchId={branch} />;
};

export default CustomerMenu;
