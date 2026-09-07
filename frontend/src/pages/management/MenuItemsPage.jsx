import React, { useEffect, useState } from "react";
import axiosInstance from "@/axios/axiosInstace";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Utensils, Plus, Edit, Trash2, Search, X, ImagePlus, Sun, Moon, FolderTree } from "lucide-react";

const SafeImage = ({ src, alt, className, fallback }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
};

// Meal-schedules are authoritative: once an item has schedules, it only shows
// in those windows even if it is "always available". With no schedules,
// isAlwaysAvailable means it shows at any time; otherwise it is hidden.
const classifyItemMealType = (food, periodMap) => {
  const ids = food.mealScheduleIds || [];
  if (ids.length === 0) {
    return food.isAlwaysAvailable ? "always" : "unscheduled";
  }
  let morning = false;
  let afternoon = false;
  ids.forEach((mid) => {
    const mp = periodMap[mid?._id || mid];
    const startHour = Number((mp?.startTime || "").split(":")[0]);
    if (Number.isFinite(startHour)) {
      if (startHour < 11) morning = true;
      else afternoon = true;
    }
  });
  if (morning && afternoon) return "both";
  if (morning) return "morning";
  if (afternoon) return "afternoon";
  return "unscheduled";
};

const MEAL_TYPE_OPTIONS = [
  { key: "all", label: "All" },
  { key: "always", label: "Always Available" },
  { key: "morning", label: "Breakfast" },
  { key: "afternoon", label: "Lunch & Dinner" },
  { key: "both", label: "Breakfast + Lunch & Dinner" },
  { key: "unscheduled", label: "Hidden" },
];

