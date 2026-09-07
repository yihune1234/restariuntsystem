import React, { useEffect, useState } from "react";
import axiosInstance from "@/axios/axiosInstace";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, FolderTree, Check, Clock, CornerDownRight } from "lucide-react";

const CategoriesPage = ({ onRefresh }) => {
  const [categories, setCategories] = useState([]);
  const [mealPeriods, setMealPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/categories");
      setCategories(res.data?.data || []);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const fetchMealPeriods = async () => {
    try {
      const res = await axiosInstance.get("/meal-periods");
      setMealPeriods(res.data?.data || []);
    } catch {
      // Meal periods may not exist yet
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchMealPeriods();
  }, []);

  const toggleActive = async (cat, newValue) => {
    try {
      await axiosInstance.patch(`/categories/${cat._id}`, { isActive: newValue });
      setCategories((prev) => prev.map((c) => (c._id === cat._id ? { ...c, isActive: newValue } : c)));
      onRefresh();
      toast.success(`"${cat.nameEn || cat.name}" is now ${newValue ? "active" : "inactive"}`);
    } catch (e) {
      toast.error(e.backendMessage || "Failed to update");
    }
  };

  const moveCategory = async (cat, direction) => {
    const idx = categories.findIndex((c) => c._id === cat._id);
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= categories.length) return;

    const newCategories = [...categories];
    const tempOrder = newCategories[idx].displayOrder;
    newCategories[idx].displayOrder = newCategories[newCategories[newIdx]._id].displayOrder;
    newCategories[newIdx].displayOrder = tempOrder;
    setCategories(newCategories);

    try {
      await axiosInstance.patch("/categories/reorder", {
        orders: [
          { id: newCategories[idx]._id, displayOrder: newCategories[idx].displayOrder },
          { id: newCategories[newIdx]._id, displayOrder: newCategories[newIdx].displayOrder },
        ],
      });
      onRefresh();
      toast.success("Categories reordered");
    } catch {
      toast.error("Failed to reorder");
      fetchCategories();
    }
  };

  const deleteCategory = async (catId) => {
    try {
      await axiosInstance.delete(`/categories/${catId}`);
      setCategories((prev) => prev.filter((c) => c._id !== catId));
      onRefresh();
      toast.success("Category deleted");
    } catch (e) {
      toast.error(e.backendMessage || "Failed to delete");
    }
  };

  const rootCategories = categories.filter((c) => !c.parentId);
  const childCategories = categories.filter((c) => c.parentId);
  const activeCount = categories.filter((c) => c.isActive).length;

  return (
    <div className="p-4 pb-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Categories</h1>
          <p className="text-xs text-gray-500">{activeCount} of {categories.length} active</p>
        </div>
        <Button
          onClick={() => { setEditingCategory(null); setDialogOpen(true); }}
          className="bg-amber-600 hover:bg-amber-700 h-9 text-xs sm:text-sm w-full sm:w-auto"
        >
          <Plus className="size-4 mr-1.5" />
          Add Category
        </Button>
      </div>

      {/* Categories List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[1,2,3,4].map((i) => (
              <div key={i} className="p-3 flex items-center gap-3">
                <div className="size-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <FolderTree className="size-6 text-gray-400" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-1">No categories yet</h3>
            <p className="text-xs text-gray-500 mb-4">Create your first category to organize your menu</p>
            <Button onClick={() => { setEditingCategory(null); setDialogOpen(true); }} className="bg-amber-600 hover:bg-amber-700 h-9 text-sm">
              <Plus className="size-4 mr-1.5" />
              Add Category
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {rootCategories.map((cat, idx) => (
              <React.Fragment key={cat._id}>
                <CategoryRow
                  cat={cat}
                  idx={idx}
                  totalCount={rootCategories.length}
                  onEdit={() => { setEditingCategory(cat); setDialogOpen(true); }}
                  onDelete={() => { if (confirm(`Delete "${cat.nameEn || cat.name}"?`)) deleteCategory(cat._id); }}
                  onToggleActive={(v) => toggleActive(cat, v)}
                  onMove={(dir) => moveCategory(cat, dir)}
                />
                {childCategories
                  .filter((child) => child.parentId === cat._id)
                  .map((child, childIdx) => (
                    <CategoryRow
                      key={child._id}
                      cat={child}
                      idx={childIdx}
                      totalCount={childCategories.filter((c) => c.parentId === cat._id).length}
                      isChild
                      parentName={cat.nameEn || cat.name}
                      onEdit={() => { setEditingCategory(child); setDialogOpen(true); }}
                      onDelete={() => { if (confirm(`Delete "${child.nameEn || child.name}"?`)) deleteCategory(child._id); }}
                      onToggleActive={(v) => toggleActive(child, v)}
                      onMove={(dir) => moveCategory(child, dir)}
                    />
                  ))}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <CategoryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        category={editingCategory}
        categories={categories}
        mealPeriods={mealPeriods}
        onSave={() => {
          setDialogOpen(false);
          onRefresh();
          fetchCategories();
        }}
      />
    </div>
  );
};

const CategoryRow = ({ cat, idx, totalCount, isChild, parentName, onEdit, onDelete, onToggleActive, onMove }) => (
  <div
    className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${!cat.isActive ? "opacity-50" : ""} ${isChild ? "pl-10 sm:pl-14" : ""}`}
  >
    <div className="flex items-start gap-3">
      {/* Order Controls */}
      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
        <button
          onClick={() => onMove("up")}
          disabled={idx === 0}
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronUp className="size-4" />
        </button>
        <span className="text-xs font-medium text-gray-500 w-5 text-center">{cat.displayOrder || 0}</span>
        <button
          onClick={() => onMove("down")}
          disabled={idx === totalCount - 1}
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      {/* Category Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isChild && <CornerDownRight className="size-3 text-gray-400 flex-shrink-0" />}
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
            {cat.nameEn || cat.name || "Unnamed"}
          </h3>
          {cat.isActive && <Check className="size-3 text-green-500 flex-shrink-0" />}
          {!cat.isActive && (
            <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-500">Inactive</span>
          )}
          {cat.mealScheduleIds && cat.mealScheduleIds.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded flex items-center gap-1">
              <Clock className="size-3" />
              {cat.mealScheduleIds.length} schedule{cat.mealScheduleIds.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {(cat.nameOm || cat.nameAm) && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500">
            {cat.nameOm && <span>OM: {cat.nameOm}</span>}
            {cat.nameAm && <span>AM: {cat.nameAm}</span>}
          </div>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-400">
          {(cat.mealScheduleIds || []).map((ms, i) => (
            <span key={ms._id || ms || i}>
              {ms.name || ms.nameEn || ""} ({ms.startTime} - {ms.endTime})
            </span>
          ))}
          {cat.parentId && !isChild && (
            <span>Parent: {parentName}</span>
          )}
        </div>
      </div>

      {/* Right Side: Toggle & Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Switch
          checked={cat.isActive}
          onCheckedChange={onToggleActive}
          className="scale-90"
        />
        <button
          onClick={onEdit}
          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
          title="Edit"
        >
          <Edit className="size-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          title="Delete"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  </div>
);

const CategoryDialog = ({ open, onClose, category, categories, mealPeriods, onSave }) => {
  const [form, setForm] = useState({
    nameEn: "",
    nameOm: "",
    nameAm: "",
    parentId: "",
    mealScheduleIds: [],
    displayOrder: 0,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const parentOptions = categories.filter((c) => !c.parentId && c._id !== category?._id);

  useEffect(() => {
    if (category) {
      setForm({
        nameEn: category.nameEn || category.name || "",
        nameOm: category.nameOm || "",
        nameAm: category.nameAm || "",
        parentId: category.parentId || "",
        mealScheduleIds: (category.mealScheduleIds || []).map((ms) => ms._id || ms),
        displayOrder: category.displayOrder || 0,
        isActive: category.isActive !== false,
      });
    } else {
      setForm({
        nameEn: "",
        nameOm: "",
        nameAm: "",
        parentId: "",
        mealScheduleIds: [],
        displayOrder: 0,
        isActive: true,
      });
    }
  }, [category, open]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nameEn.trim()) { toast.error("English name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.nameEn,
        nameEn: form.nameEn,
        nameOm: form.nameOm,
        nameAm: form.nameAm,
        parentId: form.parentId || null,
        mealScheduleIds: form.mealScheduleIds,
        displayOrder: Number(form.displayOrder) || 0,
        isActive: form.isActive,
      };
      if (category) {
        await axiosInstance.patch(`/categories/${category._id}`, payload);
        toast.success("Category updated");
      } else {
        await axiosInstance.post("/categories", payload);
        toast.success("Category created");
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
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{category ? "Edit Category" : "Add New Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Name (English) *</label>
            <Input
              value={form.nameEn}
              onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
              placeholder="e.g. Hot Drinks"
              className="h-9"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Name (Oromoo)</label>
            <Input
              value={form.nameOm}
              onChange={(e) => setForm((f) => ({ ...f, nameOm: e.target.value }))}
              placeholder="e.g. Dhugaatii Ho'aa"
              className="h-9"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Name (Amharic)</label>
            <Input
              value={form.nameAm}
              onChange={(e) => setForm((f) => ({ ...f, nameAm: e.target.value }))}
              placeholder="e.g. ትኩስ ነገር"
              className="h-9"
            />
          </div>

          {/* Parent Category */}
          <div>
            <label className="block text-xs font-medium mb-1">Parent Category</label>
            <select
              value={form.parentId}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            >
              <option value="">None (Root Category)</option>
              {parentOptions.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.nameEn || cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Meal Schedules (many-to-many) */}
          <div>
            <label className="block text-xs font-medium mb-1">
              Meal Schedules <span className="text-gray-400">(empty = always available via items)</span>
            </label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
              {mealPeriods.length === 0 ? (
                <p className="text-xs text-gray-400 px-2 py-1">No meal schedules yet</p>
              ) : (
                mealPeriods.map((mp) => {
                  const checked = form.mealScheduleIds.includes(mp._id);
                  return (
                    <label
                      key={mp._id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMealSchedule(mp._id)}
                        className="accent-amber-600"
                      />
                      <span className="flex-1">{mp.nameEn || mp.name}</span>
                      <span className="text-xs text-gray-400">{mp.startTime} - {mp.endTime}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs">Order</label>
              <Input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
                className="w-16 h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <span className="text-xs sm:text-sm">Active</span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto h-9 text-sm">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 h-9 text-sm">
              {saving ? "Saving..." : (category ? "Update" : "Add Category")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoriesPage;
