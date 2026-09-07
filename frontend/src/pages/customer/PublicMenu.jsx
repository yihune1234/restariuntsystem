import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useMenuStore } from "@/store/useMenuStore";
import { useI18nStore, languages } from "@/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Utensils,
  Search,
  X,
  Globe,
  Check,
  Clock,
  Coffee,
  Sun,
  Moon,
  LayoutGrid,
  Lock,
} from "lucide-react";

const LanguageSwitcher = ({ lang, setLang }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = languages.find((l) => l.code === lang) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 transition"
        title={currentLang.label}
      >
        <Globe className="size-5 text-amber-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
          <div className="p-2">
            <p className="text-xs text-gray-500 px-3 py-2">Select Language</p>
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  lang === l.code
                    ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <span>{l.label}</span>
                {lang === l.code && <Check className="size-4 text-amber-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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

const parseHM = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

const nowMinutes = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

const isWindowActive = (start, end, d = new Date()) => {
  const now = nowMinutes(d);
  return now >= parseHM(start) && now < parseHM(end);
};

// A schedule belongs to the "Morning" tab when it starts before 11:00
// (classic breakfast service). It belongs to "Afternoon-Evening" when it
// starts at/after 11:00 or runs past 14:00 (lunch/dinner or all-day).
const isMorningSchedule = (s) => parseHM(s.startTime) < 660;
const isAfternoonSchedule = (s) =>
  parseHM(s.startTime) >= 660 || parseHM(s.endTime) > 840;

const itemInMorning = (item) =>
  item.isAlwaysAvailable && (item.mealSchedules || []).length === 0
    ? true
    : (item.mealSchedules || []).some((s) => isMorningSchedule(s));

const itemInAfternoon = (item) =>
  item.isAlwaysAvailable && (item.mealSchedules || []).length === 0
    ? true
    : (item.mealSchedules || []).some((s) => isAfternoonSchedule(s));

const itemInTab = (item, tab) => {
  if (tab === "morning") return itemInMorning(item);
  if (tab === "afternoon") return itemInAfternoon(item);
  return true;
};

const QUICK_JUMP = ["Hot Drinks", "Cold Drinks", "Snacks"];

const FoodCard = ({ item, currency, lang }) => {
  const translatedName = getDisplayName(item, lang);
  const translatedDesc = getDescription(item, lang);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex flex-col">
      <div className="aspect-square bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-700 dark:to-gray-800 overflow-hidden relative">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={translatedName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Utensils className="size-12 text-amber-300 dark:text-amber-600" />
          </div>
        )}
        {item.isAlwaysAvailable && (item.mealSchedules || []).length === 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-[#C85A32] text-white text-xs font-medium rounded-full flex items-center gap-1">
            <Clock className="size-3" />
            All Day
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="text-base font-bold text-[#2D2522] dark:text-white line-clamp-2">
          {translatedName}
        </h3>
        {translatedDesc && (
          <p className="text-sm text-[#6E655F] dark:text-gray-400 line-clamp-2">
            {translatedDesc}
          </p>
        )}
        <div className="mt-auto pt-2">
          <span className="text-lg font-bold text-[#D97706] dark:text-amber-400">
            {Number(item.price || 0).toLocaleString()}{" "}
            <span className="text-xs font-medium">{currency}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

const PublicMenu = () => {
  const { restaurant, categories, isLoading, error, fetchMenu } = useMenuStore();
  const { lang, setLang } = useI18nStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMealPeriods, setActiveMealPeriods] = useState([]);
  const [timeTab, setTimeTab] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const loadMenu = async () => {
      const data = await fetchMenu();
      if (data) {
        const mps = data.allMealPeriods || [];
        setActiveMealPeriods(data.activeMealPeriods || []);
        // Auto-highlight the matching tab based on the customer's local time.
        const activeMorning = mps.some(
          (mp) =>
            (mp.startTime && mp.endTime) &&
            isMorningSchedule(mp) &&
            isWindowActive(mp.startTime, mp.endTime)
        );
        const activeAfternoon = mps.some(
          (mp) =>
            (mp.startTime && mp.endTime) &&
            isAfternoonSchedule(mp) &&
            isWindowActive(mp.startTime, mp.endTime)
        );
        if (activeMorning) setTimeTab("morning");
        else if (activeAfternoon) setTimeTab("afternoon");
        else setTimeTab("all");
      }
    };
    loadMenu();
  }, [fetchMenu]);

  const currency = restaurant?.currency || "ETB";

  const goToSection = (catId) => {
    document
      .getElementById(`menu-section-${catId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const visibleCategories = useMemo(() => {
    const cats = categories
      .map((cat) => ({
        ...cat,
        foodItems: (cat.foodItems || []).filter((item) =>
          itemInTab(item, timeTab)
        ),
      }))
      .filter((cat) => cat.foodItems.length > 0)
      .sort(
        (a, b) =>
          (a.displayOrder || 0) - (b.displayOrder || 0) ||
          a.name.localeCompare(b.name)
      );
    return cats;
  }, [categories, timeTab]);

  // Reset the category filter gracefully if its category disappears from the
  // current time tab (avoids a stale empty selection).
  const visibleCatIds = useMemo(
    () => new Set(visibleCategories.map((cat) => cat.id)),
    [visibleCategories]
  );
  const activeCategory = visibleCatIds.has(selectedCategory)
    ? selectedCategory
    : "all";

  const shownCategories = useMemo(() => {
    if (activeCategory === "all") return visibleCategories;
    return visibleCategories.filter((cat) => cat.id === activeCategory);
  }, [visibleCategories, activeCategory]);

  const quickJumpCats = useMemo(() => {
    return categories.filter((cat) =>
      QUICK_JUMP.some((k) =>
        (cat.nameEn || cat.name || "").toUpperCase().includes(k.toUpperCase())
      )
    );
  }, [categories]);

  const searching = searchQuery.trim().length > 0;

  const searchResults = useMemo(() => {
    if (!searching) return [];
    const q = searchQuery.toLowerCase();
    const all = categories.flatMap((cat) =>
      (cat.foodItems || []).map((item) => ({
        ...item,
        categoryId: cat.id,
        categoryName: getDisplayName(cat, lang),
      }))
    );
    return all
      .filter((item) => {
        const name = getDisplayName(item, lang).toLowerCase();
        const desc = getDescription(item, lang).toLowerCase();
        return name.includes(q) || desc.includes(q);
      })
      .filter(
        (item) => activeCategory === "all" || item.categoryId === activeCategory
      );
  }, [categories, searchQuery, lang, searching, activeCategory]);

  const timeTabs = [
    { key: "morning", label: lang === "am" ? "ጧት" : lang === "om" ? "Ganama" : "Morning", icon: Sun },
    { key: "afternoon", label: lang === "am" ? "ቀን / ምሽት" : lang === "om" ? "Guyyaa / Galgala" : "Afternoon-Evening", icon: Moon },
    { key: "all", label: lang === "am" ? "ሁሉንም" : lang === "om" ? "Hunda" : "View All", icon: LayoutGrid },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] dark:bg-gray-900">
        <header className="bg-[#211C18] text-amber-400 sticky top-0 z-30 shadow-lg">
          <div className="px-3 sm:px-4 py-2 sm:py-2.5">
            <Skeleton className="h-8 w-48 bg-amber-500/20" />
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-28 bg-white/20 flex-shrink-0" />
              ))}
            </div>
          </div>
        </header>
        <main className="p-4">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>
                <Skeleton className="aspect-square rounded-2xl bg-white/50" />
                <Skeleton className="h-4 w-full mt-2 bg-white/50" />
                <Skeleton className="h-4 w-2/3 mt-1 bg-white/50" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F4EE] dark:bg-gray-900 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Utensils className="size-16 text-amber-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Menu currently unavailable
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchMenu}
            className="px-6 py-2 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4EE] dark:bg-gray-900 flex flex-col">
      <header className="bg-[#211C18] text-amber-400 sticky top-0 z-30 shadow-lg">
        <div className="px-3 sm:px-4 py-2 sm:py-2.5">
          <div className="flex items-center justify-between mb-1 sm:mb-2 gap-2 sm:gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {restaurant?.logoUrl ? (
                <img
                  src={restaurant.logoUrl}
                  alt={restaurant?.name || "Faarees"}
                  className="w-10 h-10 rounded-full object-cover bg-amber-500/20 ring-1 ring-amber-500/40 flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-500/15 ring-1 ring-amber-500/40 flex items-center justify-center flex-shrink-0">
                  <Utensils className="size-5 text-amber-400" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-amber-400 truncate leading-tight">
                  {restaurant?.name || "Faarees Kafee fi Restorraanti"}
                </h1>
                {restaurant?.nameAm && (
                  <p className="hidden sm:block text-xs text-gray-300 truncate">{restaurant.nameAm}</p>
                )}
              </div>
            </div>
            <LanguageSwitcher lang={lang} setLang={setLang} />
          </div>

          {/* Active Meal Period Indicator */}
          {activeMealPeriods.length > 0 && (
            <div className="mb-1 sm:mb-1.5 flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {activeMealPeriods.map((mp) => (
                <div
                  key={mp.id}
                  className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-[#C85A32] rounded-full text-xs font-medium text-white"
                >
                  <Coffee className="size-3" />
                  <span>{getDisplayName(mp, lang) || mp.name}</span>
                  <span className="text-white/80">{mp.startTime} - {mp.endTime}</span>
                </div>
              ))}
            </div>
          )}

          {/* Time Bar Tabs */}
          <div className="flex gap-1 sm:gap-1.5 mb-1 sm:mb-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {timeTabs.map((t) => {
              const Icon = t.icon || LayoutGrid;
              return (
                <button
                  key={t.key}
                  onClick={() => setTimeTab(t.key)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    timeTab === t.key
                      ? "bg-[#D97706] text-white shadow-md"
                      : "bg-[#2D2722] text-[#E5E7EB] hover:bg-white/10"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Category Filter */}
          <div className="flex gap-1 sm:gap-1.5 mb-1 sm:mb-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeCategory === "all"
                  ? "bg-[#D97706] text-white shadow-md"
                  : "bg-[#2D2722] text-[#E5E7EB] hover:bg-white/10"
              }`}
            >
              {lang === "am" ? "ሁሉም" : lang === "om" ? "Hunda" : "All Categories"}
            </button>
            {visibleCategories.map((cat) => {
              const catName = getDisplayName(cat, lang);
              const selected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    selected
                      ? "bg-[#D97706] text-white shadow-md"
                      : "bg-[#2D2722] text-[#E5E7EB] hover:bg-white/10"
                  }`}
                >
                  {cat.mealSchedules && cat.mealSchedules.length > 0 && (
                    <Clock className="size-3 inline mr-1" />
                  )}
                  {catName}
                </button>
              );
            })}
          </div>

          <div className="relative">
            {restaurant?.logoUrl ? (
              <img
                src={restaurant.logoUrl}
                alt=""
                className="absolute left-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full object-cover bg-[#2D2722] ring-1 ring-amber-500/40 pointer-events-none"
              />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-amber-600" />
            )}
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu..."
              className="w-full pl-10 pr-10 py-1.5 sm:py-2 rounded-xl border-0 bg-[#2D2722] text-[#F5F0EB] text-sm placeholder:text-[#9A8F86] focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Pinned Quick-Jump Bar (always-available beverages & snacks) */}
      {!searching && quickJumpCats.length > 0 && (
        <nav className="sticky top-16 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700">
          <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
            {quickJumpCats.map((cat) => (
              <button
                key={cat.id}
                onClick={() => goToSection(cat.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#D97706] text-white hover:bg-[#b96805] transition whitespace-nowrap"
              >
                <Coffee className="size-3" />
                {getDisplayName(cat, lang)}
              </button>
            ))}
          </div>
        </nav>
      )}

      <main className="flex-1 px-4 pt-3 pb-4">
        {/* Search mode: flat results */}
        {searching ? (
          searchResults.length === 0 ? (
            <div className="py-12 text-center">
              <Utensils className="size-12 text-amber-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#2D2522] dark:text-white mb-2">
                No food found
              </h3>
              <p className="text-sm text-[#6E655F] dark:text-gray-400">
                Try a different search term
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {searchResults.map((item) => (
                <FoodCard
                  key={`${item.categoryId}-${item.id}`}
                  item={item}
                  currency={currency}
                  lang={lang}
                />
              ))}
            </div>
          )
        ) : shownCategories.length === 0 ? (
          <div className="py-12 text-center">
            <Utensils className="size-12 text-amber-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#2D2522] dark:text-white mb-2">
              No menu items available yet
            </h3>
            <p className="text-sm text-[#6E655F] dark:text-gray-400">
              Check back later for delicious options
            </p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-8">
            {shownCategories.map((cat) => (
              <section key={cat.id} id={`menu-section-${cat.id}`} className="scroll-mt-48">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-lg font-bold text-[#2D2522] dark:text-white">
                    {getDisplayName(cat, lang)}
                  </h2>
                  {cat.mealSchedules && cat.mealSchedules.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-[#6E655F] dark:text-gray-500">
                      <Clock className="size-3" />
                      {cat.mealSchedules.map((s) => s.name).join(", ")}
                    </span>
                  )}
                  <span className="text-xs text-[#6E655F] dark:text-gray-500 ml-auto">
                    {cat.foodItems.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {cat.foodItems.map((item) => (
                    <FoodCard
                      key={`${cat.id}-${item.id}`}
                      item={item}
                      currency={currency}
                      lang={lang}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t bg-white/50 dark:bg-gray-800/50 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col items-center gap-2">
          <p className="text-sm text-[#6E655F] dark:text-gray-400">
            &copy; {new Date().getFullYear()}{" "}
            {restaurant?.name || "Faarees Kafee fi Restorraanti"}
          </p>
          <Link
            to="/login"
            title="Admin access (staff only)"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <Lock className="size-3" />
            Admin Login
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default PublicMenu;