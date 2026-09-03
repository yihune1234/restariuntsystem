import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useCustomerStore } from "@/store/useCustomerStore";
import { DEFAULT_RESTAURANT } from "@/config/restaurant";
import { useTranslation, useI18nStore, languages } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ShoppingCart, Search, Star, Utensils, QrCode, MapPin, Phone, Clock,
  ChefHat, Plus, Menu as MenuIcon, X, Home, LogIn, Send, AlertCircle,
} from "lucide-react";

/**
 * Resolve the display name for a multilingual entity based on active language.
 * Uses API-provided nameEn/nameOm/nameAm fields directly.
 */
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

const StaffFooter = () => {
  const navigate = useNavigate();
  return (
    <footer className="border-t bg-muted/30 mt-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {DEFAULT_RESTAURANT.nameEn}
        </p>
        <button
          onClick={() => navigate("/login")}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <span className="size-1.5 rounded-full bg-current opacity-50" /> Staff Portal
        </button>
      </div>
    </footer>
  );
};

const FoodCard = ({ item, currency, onAdd, onView, translatedName, translatedDesc, t }) => {
  const inStock = !item.isSoldOut && item.stockStatus !== "SOLD_OUT";
  const isLowStock = item.stockStatus === "LOW_STOCK" && !item.isSoldOut;
  const isPopular = item.isPopular || item.tags?.includes("popular");
  const isFeatured = item.isFeatured || item.tags?.includes("featured");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group border border-gray-100 dark:border-gray-700 shadow-sm">
      <div
        onClick={onView}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onView?.(); } }}
        className="text-left flex-1 flex flex-col cursor-pointer"
      >
        <div className="aspect-square bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-700 dark:to-gray-800 overflow-hidden relative">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={translatedName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 dark:from-gray-700 dark:to-gray-800">
              <Utensils className="size-12 text-amber-300 dark:text-amber-600" />
            </div>
          )}
          {(isFeatured || isPopular) && (
            <div className="absolute top-2 left-2 flex gap-1">
              {isFeatured && (
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                  {t('customer.featured', 'Featured')}
                </span>
              )}
              {isPopular && !isFeatured && (
                <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
                  <Star className="size-2.5" /> {t('customer.popular', 'Popular')}
                </span>
              )}
            </div>
          )}
          {isLowStock && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-lg">
                {t('customer.lowStock')}
              </Badge>
            </div>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                {t('customer.soldOut', 'Unavailable')}
              </div>
            </div>
          )}
        </div>
        <div className="p-3.5 flex-1 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-tight">
              {translatedName}
            </h3>
          </div>
          {translatedDesc && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{translatedDesc}</p>
          )}
          <div className="mt-auto pt-2 flex items-end justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                {Number(item.price || 0).toLocaleString()} {currency}
              </span>
              {item.preparationTimeMinutes && (
                <span className="text-[10px] text-gray-400">{item.preparationTimeMinutes} min</span>
              )}
            </div>
            {inStock && (
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
    </div>
  );
};

/**
 * Professional restaurant digital menu.
 * Uses API-provided multilingual fields (nameEn/nameOm/nameAm) directly.
 *
 * Hierarchy: Restaurant Header → Meal Type Tabs → Category Tabs → Food Grid
 */
