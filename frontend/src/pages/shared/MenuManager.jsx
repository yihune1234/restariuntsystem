import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useMenuStore } from "@/store/useMenuStore";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus, Trash2, Pencil, UtensilsCrossed, ChevronRight, Search,
  GripVertical, Save, X, Clock, LayoutGrid, Tag, CheckCircle2,
} from "lucide-react";
import { CategoryDialog, ItemDialog, MealTypeDialog } from "./MenuDialogs";

const getDisplayName = (entity, lang) => {
  if (!entity) return "";
  if (lang === "en" && entity.nameEn) return entity.nameEn;
  if (lang === "om" && entity.nameOm) return entity.nameOm;
  if (lang === "am" && entity.nameAm) return entity.nameAm;
  return entity.name || entity.nameEn || entity.nameOm || entity.nameAm || "";
};

const SortableItem = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div {...attributes} {...listeners} className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="size-4" />
      </div>
      {children}
    </div>
  );
};

const InlinePriceEdit = ({ item, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.price);
  const save = async () => {
    if (Number(value) === Number(item.price)) { setEditing(false); return; }
    await onSave(item._id, { price: Number(value) });
    setEditing(false);
  };
  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input type="number" value={value} onChange={e => setValue(e.target.value)} className="h-7 w-20 text-sm" autoFocus
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setValue(item.price); setEditing(false); } }} />
        <Button size="icon-sm" variant="ghost" onClick={save} className="text-green-600"><Save className="size-3" /></Button>
        <Button size="icon-sm" variant="ghost" onClick={() => { setValue(item.price); setEditing(false); }} className="text-red-500"><X className="size-3" /></Button>
      </div>
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-sm font-bold text-primary hover:underline" title="Click to edit price">
      {Number(item.price || 0).toLocaleString()} ETB <Pencil className="size-2.5 opacity-50" />
    </button>
  );
};