const MenuItemsPage = ({ categories, onRefresh }) => {
  const [foods, setFoods] = useState([]);
  const [mealPeriods, setMealPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [mealTypeFilter, setMealTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("mealtype");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFood, setEditingFood] = useState(null);

  const fetchMealPeriods = async () => {
    try {
      const res = await axiosInstance.get("/meal-periods");
      setMealPeriods(res.data?.data || []);
    } catch {
      // Meal periods may not exist yet
    }
  };

  const fetchFoods = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/food-items?activeOnly=false");
      setFoods(res.data?.data || []);
    } catch {
      toast.error("Failed to load food items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoods();
    fetchMealPeriods();
  }, []);

  const periodById = Object.fromEntries(
    mealPeriods.map((mp) => [mp._id || mp.id, mp])
  );

  const filteredFoods = foods.filter((f) => {
    const catIds = (f.categoryIds || []).map((c) => c?._id || c);
    const matchesCategory = selectedCategory === "all" || catIds.includes(selectedCategory);
    const matchesMealType = mealTypeFilter === "all" || classifyItemMealType(f, periodById) === mealTypeFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      f.name?.toLowerCase().includes(q) ||
      f.nameEn?.toLowerCase().includes(q) ||
      f.nameOm?.toLowerCase().includes(q) ||
      f.nameAm?.toLowerCase().includes(q);
    return matchesCategory && matchesMealType && matchesSearch;
  });

  const mealTypeCounts = (() => {
    const counts = { all: foods.length, always: 0, morning: 0, afternoon: 0, both: 0, unscheduled: 0 };
    foods.forEach((f) => {
      counts[classifyItemMealType(f, periodById)] += 1;
    });
    return counts;
  })();

  const getCategoryNames = (food) =>
    (food.categoryIds || []).map((cid) => {
      const cat = categories.find((c) => (c._id || c.id) === (cid?._id || cid));
      return cat?.nameEn || cat?.name || "";
    }).filter(Boolean);

  const getMealScheduleNames = (food) =>
    (food.mealScheduleIds || [])
      .map((mid) => {
        const mp = periodById[mid?._id || mid];
        return mp?.nameEn || mp?.name || "";
      })
      .filter(Boolean);

  const windowPeriodIds = (startBefore11) =>
    mealPeriods
      .filter((mp) => {
        const h = Number((mp.startTime || "").split(":")[0]);
        if (!Number.isFinite(h)) return false;
        return startBefore11 ? h < 11 : h >= 11;
      })
      .map((mp) => mp._id || mp.id);

  const morningPeriodIds = windowPeriodIds(true);
  const afternoonPeriodIds = windowPeriodIds(false);

  const foodInWindow = (food, ids) =>
    (food.mealScheduleIds || []).some((mid) => ids.includes(mid?._id || mid));

  const toggleItemWindow = async (food, windowKey) => {
    const ids = windowKey === "morning" ? morningPeriodIds : afternoonPeriodIds;
    if (ids.length === 0) {
      toast.error("No matching meal schedule found for this window");
      return;
    }
    const current = (food.mealScheduleIds || []).map((mid) => mid?._id || mid);
    const has = ids.some((id) => current.includes(id));
    const next = has
      ? current.filter((id) => !ids.includes(id))
      : Array.from(new Set([...current, ...ids]));
    try {
      await axiosInstance.patch(`/food-items/${food._id}`, { mealScheduleIds: next });
      setFoods((prev) =>
        prev.map((f) => (f._id === food._id ? { ...f, mealScheduleIds: next } : f))
      );
      onRefresh();
      toast.success(
        has
          ? `"${food.nameEn || food.name}" no longer visible in ${windowKey}`
          : `"${food.nameEn || food.name}" now visible in ${windowKey}`
      );
    } catch (e) {
      toast.error(e.backendMessage || "Failed to update visibility");
    }
  };

  const groups = (() => {
    const periodMap = Object.fromEntries(
      mealPeriods.map((mp) => [mp._id || mp.id, mp])
    );

    if (viewMode === "mealtype") {
      const MEAL_GROUPS = [
        { key: "always", title: "Always Available", desc: "Shown at any time of day" },
        { key: "morning", title: "Breakfast", desc: "Morning meal" },
        { key: "afternoon", title: "Lunch & Dinner", desc: "Afternoon-Evening meal" },
        { key: "both", title: "Breakfast + Lunch & Dinner", desc: "Served across meal periods" },
        { key: "unscheduled", title: "Hidden — No Time Window", desc: "Not shown in any customer time tab" },
      ];
      return MEAL_GROUPS.map((g) => ({
        ...g,
        foods: filteredFoods.filter((f) => classifyItemMealType(f, periodMap) === g.key),
      })).filter((g) => g.foods.length > 0);
    }

    const catGroups = categories.map((cat) => ({
      key: cat._id || cat.id,
      title: cat.nameEn || cat.name || "Category",
      desc: "",
      foods: filteredFoods.filter((f) =>
        (f.categoryIds || []).some((cid) => (cid?._id || cid) === (cat._id || cat.id))
      ),
    })).filter((g) => g.foods.length > 0);

    const uncategorized = filteredFoods.filter((f) =>
      (f.categoryIds || []).length === 0
    );
    return catGroups.concat(
      uncategorized.length > 0
        ? [{ key: "uncategorized", title: "Uncategorized", desc: "", foods: uncategorized }]
        : []
    );
  })();

  const toggleAvailable = async (food, newValue) => {
    try {
      await axiosInstance.patch(`/food-items/${food._id}`, { isAvailable: newValue });
      setFoods((prev) => prev.map((f) => (f._id === food._id ? { ...f, isAvailable: newValue } : f)));
      onRefresh();
      toast.success(newValue ? `"${food.nameEn || food.name}" is now Available` : `"${food.nameEn || food.name}" is now Unavailable`);
    } catch (e) {
      toast.error(e.backendMessage || "Failed to update");
    }
  };

  const deleteFood = async (foodId) => {
    try {
      await axiosInstance.delete(`/food-items/${foodId}`);
      setFoods((prev) => prev.filter((f) => f._id !== foodId));
      onRefresh();
      toast.success("Food item deleted");
    } catch (e) {
      toast.error(e.backendMessage || "Failed to delete");
    }
  };

  const activeCount = foods.filter(f => f.isAvailable).length;

  const renderFoodRow = (food) => (
    <div
      key={food._id}
      className={`p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${!food.isAvailable ? "opacity-50" : ""}`}
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
        <SafeImage
          src={food.imageUrl}
          alt={food.name || ""}
          className="w-full h-full object-cover"
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <Utensils className="size-5 text-gray-400" />
            </div>
          }
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
            {food.nameEn || food.name || "Unnamed"}
          </h3>
          {!food.isAvailable && (
            <Badge variant="destructive" className="text-xs px-1 py-0">Unavailable</Badge>
          )}
          {food.isAlwaysAvailable && (food.mealScheduleIds || []).length === 0 && (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-xs px-1 py-0">All Day</Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {getCategoryNames(food).length > 0 ? (
            getCategoryNames(food).map((name, i) => (
              <Badge key={i} variant="outline" className="text-xs py-0 px-1.5">
                {name}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="text-xs py-0 px-1.5">Uncategorized</Badge>
          )}
          {getMealScheduleNames(food).map((name, i) => (
            <Badge
              key={`sched-${i}`}
              className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 text-xs py-0 px-1.5 border-0"
            >
              {name}
            </Badge>
          ))}
          <span className="text-xs font-medium text-amber-600">
            {Number(food.price || 0).toLocaleString()} ETB
          </span>
        </div>
        {/* Per-time-window visibility (admin decides where an item is visible) */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <button
            onClick={() => toggleItemWindow(food, "morning")}
            title={food.isAlwaysAvailable ? "Restrict or hide this all-day item from the Morning window" : "Visible during the Morning meal"}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition ${
              foodInWindow(food, morningPeriodIds)
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-600 dark:hover:bg-gray-800"
            }`}
          >
            <Sun className="size-3" />
            Morning
          </button>
          <button
            onClick={() => toggleItemWindow(food, "afternoon")}
            title={food.isAlwaysAvailable ? "Restrict or hide this all-day item from the Afternoon-Evening window" : "Visible during the Afternoon-Evening meal"}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition ${
              foodInWindow(food, afternoonPeriodIds)
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-600 dark:hover:bg-gray-800"
            }`}
          >
            <Moon className="size-3" />
            Afternoon-Evening
          </button>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Switch
          checked={food.isAvailable}
          onCheckedChange={(v) => toggleAvailable(food, v)}
          className="scale-90"
        />
        <button
          onClick={() => { setEditingFood(food); setEditDialogOpen(true); }}
          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
          title="Edit"
        >
          <Edit className="size-4" />
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete "${food.nameEn || food.name}"?`)) deleteFood(food._id);
          }}
          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          title="Delete"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 pb-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Menu Items</h1>
        <p className="text-xs text-gray-500">
          {foods.length} total · {activeCount} available · {foods.length - activeCount} hidden
        </p>
        </div>
        <Button
          onClick={() => { setEditingFood(null); setEditDialogOpen(true); }}
          className="bg-amber-600 hover:bg-amber-700 h-9 text-xs sm:text-sm w-full sm:w-auto"
        >
          <Plus className="size-4 mr-1.5" />
          Add Item
        </Button>
      </div>

      {/* Filter Row */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 mb-4">
        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Search food items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 h-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm"
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

        {/* View Mode Toggle */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-900 mb-2">
          <button
            onClick={() => setViewMode("mealtype")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition ${
              viewMode === "mealtype"
                ? "bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Utensils className="size-4 hidden sm:block" />
            <span className="sm:hidden">Meals</span>
            <span className="hidden sm:inline">By Meal Type</span>
          </button>
          <button
            onClick={() => setViewMode("category")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition ${
              viewMode === "category"
                ? "bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <FolderTree className="size-4 hidden sm:block" />
            <span className="sm:hidden">Categories</span>
            <span className="hidden sm:inline">By Category</span>
          </button>
        </div>

        {/* Meal Type Filter (with counts) */}
        <div className="flex gap-1.5 flex-nowrap overflow-x-auto pb-1 mb-2 scrollbar-hide sm:flex-wrap sm:overflow-visible sm:pb-0">
          {MEAL_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setMealTypeFilter(opt.key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition whitespace-nowrap flex-shrink-0 sm:shrink ${
                mealTypeFilter === opt.key
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {opt.label}
              <span
                className={`px-1.5 py-0 rounded-full text-[10px] font-bold ${
                  mealTypeFilter === opt.key
                    ? "bg-white/20"
                    : "bg-white dark:bg-gray-700"
                }`}
              >
                {mealTypeCounts[opt.key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="relative">
          <div
            className="w-full h-10 pl-3 pr-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm flex items-center cursor-pointer overflow-hidden"
            onClick={() => document.getElementById('category-select')?.click()}
          >
            <span className="truncate">
              {selectedCategory === "all"
                ? "All Categories"
                : (categories.find(c => (c._id || c.id) === selectedCategory)?.nameEn
                  || categories.find(c => (c._id || c.id) === selectedCategory)?.name
                  || "All Categories")}
            </span>
          </div>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id || cat.id} value={cat._id || cat.id}>
                {cat.nameEn || cat.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[1,2,3,4].map((i) => (
              <div key={i} className="p-3 flex items-center gap-3">
                <div className="size-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredFoods.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <Utensils className="size-6 text-gray-400" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-1">
              {searchQuery || selectedCategory !== "all" ? "No items found" : "No menu items yet"}
            </h3>
            <p className="text-xs text-gray-500 mb-4 max-w-xs mx-auto">
              {searchQuery || selectedCategory !== "all"
                ? "Try adjusting your search or filter"
                : "Add your first food item to start building your menu"}
            </p>
            {!searchQuery && selectedCategory === "all" && (
              <Button onClick={() => { setEditingFood(null); setEditDialogOpen(true); }} className="bg-amber-600 hover:bg-amber-700 h-9 text-sm">
                <Plus className="size-4 mr-1.5" />
                Add First Menu Item
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {groups.map((group) => (
              <div key={group.key} className="divide-y divide-gray-100 dark:divide-gray-700">
                <div className="px-3 pt-3 pb-2 bg-[#1E1E1E] flex items-baseline gap-2 rounded-t-lg">
                  <h4 className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wide">
                    {group.title}
                  </h4>
                  {viewMode === "mealtype" && group.desc && (
                    <span className="text-[11px] text-gray-400 hidden sm:inline">
                      {group.desc}
                    </span>
                  )}
                  <span className="ml-auto text-[11px] text-amber-400/80">
                    {group.foods.length} item{group.foods.length === 1 ? "" : "s"}
                  </span>
                </div>
                {group.foods.map((food) => renderFoodRow(food))}
              </div>
            ))}
          </div>
        )}
      </div>

      <FoodDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        food={editingFood}
        categories={categories}
        mealPeriods={mealPeriods}
        onSave={() => {
          setEditDialogOpen(false);
          onRefresh();
          fetchFoods();
        }}
      />
    </div>
  );
};

const FoodDialog = ({ open, onClose, food, categories, mealPeriods, onSave }) => {
  const [form, setForm] = useState({
    categoryIds: [],
    mealScheduleIds: [],
    nameEn: "",
    nameOm: "",
    nameAm: "",
    descriptionEn: "",
    descriptionOm: "",
    descriptionAm: "",
    price: "",
    imageUrl: "",
    isAvailable: true,
    isAlwaysAvailable: false,
    isActive: true,
    displayOrder: 0,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (food) {
      setForm({
        categoryIds: (food.categoryIds || []).map((c) => c?._id || c),
        mealScheduleIds: (food.mealScheduleIds || []).map((ms) => ms?._id || ms),
        nameEn: food.nameEn || food.name || "",
        nameOm: food.nameOm || "",
        nameAm: food.nameAm || "",
        descriptionEn: food.descriptionEn || food.description || "",
        descriptionOm: food.descriptionOm || "",
        descriptionAm: food.descriptionAm || "",
        price: food.price || "",
        imageUrl: food.imageUrl || "",
        isAvailable: food.isAvailable !== false,
        isAlwaysAvailable: food.isAlwaysAvailable || false,
        isActive: food.isActive !== false,
        displayOrder: food.displayOrder || 0,
      });
    } else {
      setForm({
        categoryIds: categories[0]?._id || categories[0]?.id ? [(categories[0]?._id || categories[0]?.id)] : [],
        mealScheduleIds: [],
        nameEn: "",
        nameOm: "",
        nameAm: "",
        descriptionEn: "",
        descriptionOm: "",
        descriptionAm: "",
        price: "",
        imageUrl: "",
        isAvailable: true,
        isAlwaysAvailable: false,
        isActive: true,
        displayOrder: 0,
      });
    }
  }, [food, open, categories]);

  const toggleCategory = (id) => {
    setForm((f) => {
      const has = f.categoryIds.includes(id);
      return {
        ...f,
        categoryIds: has
          ? f.categoryIds.filter((x) => x !== id)
          : [...f.categoryIds, id],
      };
    });
  };

  const toggleMealSchedule = (id) => {
    setForm((f) => {
      const has = f.mealScheduleIds.includes(id);
      return {
        ...f,
        mealScheduleIds: has
          ? f.mealScheduleIds.filter((x) => x !== id)
          : [...f.mealScheduleIds, id],
      };
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axiosInstance.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.data?.url;
      if (url) {
        setForm((f) => ({ ...f, imageUrl: url }));
        toast.success("Image uploaded");
      }
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.categoryIds.length === 0) { toast.error("Please select at least one category"); return; }
    if (!form.nameEn.trim()) { toast.error("English name is required"); return; }
    if (!form.price || Number(form.price) < 0) { toast.error("Please enter a valid price"); return; }
    setSaving(true);
    try {
      const payload = {
        categoryIds: form.categoryIds,
        mealScheduleIds: form.mealScheduleIds,
        name: form.nameEn,
        nameEn: form.nameEn,
        nameOm: form.nameOm,
        nameAm: form.nameAm,
        description: form.descriptionEn,
        descriptionEn: form.descriptionEn,
        descriptionOm: form.descriptionOm,
        descriptionAm: form.descriptionAm,
        price: Number(form.price),
        imageUrl: form.imageUrl,
        isAvailable: form.isAvailable,
        isAlwaysAvailable: form.isAlwaysAvailable,
        isActive: form.isActive,
        displayOrder: Number(form.displayOrder) || 0,
      };
      if (food) {
        await axiosInstance.patch(`/food-items/${food._id}`, payload);
        toast.success("Food item updated");
      } else {
        await axiosInstance.post("/food-items", payload);
        toast.success("Food item created");
      }
      onSave();
    } catch (e) {
      toast.error(e.backendMessage || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{food ? "Edit Food Item" : "Add New Food Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Categories *</label>
              <div className="space-y-1 max-h-36 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                {categories.map((cat) => {
                  const checked = form.categoryIds.includes(cat._id || cat.id);
                  return (
                    <label
                      key={cat._id || cat.id}
                      className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-xs sm:text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(cat._id || cat.id)}
                        className="accent-amber-600"
                      />
                      <span className="truncate">{cat.nameEn || cat.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Price (ETB) *</label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="0"
                className="h-9"
              />
            </div>
          </div>

          {/* Meal Schedules (many-to-many) */}
          <div>
            <label className="block text-xs font-medium mb-1">
              Meal Schedules <span className="text-gray-400">(leave empty if always available)</span>
            </label>
            <div className="space-y-1.5 max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
              {mealPeriods.length === 0 ? (
                <p className="text-xs text-gray-400 px-2 py-1">No meal schedules yet</p>
              ) : (
                mealPeriods.map((mp) => {
                  const checked = form.mealScheduleIds.includes(mp._id || mp.id);
                  return (
                    <label
                      key={mp._id || mp.id}
                      className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-xs sm:text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMealSchedule(mp._id || mp.id)}
                        className="accent-amber-600"
                      />
                      <span className="flex-1 truncate">{mp.nameEn || mp.name}</span>
                      <span className="text-xs text-gray-400">{mp.startTime} - {mp.endTime}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Name (English) *</label>
              <Input
                value={form.nameEn}
                onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                placeholder="e.g. Lemon Tea"
                className="h-9"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Name (Oromoo)</label>
              <Input
                value={form.nameOm}
                onChange={(e) => setForm((f) => ({ ...f, nameOm: e.target.value }))}
                placeholder="e.g. Shaayii Loomii"
                className="h-9"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Name (Amharic)</label>
            <Input
              value={form.nameAm}
              onChange={(e) => setForm((f) => ({ ...f, nameAm: e.target.value }))}
              placeholder="e.g. ሻይ ሎሚ"
              className="h-9"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Description</label>
            <Input
              value={form.descriptionEn}
              onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))}
              placeholder="Brief description..."
              className="h-9"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Image</label>
            <div className="space-y-2">
              {/* Image URL Input */}
              <div className="flex gap-2">
                <Input
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="Paste image URL here..."
                  className="h-9 flex-1"
                />
                <label className="flex items-center gap-2 px-3 h-9 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 flex-shrink-0">
                  <ImagePlus className="size-4" />
                  <span className="text-xs sm:text-sm whitespace-nowrap">{uploading ? "..." : "Upload"}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>
              </div>
              {/* Preview (with default placeholder fallback) */}
              <div className="relative inline-block">
                {form.imageUrl ? (
                  <SafeImage
                    src={form.imageUrl}
                    alt="Preview"
                    className="w-20 h-20 rounded-lg object-cover border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                    fallback={
                      <div className="w-20 h-20 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center text-gray-400">
                        <ImagePlus className="size-6 mb-1" />
                        <span className="text-[10px]">No preview</span>
                      </div>
                    }
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center text-gray-400">
                    <ImagePlus className="size-6 mb-1" />
                    <span className="text-[10px]">No image</span>
                  </div>
                )}
                {form.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                    className="absolute -top-1.5 -right-1.5 size-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isAvailable}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isAvailable: v }))}
              />
              <span className="text-xs sm:text-sm">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isAlwaysAvailable}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isAlwaysAvailable: v }))}
              />
              <span className="text-xs sm:text-sm">Always Available</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <span className="text-xs sm:text-sm">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm">Order</label>
              <Input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
                className="w-16 h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto h-9 text-sm">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 h-9 text-sm">
              {saving ? "Saving..." : (food ? "Update" : "Add Item")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MenuItemsPage;
