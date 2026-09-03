import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/useAuthStore";
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
  Plus, Trash2, Pencil, UtensilsCrossed, Clock, Layers,
  ChevronRight, ChevronUp, ChevronDown, Search,
  Package,
} from "lucide-react";
import { MealTypeDialog, CategoryDialog, ItemDialog } from "./MenuDialogs";

/**
 * Manager / Owner Menu Management UI with proper hierarchical structure:
 * Meal Type (Level 1) → Category (Level 2) → Food Items (Level 3)
 *
 * The UI follows the strict backend hierarchy:
 * 1. Select Meal Type (e.g., Hot Drinks, Foods, Snacks & Fast Food)
 * 2. Select Category within that Meal Type (e.g., Tea, Coffee, Burgers)
 * 3. Manage Food Items within that Category
 *
 * Features:
 * - Quick availability toggle (ON/OFF) without opening edit dialog
 * - Quick active/inactive toggle
 * - Edit and delete actions
 * - Proper parent-child context inheritance
 * - Clean, professional management UI
 */
const MenuManager = ({ externalBranchId }) => {
  const { authUser } = useAuthStore();
  const branchId = externalBranchId || authUser?.branchId?._id || authUser?.branchId;
  const { t } = useTranslation();

  const {
    menu, category, mealTypes, isLoading,
    getMealPeriodsByBranch, getCategoriesByBranch, getFoodItemsByBranch,
    createMealPeriod, updateMealPeriod, deleteMealPeriod,
    createCategory, updateCategory, deleteCategory,
    createFoodItem, updateFoodItem, deleteFoodItem,
    uploadFoodImage,
  } = useMenuStore();

  const [selectedMealType, setSelectedMealType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [mealOpen, setMealOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mealForm, setMealForm] = useState({
    name: "", nameEn: "", nameOm: "", nameAm: "", startTime: "06:30", endTime: "22:00", displayOrder: 0, isActive: true,
  });
  const [catForm, setCatForm] = useState({
    name: "", nameEn: "", nameOm: "", nameAm: "", mealPeriodId: "", displayOrder: 0,
  });
  const [itemForm, setItemForm] = useState({
    name: "", nameEn: "", nameOm: "", nameAm: "",
    description: "", descriptionEn: "", descriptionOm: "", descriptionAm: "",
    price: 0, categoryId: "", isAvailable: true, preparationTimeMinutes: 15, displayOrder: 0,
  });

  // Filtered data based on selection
  const filteredCategories = useMemo(() => {
    if (!selectedMealType) return [];
    return category.filter(c =>
      (c.mealPeriodId?._id || c.mealPeriodId) === selectedMealType._id
    );
  }, [category, selectedMealType]);

  const filteredItems = useMemo(() => {
    if (!selectedCategory) return [];
    let items = menu.filter(i =>
      (i.categoryId?._id || i.categoryId) === selectedCategory._id
    );
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i =>
        (i.name || "").toLowerCase().includes(q) ||
        (i.description || "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [menu, selectedCategory, searchQuery]);

  // Load meal types on mount
  useEffect(() => {
    if (!branchId) return;
    getMealPeriodsByBranch(branchId);
  }, [branchId, getMealPeriodsByBranch]);

  // Load categories when meal type is selected
  useEffect(() => {
    if (!branchId || !selectedMealType) return;
    getCategoriesByBranch(branchId, { mealPeriodId: selectedMealType._id });
    setSelectedCategory(null);
    setSearchQuery("");
  }, [branchId, selectedMealType, getCategoriesByBranch]);

  // Load food items when category is selected
  useEffect(() => {
    if (!branchId || !selectedCategory) return;
    getFoodItemsByBranch(branchId, { categoryId: selectedCategory._id });
    setSearchQuery("");
  }, [branchId, selectedCategory, getFoodItemsByBranch]);

  // --- Save handlers ---
  const saveMeal = async () => {
    if (!mealForm.name || !branchId) return toast.error("Meal type name required");
    const fn = editing ? updateMealPeriod : createMealPeriod;
    const payload = {
      name: mealForm.name,
      nameEn: mealForm.nameEn,
      nameOm: mealForm.nameOm,
      nameAm: mealForm.nameAm,
      startTime: mealForm.startTime,
      endTime: mealForm.endTime,
      displayOrder: mealForm.displayOrder || 0,
      isActive: mealForm.isActive !== false,
    };
    const res = await fn(editing || branchId, payload);
    if (res.success) {
      setMealOpen(false);
      setEditing(null);
      await getMealPeriodsByBranch(branchId);
      if (!editing && res.data?._id) {
        // Auto-drill into the newly created meal type so the manager
        // immediately sees its "Create Category" area.
        setSelectedMealType(res.data);
        setSelectedCategory(null);
      }
    }
  };

  const saveCat = async () => {
    if (!catForm.name || !catForm.mealPeriodId || !branchId) return toast.error("Name & meal type required");
    const fn = editing ? updateCategory : createCategory;
    const payload = {
      name: catForm.name,
      nameEn: catForm.nameEn,
      nameOm: catForm.nameOm,
      nameAm: catForm.nameAm,
      mealPeriodId: catForm.mealPeriodId,
      displayOrder: catForm.displayOrder || 0,
    };
    const res = await fn(editing || branchId, payload);
    if (res.success) {
      setCatOpen(false);
      setEditing(null);
      if (selectedMealType) {
        getCategoriesByBranch(branchId, { mealPeriodId: selectedMealType._id });
      }
    }
  };

  const saveItem = async (imageFile) => {
    if (!itemForm.name || !itemForm.categoryId || !branchId) return toast.error("Name & category required");
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
      preparationTimeMinutes: itemForm.preparationTimeMinutes || 15,
      displayOrder: itemForm.displayOrder || 0,
    };
    const res = await fn(editing || branchId, payload);
    if (res.success) {
      if (imageFile && res.data?._id) {
        await uploadFoodImage(res.data._id, imageFile);
      }
      setItemOpen(false);
      setEditing(null);
      if (selectedCategory) {
        getFoodItemsByBranch(branchId, { categoryId: selectedCategory._id });
      }
    }
  };

  // --- Quick toggle handlers ---
  const toggleMealTypeActive = async (mp) => {
    await updateMealPeriod(mp._id, { isActive: !mp.isActive });
    getMealPeriodsByBranch(branchId);
  };

  const toggleCategoryActive = async (cat) => {
    await updateCategory(cat._id, { isActive: !cat.isActive });
    if (selectedMealType) {
      getCategoriesByBranch(branchId, { mealPeriodId: selectedMealType._id });
    }
  };

  const toggleItemAvailability = async (item) => {
    await updateFoodItem(item._id, { isAvailable: !item.isAvailable });
    if (selectedCategory) {
      getFoodItemsByBranch(branchId, { categoryId: selectedCategory._id });
    }
  };

  const toggleItemActive = async (item) => {
    await updateFoodItem(item._id, { isActive: !item.isActive });
    if (selectedCategory) {
      getFoodItemsByBranch(branchId, { categoryId: selectedCategory._id });
    }
  };

  const handleDeleteMealType = async (mp) => {
    if (!confirm(`Delete meal type "${mp.name}"? This will also affect its categories.`)) return;
    await deleteMealPeriod(mp._id);
    if (selectedMealType?._id === mp._id) {
      setSelectedMealType(null);
      setSelectedCategory(null);
    }
    getMealPeriodsByBranch(branchId);
  };

  const handleDeleteCategory = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    await deleteCategory(cat._id);
    if (selectedCategory?._id === cat._id) {
      setSelectedCategory(null);
    }
    if (selectedMealType) {
      getCategoriesByBranch(branchId, { mealPeriodId: selectedMealType._id });
    }
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await deleteFoodItem(item._id);
    if (selectedCategory) {
      getFoodItemsByBranch(branchId, { categoryId: selectedCategory._id });
    }
  };

  // --- Reorder (reassign sequential displayOrder to preserve current visual order) ---
  const reorderList = async (orderedIds, updateFn, reloadFn) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await updateFn(orderedIds[i], { displayOrder: i + 1 });
    }
    reloadFn?.();
  };

  const moveSibling = (list, index, direction, updateFn, reloadFn) => {
    const target = index + direction;
    if (!list[target]) return;
    const reordered = [...list];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    reorderList(
      reordered.map((x) => x._id),
      updateFn,
      reloadFn
    );
  };

  const moveMealType = (index, direction) =>
    moveSibling(mealTypes, index, direction, updateMealPeriod, () => getMealPeriodsByBranch(branchId));

  const moveCategory = (index, direction) =>
    moveSibling(
      filteredCategories,
      index,
      direction,
      updateCategory,
      () => selectedMealType && getCategoriesByBranch(branchId, { mealPeriodId: selectedMealType._id })
    );

  const moveItem = (index, direction) =>
    moveSibling(
      filteredItems,
      index,
      direction,
      updateFoodItem,
      () => selectedCategory && getFoodItemsByBranch(branchId, { categoryId: selectedCategory._id })
    );

  // --- Open edit dialogs ---
  const openEditMeal = (mp) => {
    setEditing(mp._id);
    setMealForm({
      name: mp.name,
      nameEn: mp.nameEn || "",
      nameOm: mp.nameOm || "",
      nameAm: mp.nameAm || "",
      startTime: mp.startTime,
      endTime: mp.endTime,
      displayOrder: mp.displayOrder || 0,
      isActive: mp.isActive !== false,
    });
    setMealOpen(true);
  };

  const openEditCategory = (cat) => {
    setEditing(cat._id);
    setCatForm({
      name: cat.name,
      nameEn: cat.nameEn || "",
      nameOm: cat.nameOm || "",
      nameAm: cat.nameAm || "",
      mealPeriodId: cat.mealPeriodId?._id || cat.mealPeriodId,
      displayOrder: cat.displayOrder || 0,
    });
    setCatOpen(true);
  };

  const openEditItem = (item) => {
    setEditing(item._id);
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
      categoryId: item.categoryId?._id || item.categoryId,
      isAvailable: item.isAvailable !== false,
      preparationTimeMinutes: item.preparationTimeMinutes || 15,
      displayOrder: item.displayOrder || 0,
    });
    setItemOpen(true);
  };

  const openCreateMeal = () => {
    setEditing(null);
    setMealForm({ name: "", nameEn: "", nameOm: "", nameAm: "", startTime: "06:30", endTime: "22:00", displayOrder: 0, isActive: true });
    setMealOpen(true);
  };

  const openCreateCategory = () => {
    setEditing(null);
    setCatForm({
      name: "", nameEn: "", nameOm: "", nameAm: "",
      mealPeriodId: selectedMealType?._id || "",
      displayOrder: 0,
    });
    setCatOpen(true);
  };

  const openCreateItem = () => {
    setEditing(null);
    setItemForm({
      name: "", nameEn: "", nameOm: "", nameAm: "",
      description: "", descriptionEn: "", descriptionOm: "", descriptionAm: "",
      price: 0, categoryId: selectedCategory?._id || "",
      isAvailable: true, preparationTimeMinutes: 15, displayOrder: 0,
    });
    setItemOpen(true);
  };

  if (!branchId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You are not assigned to a branch yet.</p>
      </div>
    );
  }

  // --- Breadcrumb ---
  const Breadcrumb = () => (
    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <button onClick={() => { setSelectedMealType(null); setSelectedCategory(null); }} className="hover:text-foreground transition-colors">
        {t('manager.mealTypes')}
      </button>
      {selectedMealType && (
        <>
          <ChevronRight className="size-3" />
          <button onClick={() => setSelectedCategory(null)} className="hover:text-foreground transition-colors font-medium text-foreground">
            {selectedMealType.name}
          </button>
        </>
      )}
      {selectedCategory && (
        <>
          <ChevronRight className="size-3" />
          <span className="font-medium text-foreground">{selectedCategory.name}</span>
        </>
      )}
    </div>
  );

  // --- Level 1: Meal Types ---
  const renderMealTypes = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Layers className="size-5 text-primary" /> {t('manager.mealTypes')}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('manager.menuHierarchy')}
          </p>
        </div>
        <Button size="sm" onClick={openCreateMeal}>
          <Plus className="size-4 mr-1" /> {t('manager.addMealType')}
        </Button>
      </div>

      {isLoading && mealTypes.length === 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : mealTypes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <UtensilsCrossed className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No meal types yet. Create your first meal type to start building your menu.</p>
            <Button size="sm" className="mt-3" onClick={openCreateMeal}>
              <Plus className="size-4 mr-1" /> Create Meal Type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {mealTypes.map((m) => (
            <Card
              key={m._id}
              className={`cursor-pointer hover:shadow-md transition-all duration-200 group ${
                !m.isActive ? "opacity-60" : ""
              }`}
              onClick={() => setSelectedMealType(m)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{m.name}</h3>
                    {(m.nameEn || m.nameOm || m.nameAm) && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {[m.nameEn, m.nameOm, m.nameAm].filter(Boolean).join(" / ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-none">
                    <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); moveMealType(mealTypes.indexOf(m), -1); }} disabled={mealTypes.indexOf(m) === 0}>
                      <ChevronUp className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); moveMealType(mealTypes.indexOf(m), 1); }} disabled={mealTypes.indexOf(m) === mealTypes.length - 1}>
                      <ChevronDown className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); openEditMeal(m); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleDeleteMealType(m); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="size-3 text-red-500" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Clock className="size-3 mr-1" />
                      {m.startTime}–{m.endTime}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {filteredCategories.filter(c => (c.mealPeriodId?._id || c.mealPeriodId) === m._id).length || category.filter(c => (c.mealPeriodId?._id || c.mealPeriodId) === m._id).length} categories
                    </span>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={m.isActive !== false}
                      onCheckedChange={() => toggleMealTypeActive(m)}
                      className="data-[state=checked]:bg-green-600"
                    />
                    <span className="text-xs text-muted-foreground w-12">
                      {m.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // --- Level 2: Categories ---
  const renderCategories = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Layers className="size-5 text-primary" /> Categories in {selectedMealType.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select a category to manage its food items
          </p>
        </div>
        <Button size="sm" onClick={openCreateCategory}>
          <Plus className="size-4 mr-1" /> {t('manager.addCategory')}
        </Button>
      </div>

      {isLoading && filteredCategories.length === 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Layers className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No categories in {selectedMealType.name} yet.</p>
            <Button size="sm" className="mt-3" onClick={openCreateCategory}>
              <Plus className="size-4 mr-1" /> Add Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCategories.map((c) => {
            const itemCount = menu.filter(i => (i.categoryId?._id || i.categoryId) === c._id).length;
            return (
              <Card
                key={c._id}
                className={`cursor-pointer hover:shadow-md transition-all duration-200 group ${
                  !c.isActive ? "opacity-60" : ""
                }`}
                onClick={() => setSelectedCategory(c)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{c.name}</h3>
                      {(c.nameEn || c.nameOm || c.nameAm) && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {[c.nameEn, c.nameOm, c.nameAm].filter(Boolean).join(" / ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-none">
                      <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); moveCategory(filteredCategories.indexOf(c), -1); }} disabled={filteredCategories.indexOf(c) === 0}>
                        <ChevronUp className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); moveCategory(filteredCategories.indexOf(c), 1); }} disabled={filteredCategories.indexOf(c) === filteredCategories.length - 1}>
                        <ChevronDown className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); openEditCategory(c); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleDeleteCategory(c); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="size-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">{itemCount} items</span>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={c.isActive !== false}
                        onCheckedChange={() => toggleCategoryActive(c)}
                        className="data-[state=checked]:bg-green-600"
                      />
                      <span className="text-xs text-muted-foreground w-12">
                        {c.isActive !== false ? "Active" : "Inactive"}
                      </span>
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

  // --- Level 3: Food Items ---
  const renderFoodItems = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Package className="size-5 text-primary" /> Food Items in {selectedCategory.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage availability, prices, and details
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 w-48 text-sm"
            />
          </div>
          <Button size="sm" onClick={openCreateItem}>
            <Plus className="size-4 mr-1" /> {t('manager.addFoodItem')}
          </Button>
        </div>
      </div>

      {isLoading && filteredItems.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <UtensilsCrossed className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {searchQuery ? "No items match your search." : "No food items in this category yet."}
            </p>
            {!searchQuery && (
              <Button size="sm" className="mt-3" onClick={openCreateItem}>
                <Plus className="size-4 mr-1" /> Add Food Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-[1fr_100px_70px_80px_80px_90px_90px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground">
            <span>Food Item</span>
            <span className="text-right">Price</span>
            <span className="text-center">Order</span>
            <span className="text-center">Available</span>
            <span className="text-center">Active</span>
            <span className="text-center">Prep Time</span>
            <span className="text-center">Actions</span>
          </div>

          {filteredItems.map((it) => (
            <Card key={it._id} className={`transition-all ${!it.isActive ? "opacity-60" : ""}`}>
              <CardContent className="p-3">
                {/* Desktop layout */}
                <div className="hidden md:grid md:grid-cols-[1fr_100px_70px_80px_80px_90px_90px] gap-2 items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-lg bg-muted flex-none overflow-hidden">
                      {it.imageUrl ? (
                        <img src={it.imageUrl} className="w-full h-full object-cover" alt={it.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UtensilsCrossed className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{it.name}</p>
                      {(it.nameEn || it.nameOm || it.nameAm) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[it.nameEn, it.nameOm, it.nameAm].filter(Boolean).join(" / ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary">
                      {Number(it.price || 0).toLocaleString()} ETB
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <button
                      onClick={() => moveItem(filteredItems.indexOf(it), -1)}
                      disabled={filteredItems.indexOf(it) === 0}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <span className="text-[11px] font-mono text-muted-foreground">{it.displayOrder ?? 0}</span>
                    <button
                      onClick={() => moveItem(filteredItems.indexOf(it), 1)}
                      disabled={filteredItems.indexOf(it) === filteredItems.length - 1}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={it.isAvailable !== false}
                      onCheckedChange={() => toggleItemAvailability(it)}
                      className="data-[state=checked]:bg-green-600"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={it.isActive !== false}
                      onCheckedChange={() => toggleItemActive(it)}
                      className="data-[state=checked]:bg-green-600"
                    />
                  </div>
                  <div className="text-center text-xs text-muted-foreground">
                    {it.preparationTimeMinutes || 15} min
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditItem(it)}>
                      <Pencil className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteItem(it)}>
                      <Trash2 className="size-3 text-red-500" />
                    </Button>
                  </div>
                </div>

                {/* Mobile layout */}
                <div className="md:hidden space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-muted flex-none overflow-hidden">
                      {it.imageUrl ? (
                        <img src={it.imageUrl} className="w-full h-full object-cover" alt={it.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UtensilsCrossed className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{it.name}</p>
                      <p className="text-sm font-bold text-primary">
                        {Number(it.price || 0).toLocaleString()} ETB
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 flex-none">
                      <button
                        onClick={() => moveItem(filteredItems.indexOf(it), -1)}
                        disabled={filteredItems.indexOf(it) === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ChevronUp className="size-4" />
                      </button>
                      <button
                        onClick={() => moveItem(filteredItems.indexOf(it), 1)}
                        disabled={filteredItems.indexOf(it) === filteredItems.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 flex-none">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditItem(it)}>
                        <Pencil className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteItem(it)}>
                        <Trash2 className="size-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pl-15">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Available</span>
                        <Switch
                          checked={it.isAvailable !== false}
                          onCheckedChange={() => toggleItemAvailability(it)}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Active</span>
                        <Switch
                          checked={it.isActive !== false}
                          onCheckedChange={() => toggleItemActive(it)}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{it.preparationTimeMinutes || 15} min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="size-5" /> {t('manager.menuManagement')}
          </h1>
        </div>
      </div>

      <Breadcrumb />

      {/* Level rendering */}
      {!selectedMealType && renderMealTypes()}
      {selectedMealType && !selectedCategory && renderCategories()}
      {selectedCategory && renderFoodItems()}

      {/* Dialogs */}
      {mealOpen && (
        <MealTypeDialog
          open={mealOpen}
          onOpenChange={setMealOpen}
          editing={editing}
          form={mealForm}
          setForm={setMealForm}
          onSave={saveMeal}
        />
      )}
      {catOpen && (
        <CategoryDialog
          open={catOpen}
          onOpenChange={setCatOpen}
          editing={editing}
          form={catForm}
          setForm={setCatForm}
          mealTypes={mealTypes}
          selectedMealType={selectedMealType}
          onSave={saveCat}
        />
      )}
      {itemOpen && (
        <ItemDialog
          open={itemOpen}
          onOpenChange={setItemOpen}
          editing={editing}
          form={itemForm}
          setForm={setItemForm}
          categories={category}
          selectedMealType={selectedMealType}
          onSave={saveItem}
        />
      )}
    </div>
  );
};

export default MenuManager;