export const RestaurantMenu = ({ branchId }) => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const setLang = useI18nStore((s) => s.setLang);
  const {
    branch: b, menuTree, flatItems,
    cart, addToCart, fetchMenu, canOrder, isLoading, error,
    session, lastPlacedOrder, resolveBranchFromToken,
  } = useCustomerStore();
  const [selectedMealId, setSelectedMealId] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [query, setQuery] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [addedItem, setAddedItem] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Always load the menu for the branch in the URL. (Previously this skipped
    // fetching once canOrder was true, which could leave the customer staring
    // at an empty menu if the store had been cleared after the QR session.)
    let cancelled = false;
    (async () => {
      if (!branchId) return;
      const isValidObjectId = /^[a-f\d]{24}$/i.test(branchId);

      if (isValidObjectId) {
        fetchMenu(branchId);
        return;
      }

      // Self-healing: the branch slot holds something else (commonly a table
      // QR token from an older printed code). Resolve the real branch via the
      // public QR endpoint, then load that branch's menu and normalize the URL.
      const token =
        searchParams.get("t") ||
        searchParams.get("token") ||
        (isValidObjectId ? null : branchId);
      const resolved = await resolveBranchFromToken(token);
      if (cancelled || !resolved?.branchId) return;
      await fetchMenu(resolved.branchId);
      navigate(`/customer/menu/${resolved.branchId}`, { replace: true });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const branch = b;
  const currency = branch?.currency || branch?.settings?.currency || "ETB";

  // Auto-select first meal type
  useEffect(() => {
    if (menuTree.length > 0 && !selectedMealId) {
      setSelectedMealId(menuTree[0].id || menuTree[0]._id);
    }
  }, [menuTree, selectedMealId]);

  const selectedMeal = useMemo(
    () => menuTree.find(m => (m.id || m._id) === selectedMealId),
    [menuTree, selectedMealId]
  );

  const visibleCategories = useMemo(() => {
    return selectedMeal?.categories || [];
  }, [selectedMeal]);

  // Auto-select first category
  useEffect(() => {
    if (visibleCategories.length > 0 && !selectedCatId) {
      setSelectedCatId(visibleCategories[0].id || visibleCategories[0]._id);
    }
  }, [visibleCategories, selectedCatId]);

  const visible = useMemo(
    () => flatItems.filter((i) => {
      // Search filter
      if (query) {
        const q = query.toLowerCase();
        const name = getDisplayName(i, lang).toLowerCase();
        const desc = getDescription(i, lang).toLowerCase();
        if (!name.includes(q) && !desc.includes(q)) return false;
      }
      // Category filter — only when not searching
      if (!query && selectedCatId) {
        const itemCatId = i.categoryId?._id || i.categoryId || i.category?._id || i.category;
        if (itemCatId !== selectedCatId) return false;
      }
      return true;
    }),
    [flatItems, query, lang, selectedCatId]
  );

  const featuredItems = useMemo(
    () => flatItems.filter(i => i.isFeatured || i.tags?.includes('featured') || i.isPopular || i.tags?.includes('popular')),
    [flatItems]
  );

  const count = cart.reduce((s, c) => s + c.quantity, 0);
  const total = cart.reduce((s, c) => s + (c.unitPrice || 0) * c.quantity, 0);

  const handleAdd = (item) => {
    if (!canOrder) { setShowQr(true); return; }
    addToCart(item);
    setAddedItem(item);
    setTimeout(() => setAddedItem(null), 1200);
  };

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
        <EmptyState
          title="Menu currently unavailable"
          description="We're having trouble loading the menu right now. Please try again in a moment."
          icon={ChefHat}
        />
        <StaffFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      {/* Restaurant Header */}
      <header className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 text-white shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-11 flex-shrink-0 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30 shadow-lg">
                {branch?.logoUrl ? (
                  <img src={branch.logoUrl} alt="Restaurant logo" className="size-7 object-contain" />
                ) : (
                  <span className="text-lg font-bold">
                    {(branch?.name || DEFAULT_RESTAURANT.nameEn).charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold leading-tight truncate">
                    {branch?.name || DEFAULT_RESTAURANT.nameEn}
                  </h1>
                  {canOrder && session?.table?.tableNumber && (
                    <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm whitespace-nowrap">
                      <div className="size-1.5 rounded-full bg-green-400 animate-pulse" />
                      Table {session.table.tableNumber}
                    </div>
                  )}
                </div>
                {branch?.tagline && (
                  <p className="text-[10px] text-white/80 truncate hidden sm:block mt-0.5">{branch.tagline}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => canOrder ? toCart() : setShowQr(true)}
                className="relative flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white px-3 py-2 rounded-xl transition-all"
                aria-label="View cart"
              >
                <ShoppingCart className="size-5" />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 size-5 bg-white text-amber-600 text-xs font-bold rounded-full flex items-center justify-center shadow">
                    {count}
                  </span>
                )}
              </button>
              <button
                onClick={() => setDrawerOpen(true)}
                className="size-10 flex items-center justify-center bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white rounded-xl transition-all"
                aria-label="Open menu"
              >
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
            <span>
              Browse freely —{" "}
              <button onClick={() => setShowQr(true)} className="underline font-semibold hover:text-amber-600 dark:hover:text-amber-200">
                scan the QR
              </button>{" "}
              to place an order
            </span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-32 w-full">
        {/* Search */}
        <div className="relative mb-5">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl blur opacity-20" />
          <div className="relative flex items-center">
            <Search className="absolute left-4 size-5 text-amber-600 dark:text-amber-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('customer.searchPlaceholder', 'Search menu...')}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-amber-200 dark:border-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 shadow-sm placeholder:text-gray-400"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Meal Type Tabs - pill-style horizontal scroll */}
        <div className="mb-5 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {menuTree.map((m) => {
              const mealId = m.id || m._id;
              const displayName = getDisplayName(m, lang);
              const isSelected = selectedMealId === mealId;
              return (
                <button
                  key={mealId}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    isSelected
                      ? "bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-lg shadow-amber-500/30"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600"
                  }`}
                  onClick={() => { setSelectedMealId(mealId); setSelectedCatId(""); }}
                >
                  {displayName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Sub-tabs - pill-style horizontal scroll */}
        {selectedMealId && visibleCategories.length > 0 && (
          <div className="mb-5 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {visibleCategories.map((c) => {
                const catId = c.id || c._id;
                const displayName = getDisplayName(c, lang);
                const isSelected = selectedCatId === catId;
                return (
                  <button
                    key={catId}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      isSelected
                        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                    onClick={() => setSelectedCatId(catId)}
                  >
                    {displayName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Header */}
        {selectedCatId && (
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {getDisplayName(visibleCategories.find(c => (c.id || c._id) === selectedCatId), lang)}
            </h2>
          </div>
        )}

        {/* Featured Items (only when no search and no specific category) */}
        {!query && !selectedCatId && featuredItems.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Star className="size-5 text-amber-500" /> {t('customer.featured', 'Featured')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {featuredItems.slice(0, 5).map((item) => {
                const itemId = item._id || item.id;
                return (
                  <FoodCard
                    key={`feat-${itemId}`}
                    item={item}
                    currency={currency}
                    onAdd={handleAdd}
                    onView={() => navigate(`/customer/item/${branchId}/${itemId}`)}
                    translatedName={getDisplayName(item, lang)}
                    translatedDesc={getDescription(item, lang)}
                    t={t}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Food Grid - responsive columns */}
        {visible.length === 0 ? (
          <div className="py-8">
            <EmptyState
              title={flatItems.length === 0 ? t('customer.menuError') : t('customer.noItems')}
              description={flatItems.length === 0 ? t('customer.menuLoading') : t('customer.noItems')}
              icon={Utensils}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {visible.map((item) => {
              const itemId = item._id || item.id;
              return (
                <FoodCard
                  key={itemId}
                  item={item}
                  currency={currency}
                  onAdd={handleAdd}
                  onView={() => navigate(`/customer/item/${branchId}/${itemId}`)}
                  translatedName={getDisplayName(item, lang)}
                  translatedDesc={getDescription(item, lang)}
                  t={t}
                />
              );
            })}
          </div>
        )}

        {/* Restaurant Info */}
        {(branch?.address || branch?.phone || (branch?.openTime && branch?.closeTime)) && (
          <section className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              {branch?.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-4" />
                  <span>{[branch.address.street, branch.address.subcity, branch.address.city].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {branch?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4" />
                  <span>{branch.phone}</span>
                </div>
              )}
              {branch?.openTime && branch?.closeTime && (
                <div className="flex items-center gap-2">
                  <Clock className="size-4" />
                  <span>{branch.openTime} – {branch.closeTime}</span>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Floating cart CTA */}
      {canOrder && count > 0 && (
        <div className="fixed bottom-6 inset-x-4 max-w-7xl mx-auto z-30">
          <button
            onClick={toCart}
            className="w-full h-14 flex items-center justify-between px-6 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white rounded-2xl shadow-2xl shadow-amber-500/40 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingCart className="size-5" />
              </div>
              <span className="font-semibold text-sm">{t('customer.viewCart', 'View Cart')}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">{count}</span>
              <span className="font-bold text-lg">{total.toLocaleString()} {currency}</span>
            </div>
          </button>
        </div>
      )}

      {/* Quick "added" toast */}
      {addedItem && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-gray-900 dark:bg-gray-800 text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg flex items-center gap-2 border border-gray-200 dark:border-gray-700">
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <Plus className="size-2.5 text-white" />
          </div>
          {getDisplayName(addedItem, lang)} {t('customer.addToCart')}
        </div>
      )}

      {/* QR Dialog */}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <QrCode className="size-4" /> Scan QR Code
            </DialogTitle>
            <DialogDescription className="text-sm">
              Scan the restaurant's QR code at your table to place orders.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowQr(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Right-side hamburger drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-[88%] max-w-sm bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 shadow-2xl flex flex-col">
            <div className="bg-gradient-to-r from-amber-600 to-orange-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 flex-shrink-0 rounded-xl bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                  {branch?.logoUrl ? (
                    <img src={branch.logoUrl} alt="Logo" className="size-6 object-contain" />
                  ) : (
                    <span className="font-bold">{(branch?.name || "T").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate">{branch?.name || DEFAULT_RESTAURANT.nameEn}</p>
                  <p className="text-[10px] text-white/80 truncate">
                    {session?.table?.tableNumber ? `Table ${session.table.tableNumber}` : "Welcome"}
                  </p>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="size-9 flex items-center justify-center bg-white/15 hover:bg-white/25 rounded-lg" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <p className="px-3 pt-3 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">About</p>
              {(branch?.address || branch?.phone) && (
                <div className="px-3 py-2 text-xs text-muted-foreground space-y-1">
                  {branch?.address && (
                    <p className="flex items-start gap-2">
                      <MapPin className="size-3.5 mt-0.5 flex-shrink-0" />
                      <span>{[branch.address.street, branch.address.subcity, branch.address.city].filter(Boolean).join(", ")}</span>
                    </p>
                  )}
                  {branch?.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="size-3.5" />
                      <a href={`tel:${branch.phone}`} className="hover:underline">{branch.phone}</a>
                    </p>
                  )}
                </div>
              )}

              <p className="px-3 pt-4 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Your orders & feedback</p>
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  if (lastPlacedOrder?._id) {
                    navigate(`/customer/track/${lastPlacedOrder.branchId || branchId || "_"}/${lastPlacedOrder._id}`);
                  } else {
                    navigate(`/customer`);
                  }
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-sm"
              >
                <Star className="size-4 text-amber-500" />
                <span className="font-medium">Track your order</span>
                {lastPlacedOrder?._id && (
                  <span className="ml-auto text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">Active</span>
                )}
              </button>

              <p className="px-3 pt-4 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Feedback</p>
              <button onClick={() => { setDrawerOpen(false); navigate(`/customer/feedback${branchId ? `/${branchId}` : ""}?tab=rating`); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-sm">
                <Star className="size-4 text-amber-500" /> Rate us
              </button>
              <button onClick={() => { setDrawerOpen(false); navigate(`/customer/feedback${branchId ? `/${branchId}` : ""}?tab=idea`); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-sm">
                <Send className="size-4 text-emerald-500" /> Share an idea
              </button>
              <button onClick={() => { setDrawerOpen(false); navigate(`/customer/feedback${branchId ? `/${branchId}` : ""}?tab=complaint`); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-sm">
                <AlertCircle className="size-4 text-rose-500" /> Report an issue
              </button>

              <p className="px-3 pt-4 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Language</p>
              <div className="px-3 grid grid-cols-3 gap-1.5">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`py-2 rounded-lg text-xs font-medium border transition ${
                      lang === l.code
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-300"
                    }`}
                  >
                    {l.short}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t bg-white/60 dark:bg-gray-800/60 p-3 space-y-1">
              <button onClick={() => { setDrawerOpen(false); navigate("/customer"); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-sm">
                <Home className="size-4 text-muted-foreground" /> Home
              </button>
              <button onClick={() => { setDrawerOpen(false); navigate("/login"); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-sm">
                <LogIn className="size-4 text-muted-foreground" /> Staff Portal
              </button>
              <p className="text-center text-[10px] text-muted-foreground pt-2">
                &copy; {new Date().getFullYear()} {branch?.name || DEFAULT_RESTAURANT.nameEn}
              </p>
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