const InlineDescEdit = ({ item, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.description || "");
  const save = async () => {
    if (value === (item.description || "")) { setEditing(false); return; }
    await onSave(item._id, { description: value });
    setEditing(false);
  };
  if (editing) {
    return (
      <div className="space-y-1">
        <textarea value={value} onChange={e => setValue(e.target.value)} className="w-full p-2 rounded-md border text-xs resize-none" rows={2} autoFocus />
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={save} className="h-6 text-xs">Save</Button>
          <Button size="sm" variant="ghost" onClick={() => { setValue(item.description || ""); setEditing(false); }} className="h-6 text-xs">Cancel</Button>
        </div>
      </div>
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="text-xs text-muted-foreground hover:text-foreground text-left line-clamp-2 w-full">
      {item.description || <span className="italic opacity-50">Click to add description...</span>}
    </button>
  );
};

const MenuManager = () => {
  const { t } = useTranslation();

  const {
    categories, foodItems, mealPeriods, isLoading,
    getCategories, getFoodItems, getMealPeriods,
    createCategory, updateCategory, deleteCategory,
    createFoodItem, updateFoodItem, deleteFoodItem,
    toggleCategoryActive: toggleCategoryActiveAsync,
    toggleCategoryHidden: toggleCategoryHiddenAsync,
    toggleCategoryAllDay: toggleCategoryAllDayAsync,
    toggleItemAvailability: toggleItemAvailabilityAsync,
    toggleItemHidden: toggleItemHiddenAsync,
    toggleItemFeatured: toggleItemFeaturedAsync,
    uploadFoodImage,
    createMealPeriod, updateMealPeriod, deleteMealPeriod,
    reorderCategories, reorderFoodItems,
  } = useMenuStore();

  const [activeTab, setActiveTab] = useState("meal-types");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [catOpen, setCatOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [mealTypeOpen, setMealTypeOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingMealType, setEditingMealType] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [reorderMode, setReorderMode] = useState(false);
  const [categoryIds, setCategoryIds] = useState([]);
  const [itemIds, setItemIds] = useState([]);
  const [mealPeriodFilter, setMealPeriodFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [catForm, setCatForm] = useState({
    name: "", nameEn: "", nameOm: "", nameAm: "", displayOrder: 0, mealPeriodIds: [],
    isAllDay: false, isHidden: false,
  });

  const [mealTypeForm, setMealTypeForm] = useState({
    name: "", nameEn: "", nameOm: "", nameAm: "", startTime: "", endTime: "", displayOrder: 0, isActive: true,
  });

  const [itemForm, setItemForm] = useState({
    name: "", nameEn: "", nameOm: "", nameAm: "",
    description: "", descriptionEn: "", descriptionOm: "", descriptionAm: "",
    price: 0, categoryId: "", isAvailable: true, isHidden: false, isFeatured: false,
    preparationTimeMinutes: 15, displayOrder: 0, tags: [], mealPeriodIds: [],
  });

  const isAllDayMealPeriod = useCallback((mp) => {
    return mp.name === "ALL_DAY" || (mp.nameEn || "").toLowerCase().includes("all-day");
  }, []);

  const getItemCategory = useCallback((item) => {
    const catId = typeof item.categoryId === "object" ? item.categoryId?._id : item.categoryId;
    return categories.find(c => c._id === catId) || null;
  }, [categories]);

  const itemBelongsToMealPeriod = useCallback((item, mpId) => {
    const itemMpIds = (item.mealPeriodIds || []).map(id => String(id?._id || id));
    const cat = getItemCategory(item);
    const catIsAllDay = cat?.isAllDay || false;
    const catMpIds = (cat?.mealPeriodIds || []).map(id => String(id?._id || id));
    const catBelongs = catIsAllDay || catMpIds.length === 0 || catMpIds.includes(mpId);
    const itemBelongs = itemMpIds.length === 0 || itemMpIds.includes(mpId);
    return catBelongs && itemBelongs;
  }, [getItemCategory]);

  const getItemMealTypeBadges = useCallback((item) => {
    const cat = getItemCategory(item);
    const catIsAllDay = cat?.isAllDay || false;
    const badges = [];
    if (catIsAllDay) badges.push({ name: "All-Day", isAllDay: true });
    (mealPeriods || []).forEach(mp => {
      if (isAllDayMealPeriod(mp)) return;
      if (itemBelongsToMealPeriod(item, String(mp._id))) {
        badges.push({ name: mp.name || getDisplayName(mp, "en"), isAllDay: false });
      }
    });
    return badges;
  }, [mealPeriods, getItemCategory, itemBelongsToMealPeriod, isAllDayMealPeriod]);

  const filteredItems = useMemo(() => {
    let items = foodItems;
    if (selectedCategory) {
      items = items.filter(i => {
        const catId = typeof i.categoryId === "object" ? i.categoryId?._id : i.categoryId;
        return catId === selectedCategory._id;
      });
    }
    if (mealPeriodFilter !== "all") {
      const filterMp = mealPeriods.find(mp => String(mp._id) === String(mealPeriodFilter));
      if (!filterMp || !isAllDayMealPeriod(filterMp)) {
        const filterMpId = String(mealPeriodFilter);
        items = items.filter(i => itemBelongsToMealPeriod(i, filterMpId));
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i =>
        (i.name || "").toLowerCase().includes(q) ||
        (i.description || "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "name") {
      items = [...items].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "price") {
      items = [...items].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "category") {
      items = [...items].sort((a, b) => String(a.categoryId).localeCompare(String(b.categoryId)));
    }
    return items;
  }, [foodItems, selectedCategory, searchQuery, mealPeriodFilter, categories, sortBy, isAllDayMealPeriod, itemBelongsToMealPeriod]);

  const filteredCategories = useMemo(() => {
    if (mealPeriodFilter === "all") return categories;
    const filterMpId = String(mealPeriodFilter);
    return categories.filter(c => {
      if (c.isAllDay) return true;
      const mpIds = (c.mealPeriodIds || []).map(id => String(id));
      if (mpIds.length === 0) return true;
      return mpIds.includes(filterMpId);
    });
  }, [categories, mealPeriodFilter]);

  useEffect(() => {
    getCategories({ activeOnly: false });
    getMealPeriods({});
  }, [getCategories, getMealPeriods]);

  useEffect(() => {
    if (selectedCategory) {
      getFoodItems({ categoryId: selectedCategory._id });
    } else {
      getFoodItems({});
    }
  }, [selectedCategory, getFoodItems]);

  useEffect(() => {
    if (activeTab === "categories" && categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]);
    }
    setCategoryIds(categories.map(c => c._id));
  }, [categories, selectedCategory, activeTab]);

  useEffect(() => {
    setItemIds(filteredItems.map(i => i._id));
  }, [filteredItems]);

  const handleCategoryDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categoryIds.indexOf(active.id);
    const newIndex = categoryIds.indexOf(over.id);
    const newOrder = arrayMove([...categoryIds], oldIndex, newIndex);
    setCategoryIds(newOrder);
    await reorderCategories(newOrder.map((id, idx) => ({ id, displayOrder: idx })));
    toast.success("Category order saved");
  };

  const handleItemDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = itemIds.indexOf(active.id);
    const newIndex = itemIds.indexOf(over.id);
    const newOrder = arrayMove([...itemIds], oldIndex, newIndex);
    setItemIds(newOrder);
    await reorderFoodItems(newOrder.map((id, idx) => ({ id, displayOrder: idx })));
    toast.success("Item order saved");
  };

  const openCreateMealType = () => {
    if (mealPeriods.some(mp => mp.name === "ALL_DAY" || (mp.nameEn || "").toLowerCase().includes("all-day"))) {
      return toast.error("All-Day already exists — it always shows every active category");
    }
    setEditingMealType(null);
    setMealTypeForm({ name: "", nameEn: "", nameOm: "", nameAm: "", startTime: "", endTime: "", displayOrder: 0, isActive: true });
    setMealTypeOpen(true);
  };

  const openEditMealType = (mp) => {
    const allDay = mp.name === "ALL_DAY" || (mp.nameEn || "").toLowerCase().includes("all-day");
    setEditingMealType(mp._id);
    setMealTypeForm({
      name: mp.name || "",
      nameEn: mp.nameEn || "",
      nameOm: mp.nameOm || "",
      nameAm: mp.nameAm || "",
      startTime: mp.startTime || "",
      endTime: mp.endTime || "",
      displayOrder: mp.displayOrder || 0,
      isActive: allDay ? true : mp.isActive !== false,
    });
    setMealTypeOpen(true);
  };

  const handleSaveMealType = async () => {
    if (!mealTypeForm.name.trim()) return toast.error("Meal type name required");
    const isEditingAllDay = mealPeriods.find(mp => mp._id === editingMealType)
      && (mealTypeForm.name === "ALL_DAY" || (mealTypeForm.nameEn || "").toLowerCase().includes("all-day"));
    const payload = {
      ...mealTypeForm,
      isActive: isEditingAllDay ? true : mealTypeForm.isActive,
    };
    const res = editingMealType
      ? await updateMealPeriod(editingMealType, payload)
      : await createMealPeriod(payload);
    if (res.success) {
      setMealTypeOpen(false);
      getMealPeriods({});
    }
  };

  const handleDeleteMealType = async (mp) => {
    if (mp.name === "ALL_DAY" || (mp.nameEn || "").toLowerCase().includes("all-day")) {
      return toast.error("All-Day cannot be deleted — it always shows every active category");
    }
    if (!confirm(`Delete meal type "${mp.name}"? Categories will not be deleted.`)) return;
    await deleteMealPeriod(mp._id);
    getMealPeriods({});
  };

  const saveCat = async () => {
    if (!catForm.name) return toast.error("Category name required");
    const fn = editing ? updateCategory : createCategory;
    const payload = {
      name: catForm.name,
      nameEn: catForm.nameEn,
      nameOm: catForm.nameOm,
      nameAm: catForm.nameAm,
      displayOrder: catForm.displayOrder || 0,
      mealPeriodIds: catForm.mealPeriodIds || [],
      isAllDay: catForm.isAllDay || false,
      isHidden: catForm.isHidden || false,
    };
    const res = await fn(editing, payload);
    if (res.success) {
      setCatOpen(false);
      setEditing(null);
      getCategories({ activeOnly: false });
    }
  };

  const saveItem = async (imageFile) => {
    if (!itemForm.name || !itemForm.categoryId) return toast.error("Name & category required");
    const fn = editing ? updateFoodItem : createFoodItem;
    const payload = {
      name: itemForm.name,
      nameEn: itemForm.nameEn,
      nameOm: itemForm.nameOm,
      nameAm: itemForm.nameAm,
      description: itemForm.description,
      descriptionEn: itemForm.descriptionEn,
      descriptionOm: itemForm.descriptionOm,
      descriptionAm: itemForm.descriptionAm,
      price: Number(itemForm.price) || 0,
      categoryId: itemForm.categoryId,
      isAvailable: itemForm.isAvailable,
      isHidden: itemForm.isHidden || false,
      isFeatured: itemForm.isFeatured || false,
      mealPeriodIds: itemForm.mealPeriodIds || [],
      preparationTimeMinutes: itemForm.preparationTimeMinutes || 15,
      displayOrder: itemForm.displayOrder || 0,
      tags: itemForm.tags || [],
    };
    const res = await fn(editing, payload);
    if (res.success) {
      if (imageFile && res.data?._id) await uploadFoodImage(res.data._id, imageFile);
      setItemOpen(false);
      setEditing(null);
      getFoodItems({ categoryId: selectedCategory?._id });
    }
  };

  const toggleCategoryActive = async (cat) => {
    await toggleCategoryActiveAsync(cat._id);
    getCategories({ activeOnly: false });
  };

  const toggleItemAvailability = async (item) => {
    await toggleItemAvailabilityAsync(item._id);
    getFoodItems({ categoryId: selectedCategory?._id });
  };

  const handleDeleteCategory = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    await deleteCategory(cat._id);
    if (selectedCategory?._id === cat._id) setSelectedCategory(null);
    getCategories({ activeOnly: false });
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await deleteFoodItem(item._id);
    getFoodItems({ categoryId: selectedCategory?._id });
  };

  const openEditCategory = (cat) => {
    setEditing(cat._id);
    setCatForm({
      name: cat.name,
      nameEn: cat.nameEn || "",
      nameOm: cat.nameOm || "",
      nameAm: cat.nameAm || "",
      displayOrder: cat.displayOrder || 0,
      mealPeriodIds: (cat.mealPeriodIds || []).map(id => typeof id === "object" ? id._id : id),
      isAllDay: cat.isAllDay || false,
      isHidden: cat.isHidden || false,
    });
    setCatOpen(true);
  };

  const openCreateCategory = () => {
    setEditing(null);
    setCatForm({ name: "", nameEn: "", nameOm: "", nameAm: "", displayOrder: 0, mealPeriodIds: [], isAllDay: false, isHidden: false });
    setCatOpen(true);
  };

  const openEditItem = (item) => {
    setEditing(item._id);
    const catId = typeof item.categoryId === "object" ? item.categoryId?._id : item.categoryId;
    setItemForm({
      name: item.name,
      nameEn: item.nameEn || "",
      nameOm: item.nameOm || "",
      nameAm: item.nameAm || "",
      description: item.description || "",
      descriptionEn: item.descriptionEn || "",
      descriptionOm: item.descriptionOm || "",
      descriptionAm: item.descriptionAm || "",
      price: item.price || 0,
      categoryId: catId,
      isAvailable: item.isAvailable !== false,
      isHidden: item.isHidden || false,
      isFeatured: item.isFeatured || false,
      mealPeriodIds: (item.mealPeriodIds || []).map(id => typeof id === "object" ? id._id : id),
      preparationTimeMinutes: item.preparationTimeMinutes || 15,
      displayOrder: item.displayOrder || 0,
      tags: item.tags || [],
    });
    setItemOpen(true);
  };

  const openCreateItem = () => {
    setEditing(null);
    setItemForm({
      name: "", nameEn: "", nameOm: "", nameAm: "",
      description: "", descriptionEn: "", descriptionOm: "", descriptionAm: "",
      price: 0, categoryId: selectedCategory?._id || "", isAvailable: true,
      isHidden: false, isFeatured: false,
      mealPeriodIds: mealPeriodFilter !== "all"
        ? (() => {
            const mp = mealPeriods.find(m => String(m._id) === String(mealPeriodFilter));
            return mp && !isAllDayMealPeriod(mp) ? [mp._id] : [];
          })()
        : [],
      preparationTimeMinutes: 15, displayOrder: 0, tags: [],
    });
    setItemOpen(true);
  };

  const Breadcrumb = () => (
    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <button onClick={() => { setSelectedCategory(null); setSearchQuery(""); setReorderMode(false); setActiveTab("categories"); }} className="hover:text-foreground transition-colors">Categories</button>
      {selectedCategory && (
        <>
          <ChevronRight className="size-3" />
          <span className="font-medium text-foreground">{selectedCategory.name}</span>
        </>
      )}
    </div>
  );

  const renderMealTypes = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <LayoutGrid className="size-5 text-primary" /> Meal Types
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage breakfast, lunch, dinner, all-day sections</p>
        </div>
        <Button size="sm" onClick={openCreateMealType}>
          <Plus className="size-4 mr-1" /> Add Meal Type
        </Button>
      </div>

      {isLoading && mealPeriods.length === 0 ? (
        <div className="grid md:grid-cols-2 gap-3">{[1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : mealPeriods.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <LayoutGrid className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No meal types yet. Create your first meal type to organize your menu by time of day.</p>
            <Button size="sm" className="mt-3" onClick={openCreateMealType}><Plus className="size-4 mr-1" /> Create Meal Type</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {mealPeriods.map(mp => {
            const allDay = mp.name === "ALL_DAY" || (mp.nameEn || "").toLowerCase().includes("all-day");
            return (
            <Card key={mp._id} className={`hover:shadow-md transition-all group ${!mp.isActive ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{mp.name}</h3>
                    {(mp.nameEn || mp.nameOm || mp.nameAm) && (
                      <p className="text-xs text-muted-foreground truncate">{[mp.nameEn, mp.nameOm, mp.nameAm].filter(Boolean).join(" / ")}</p>
                    )}
                    {allDay && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded-full px-2 py-0.5">
                        <CheckCircle2 className="size-3" /> Always on · all categories
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-none">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditMealType(mp)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="size-3" /></Button>
                    {!allDay && (
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteMealType(mp)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="size-3 text-red-500" /></Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  {mp.startTime && mp.endTime && mp.name !== "ALL_DAY" && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <span>{mp.startTime} – {mp.endTime}</span>
                    </div>
                  )}
                  {allDay ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 ml-auto">
                      <CheckCircle2 className="size-3" />
                      <span>Always active</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 ml-auto" onClick={e => e.stopPropagation()}>
                      <Switch checked={mp.isActive !== false} onCheckedChange={async (val) => {
                        await updateMealPeriod(mp._id, { isActive: val });
                        getMealPeriods({});
                      }} className="data-[state=checked]:bg-green-600" />
                      <span className="text-xs text-muted-foreground w-12">{mp.isActive !== false ? "Active" : "Inactive"}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderMealPeriodFilter = () => {
    if (mealPeriods.length === 0) return null;
    const isItemsView = activeTab === "items";
    const countFor = (mp) => {
      if (!mp) return isItemsView ? foodItems.length : categories.length;
      if (isAllDayMealPeriod(mp)) return isItemsView ? foodItems.length : categories.length;
      const mpId = String(mp._id);
      if (isItemsView) {
        return foodItems.filter(i => itemBelongsToMealPeriod(i, mpId)).length;
      }
      return categories.filter(c => {
        if (c.isAllDay) return true;
        const mpIds = (c.mealPeriodIds || []).map(id => String(id?._id || id));
        if (mpIds.length === 0) return true;
        return mpIds.includes(mpId);
      }).length;
    };
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Filter by meal type:</span>
        <button
          onClick={() => setMealPeriodFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            mealPeriodFilter === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary"
          }`}
        >
          All ({countFor(null)})
        </button>
        {mealPeriods.map(mp => {
          const count = countFor(mp);
          const isSelected = String(mealPeriodFilter) === String(mp._id);
          const isAllDay = isAllDayMealPeriod(mp);
          return (
            <button
              key={mp._id}
              onClick={() => setMealPeriodFilter(String(mp._id))}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                isSelected
                  ? isAllDay
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-primary text-primary-foreground border-primary"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary"
              }`}
            >
              {isAllDay && <CheckCircle2 className="size-3" />}
              {getDisplayName(mp, "en") || mp.name} ({count})
              {mp.startTime && mp.endTime && !isAllDay && (
                <span className="text-[10px] opacity-70">{mp.startTime}–{mp.endTime}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const renderCategories = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UtensilsCrossed className="size-5 text-primary" /> Categories
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage menu categories</p>
        </div>
        <div className="flex items-center gap-2">
          {filteredCategories.length > 1 && (
            <Button size="sm" variant="outline" onClick={() => setReorderMode(m => !m)}>
              {reorderMode ? "Done Reordering" : "Reorder"}
            </Button>
          )}
          <Button size="sm" onClick={openCreateCategory}><Plus className="size-4 mr-1" /> Add Category</Button>
        </div>
      </div>

      <div className="mb-3">
        {renderMealPeriodFilter()}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search categories..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      {isLoading && filteredCategories.length === 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : filteredCategories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <UtensilsCrossed className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {mealPeriodFilter === "all"
                ? "No categories yet. Create your first category to start building your menu."
                : "No categories match this meal type filter."}
            </p>
            <Button size="sm" className="mt-3" onClick={openCreateCategory}><Plus className="size-4 mr-1" /> Create Category</Button>
          </CardContent>
        </Card>
      ) : reorderMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
          <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filteredCategories
                .sort((a, b) => categoryIds.indexOf(a._id) - categoryIds.indexOf(b._id))
                .map(cat => (
                  <SortableItem key={cat._id} id={cat._id}>
                    <Card className="group hover:shadow-md transition-all ml-6">
                      <CardContent className="p-4 flex items-center gap-3">
                        <GripVertical className="size-4 text-muted-foreground cursor-grab flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">{cat.name}</h3>
                          {(cat.nameEn || cat.nameOm || cat.nameAm) && (
                            <p className="text-xs text-muted-foreground truncate">{[cat.nameEn, cat.nameOm, cat.nameAm].filter(Boolean).join(" / ")}</p>
                          )}
<div className="flex flex-wrap gap-1 mt-1">
                          {cat.isAllDay && (
                            <Badge variant="outline" className="text-[10px] py-0 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">All-Day</Badge>
                          )}
                          {(cat.mealPeriodIds || []).map(id => {
                            const mp = mealPeriods.find(m => m._id === id || m._id === id?._id);
                            return mp && mp.name !== "ALL_DAY" ? (
                              <Badge key={id} variant="outline" className="text-[10px] py-0">{mp.name}</Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Switch checked={cat.isActive !== false} onCheckedChange={() => toggleCategoryActive(cat)} className="data-[state=checked]:bg-green-600" />
                        <span className="text-xs text-muted-foreground w-12">{cat.isActive !== false ? "Active" : "Inactive"}</span>
                      </div>
                      </CardContent>
                    </Card>
                  </SortableItem>
                ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCategories.map(cat => {
            const itemCount = foodItems.filter(i => {
              const catId = typeof i.categoryId === "object" ? i.categoryId?._id : i.categoryId;
              return catId === cat._id;
            }).length;
            return (
              <Card
                key={cat._id}
                className={`cursor-pointer hover:shadow-md transition-all group ${!cat.isActive || cat.isHidden ? "opacity-60" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{cat.name}</h3>
                      {(cat.nameEn || cat.nameOm || cat.nameAm) && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{[cat.nameEn, cat.nameOm, cat.nameAm].filter(Boolean).join(" / ")}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                          {cat.isAllDay && (
                            <Badge variant="outline" className="text-[10px] py-0 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">All-Day</Badge>
                          )}
                          {(cat.mealPeriodIds || []).map(id => {
                            const mp = mealPeriods.find(m => m._id === id || m._id === id?._id);
                            return mp && mp.name !== "ALL_DAY" ? (
                              <Badge key={id} variant="outline" className="text-[10px] py-0">{mp.name}</Badge>
                            ) : null;
                          })}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-none">
                      <Button variant="ghost" size="icon-sm" onClick={e => { e.stopPropagation(); openEditCategory(cat); }} className="opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="size-3" /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={e => { e.stopPropagation(); handleDeleteCategory(cat); }} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="size-3 text-red-500" /></Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 gap-2">
                    <Badge variant="outline" className="text-xs">{itemCount} items</Badge>
                    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1" title="Active on menu">
                        <Switch checked={cat.isActive !== false} onCheckedChange={() => toggleCategoryActive(cat)} className="data-[state=checked]:bg-green-600 h-5 w-8" />
                        <span className="text-[10px] text-muted-foreground">{cat.isActive !== false ? "Active" : "Off"}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Force hide from customers">
                        <Switch checked={cat.isHidden || false} onCheckedChange={() => toggleCategoryHiddenAsync(cat._id)} className="data-[state=checked]:bg-red-600 h-5 w-8" />
                        <span className="text-[10px] text-muted-foreground">{cat.isHidden ? "Hidden" : "Hide"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

const renderItems = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UtensilsCrossed className="size-5 text-primary" /> {selectedCategory?.name || "Items & Pricing"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage items — tap price or description to edit inline</p>
        </div>
        <div className="flex items-center gap-2">
          {filteredItems.length > 1 && (
            <Button size="sm" variant="outline" onClick={() => setReorderMode(m => !m)}>
              {reorderMode ? "Done Reordering" : "Reorder"}
            </Button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="h-8 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-2 focus:ring-ring"
              title="Sort items"
            >
              <option value="name">Name (A–Z)</option>
              <option value="price">Price (Low–High)</option>
              <option value="category">Category</option>
            </select>
          </div>
          <Button size="sm" onClick={openCreateItem}><Plus className="size-4 mr-1" /> Add Item</Button>
        </div>
      </div>

      <div className="mb-3">
        {renderMealPeriodFilter()}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {activeTab === "items" && categories.length > 0 && (
          <select
            value={selectedCategory?._id || ""}
            onChange={e => {
              const cat = categories.find(c => c._id === e.target.value);
              setSelectedCategory(cat || null);
              setReorderMode(false);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        )}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        {activeTab !== "items" && (
          <Button variant="outline" size="sm" onClick={() => { setSelectedCategory(null); setSearchQuery(""); setReorderMode(false); }}>Back to Categories</Button>
        )}
      </div>

      {isLoading && filteredItems.length === 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : filteredItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <UtensilsCrossed className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">{selectedCategory ? "No food items in this category yet." : "No food items found."}</p>
            <Button size="sm" className="mt-3" onClick={openCreateItem}><Plus className="size-4 mr-1" /> Add First Item</Button>
          </CardContent>
        </Card>
      ) : reorderMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd}>
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filteredItems
                .sort((a, b) => itemIds.indexOf(a._id) - itemIds.indexOf(b._id))
                .map(item => (
                  <SortableItem key={item._id} id={item._id}>
                    <Card className="group hover:shadow-md transition-all ml-6">
                      <CardContent className="p-3 flex items-center gap-3">
                        <GripVertical className="size-4 text-muted-foreground cursor-grab flex-shrink-0" />
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.imageUrl ? <img src={item.imageUrl} className="h-full w-full object-cover" alt="" /> : <UtensilsCrossed className="text-muted-foreground size-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{item.name}</p>
                          <InlineDescEdit item={item} onSave={updateFoodItem} />
                          <div className="flex flex-wrap gap-1 mt-1">
                            {getItemMealTypeBadges(item).map((b, bi) => (
                              <span key={bi} className={`text-[9px] px-1.5 rounded-full border ${b.isAllDay ? "text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700" : "border-gray-200 dark:border-gray-700 text-muted-foreground"}`}>
                                {b.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <InlinePriceEdit item={item} onSave={updateFoodItem} />
                          <Switch checked={item.isAvailable !== false} onCheckedChange={() => toggleItemAvailability(item)} className="data-[state=checked]:bg-green-600" />
                          <Button size="icon-sm" variant="ghost" onClick={() => openEditItem(item)}><Pencil className="size-3" /></Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => handleDeleteItem(item)} className="text-red-500"><Trash2 className="size-3" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  </SortableItem>
                ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredItems.map(item => (
            <Card key={item._id} className={`hover:shadow-md transition-all ${!item.isActive ? "opacity-60" : ""}`}>
              <CardContent className="p-3">
                <div className="h-24 mb-2 rounded bg-muted flex items-center justify-center overflow-hidden relative">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} className="h-full w-full object-cover" alt={item.name} />
                  ) : (
                    <UtensilsCrossed className="text-muted-foreground size-8" />
                  )}
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">Sold Out</span>
                    </div>
                  )}
                  {(item.tags || []).length > 0 && (
                    <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1">
                      {item.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} className="text-[9px] py-0 px-1.5 bg-black/60 text-white border-0">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-sm truncate">{item.name}</h3>
                <InlineDescEdit item={item} onSave={updateFoodItem} />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {getItemMealTypeBadges(item).map((b, bi) => (
                    <Badge key={bi} variant="outline" className={`text-[9px] py-0 px-1.5 ${b.isAllDay ? "text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700" : ""}`}>
                      {b.name}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 gap-1">
                  <InlinePriceEdit item={item} onSave={updateFoodItem} />
                  <div className="flex items-center gap-1" title="In Stock / Sold Out">
                    <Switch checked={item.isAvailable !== false} onCheckedChange={() => toggleItemAvailability(item)} className="data-[state=checked]:bg-green-600 h-5 w-8" />
                    <span className="text-[9px] text-muted-foreground w-8">{item.isAvailable !== false ? "Stock" : "Sold"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1.5 gap-1">
                  <div className="flex items-center gap-1" title="Force Hide">
                    <Switch checked={item.isHidden || false} onCheckedChange={() => toggleItemHiddenAsync(item._id)} className="data-[state=checked]:bg-red-600 h-5 w-8" />
                    <span className="text-[9px] text-muted-foreground w-8">{item.isHidden ? "Hidden" : "Hide"}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Featured">
                    <Switch checked={item.isFeatured || false} onCheckedChange={() => toggleItemFeaturedAsync(item._id)} className="data-[state=checked]:bg-amber-500 h-5 w-8" />
                    <span className="text-[9px] text-muted-foreground w-8">{item.isFeatured ? "★" : "—"}</span>
                  </div>
                </div>
                <div className="flex gap-1 mt-2">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => openEditItem(item)}><Pencil className="size-3 mr-1" /> Edit</Button>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteItem(item)}><Trash2 className="size-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          {[
            { key: "meal-types", label: "Meal Types", icon: LayoutGrid },
            { key: "categories", label: "Categories", icon: UtensilsCrossed },
            { key: "items", label: "Items & Pricing", icon: Tag },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSelectedCategory(null); setSearchQuery(""); setReorderMode(false); }}
                className={`flex items-center gap-2 px-1 py-2.5 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "meal-types" && renderMealTypes()}
      {activeTab === "items" && renderItems()}
      {activeTab === "categories" && (
        selectedCategory ? renderItems() : renderCategories()
      )}

      <MealTypeDialog
        open={mealTypeOpen}
        onOpenChange={setMealTypeOpen}
        editing={editingMealType}
        form={mealTypeForm}
        setForm={setMealTypeForm}
        onSave={handleSaveMealType}
      />

      <CategoryDialog
        open={catOpen}
        onOpenChange={setCatOpen}
        form={catForm}
        setForm={setCatForm}
        onSave={saveCat}
        editing={editing}
        mealPeriods={mealPeriods}
      />

      <ItemDialog
        open={itemOpen}
        onOpenChange={setItemOpen}
        form={itemForm}
        setForm={setItemForm}
        onSave={saveItem}
        editing={editing}
        categories={categories}
        mealPeriods={mealPeriods}
      />
    </div>
  );
};

export default MenuManager;
