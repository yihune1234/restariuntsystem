import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Globe, ImagePlus, X, Clock, UtensilsCrossed } from "lucide-react";

const LangSection = ({ open, onToggle, children }) => (
  <div className="border rounded-lg overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
    >
      <span className="flex items-center gap-1.5"><Globe className="size-3" /> Translations (Optional)</span>
      {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
    </button>
    {open && <div className="px-3 pb-3 space-y-2 border-t">{children}</div>}
  </div>
);

export const MealTypeDialog = ({ open, onOpenChange, editing, form, setForm, onSave }) => {
  const [showLang, setShowLang] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Meal Type" : "Create Meal Type"}</DialogTitle>
          <DialogDescription>
            Meal types organize your menu by time of day (e.g., Breakfast, Lunch, Dinner, All-Day).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium">Meal Type Name *</Label>
            <Input
              placeholder="e.g. BREAKFAST"
              value={form.name || ""}
              onChange={e => setForm({ ...form, name: e.target.value.toUpperCase() })}
              className="mt-1"
            />
          </div>
          <LangSection open={showLang} onToggle={() => setShowLang(s => !s)}>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-medium">English</Label>
                <Input placeholder="e.g. Breakfast" value={form.nameEn || ""} onChange={e => setForm({ ...form, nameEn: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Afaan Oromo</Label>
                <Input placeholder="e.g. Naga" value={form.nameOm || ""} onChange={e => setForm({ ...form, nameOm: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Amharic</Label>
                <Input placeholder="e.g. እዋና" value={form.nameAm || ""} onChange={e => setForm({ ...form, nameAm: e.target.value })} className="mt-1" />
              </div>
            </div>
          </LangSection>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-medium flex items-center gap-1"><Clock className="size-3" /> Start Time</Label>
              <Input type="time" value={form.startTime || ""} onChange={e => setForm({ ...form, startTime: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium flex items-center gap-1"><Clock className="size-3" /> End Time</Label>
              <Input type="time" value={form.endTime || ""} onChange={e => setForm({ ...form, endTime: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Display Order</Label>
            <Input type="number" min="0" value={form.displayOrder || 0} onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })} className="mt-1" />
          </div>
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
            <Label className="text-sm">Active</Label>
            <Switch checked={form.isActive !== false} onCheckedChange={val => setForm({ ...form, isActive: val })} className="data-[state=checked]:bg-green-600" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>{editing ? "Update" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const CategoryDialog = ({ open, onOpenChange, editing, form, setForm, mealPeriods = [], onSave }) => {
  const [showLang, setShowLang] = useState(false);

  const selectedIds = form.mealPeriodIds || [];

  const isAllDay = (mp) => mp.name === "ALL_DAY" || (mp.nameEn || "").toLowerCase().includes("all-day");

  const toggleMealPeriod = (mpId, mp) => {
    if (isAllDay(mp)) return;
    const next = selectedIds.includes(mpId)
      ? selectedIds.filter(id => id !== mpId)
      : [...selectedIds, mpId];
    setForm({ ...form, mealPeriodIds: next });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Category" : "Create Category"}</DialogTitle>
          <DialogDescription>
            Categories group food items within meal types (e.g., Coffee, Pastries, Mains).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {mealPeriods.length > 0 && (
            <div>
              <Label className="text-xs font-medium flex items-center gap-1">
                <UtensilsCrossed className="size-3" /> Meal Types
              </Label>
              <p className="text-[11px] text-muted-foreground mb-2">
                All-Day always includes every active category (locked). Toggle the regular meal types this category appears on; with none selected it still shows on all of them.
              </p>
              <div className="space-y-1.5">
                {mealPeriods.map(mp => {
                  const allDay = isAllDay(mp);
                  const isSelected = allDay || selectedIds.includes(mp._id);
                  return (
                    <button
                      key={mp._id}
                      type="button"
                      onClick={() => toggleMealPeriod(mp._id, mp)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-sm text-left transition-all ${
                        allDay
                          ? "border-amber-500/60 bg-amber-50/60 dark:bg-amber-900/10 cursor-default"
                          : isSelected
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-amber-300"
                      }`}
                    >
                      <div className={`size-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "border-amber-500 bg-amber-500" : "border-gray-300"
                      }`}>
                        {isSelected && <div className="size-2 rounded-sm bg-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{mp.name}</p>
                        {mp.startTime && mp.endTime && (
                          <p className="text-[10px] text-muted-foreground">{mp.startTime} – {mp.endTime}</p>
                        )}
                      </div>
                      {allDay && (
                        <span className="flex-shrink-0 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded-full px-2 py-0.5">
                          Always on
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium">Category Name *</Label>
            <Input
              placeholder="e.g. COFFEE"
              value={form.name || ""}
              onChange={e => setForm({ ...form, name: e.target.value.toUpperCase() })}
              className="mt-1"
            />
          </div>

          <LangSection open={showLang} onToggle={() => setShowLang(s => !s)}>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-medium">English</Label>
                <Input placeholder="e.g. Coffee" value={form.nameEn || ""} onChange={e => setForm({ ...form, nameEn: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Afaan Oromo</Label>
                <Input placeholder="e.g. Coofii" value={form.nameOm || ""} onChange={e => setForm({ ...form, nameOm: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Amharic</Label>
                <Input placeholder="e.g. ቡና" value={form.nameAm || ""} onChange={e => setForm({ ...form, nameAm: e.target.value })} className="mt-1" />
              </div>
            </div>
          </LangSection>

          <div>
            <Label className="text-xs font-medium">Display Order</Label>
            <Input type="number" min="0" placeholder="0 = first" value={form.displayOrder || 0} onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })} className="mt-1" />
          </div>

          <div className="flex items-center justify-between p-2 rounded-md bg-amber-50/40 dark:bg-amber-900/10 border border-amber-200/40 dark:border-amber-800/40">
            <div>
              <Label className="text-sm">Include in All-Day</Label>
              <p className="text-[11px] text-muted-foreground">Show in the All-Day tab (independent of meal type)</p>
            </div>
            <Switch checked={form.isAllDay || false} onCheckedChange={val => setForm({ ...form, isAllDay: val })} className="data-[state=checked]:bg-amber-600" />
          </div>

          <div className="flex items-center justify-between p-2 rounded-md bg-red-50/40 dark:bg-red-900/10 border border-red-200/40 dark:border-red-800/40">
            <div>
              <Label className="text-sm">Force Hide</Label>
              <p className="text-[11px] text-muted-foreground">Manually hide this category from customer displays</p>
            </div>
            <Switch checked={form.isHidden || false} onCheckedChange={val => setForm({ ...form, isHidden: val })} className="data-[state=checked]:bg-red-600" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>{editing ? "Update" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const ItemDialog = ({ open, onOpenChange, editing, form, setForm, categories = [], mealPeriods = [], onSave, selectedMealPeriod }) => {
  const [showLang, setShowLang] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const ALL_TAGS = ["Vegan", "Gluten-Free", "Chef Special", "Hot", "Cold", "Spicy", "Popular"];

  const scopeCategories = selectedMealPeriod
    ? categories.filter(c => (c.mealPeriodIds || []).length === 0 || (c.mealPeriodIds || []).includes(selectedMealPeriod._id))
    : categories;

  const selectedMpIds = form.mealPeriodIds || [];

  const isAllDayMealType = (mp) => mp.name === "ALL_DAY" || (mp.nameEn || "").toLowerCase().includes("all-day");

  const toggleMealPeriod = (mpId, mp) => {
    const next = selectedMpIds.includes(mpId)
      ? selectedMpIds.filter(id => id !== mpId)
      : [...selectedMpIds, mpId];
    setForm({ ...form, mealPeriodIds: next });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = ev => setImagePreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    await onSave(imageFile);
    setImageFile(null);
    setImagePreview(null);
  };

  const toggleTag = (tag) => {
    const current = form.tags || [];
    const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
    setForm({ ...form, tags: next });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Food Item" : "Add Food Item"}</DialogTitle>
          <DialogDescription>
            {selectedMealPeriod && <span className="text-xs">{selectedMealPeriod.name} meal type</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!editing && (
            <div>
              <Label className="text-xs font-medium">Category *</Label>
              <select
                value={form.categoryId || ""}
                onChange={e => setForm({ ...form, categoryId: e.target.value })}
                className="w-full h-9 rounded-md border bg-transparent px-2 text-sm mt-1"
              >
                <option value="">Select category</option>
                {scopeCategories.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium">Food Name *</Label>
            <Input placeholder="e.g. Espresso" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" />
          </div>

          <LangSection open={showLang} onToggle={() => setShowLang(s => !s)}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium">Name (EN)</Label>
                <Input placeholder="English name" value={form.nameEn || ""} onChange={e => setForm({ ...form, nameEn: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Name (OM)</Label>
                <Input placeholder="Afaan Oromo" value={form.nameOm || ""} onChange={e => setForm({ ...form, nameOm: e.target.value })} className="mt-1" />
              </div>
            </div>
          </LangSection>

          <div>
            <Label className="text-xs font-medium">Description</Label>
            <Textarea placeholder="Brief description..." value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" rows={2} />
          </div>

          <LangSection open={showLang} onToggle={() => setShowLang(s => !s)}>
            <div>
              <Label className="text-xs font-medium">Description (EN)</Label>
              <Input placeholder="English description" value={form.descriptionEn || ""} onChange={e => setForm({ ...form, descriptionEn: e.target.value })} className="mt-1" />
            </div>
          </LangSection>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-medium">Price (ETB) *</Label>
              <Input type="number" min="0" step="0.01" value={form.price || 0} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium">Prep Time (min)</Label>
              <Input type="number" min="1" value={form.preparationTimeMinutes || 15} onChange={e => setForm({ ...form, preparationTimeMinutes: Number(e.target.value) })} className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium">Attribute Tags</Label>
            <p className="text-[11px] text-muted-foreground mb-1.5">Select tags to highlight this item (e.g. Vegan, Chef Special)</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map(tag => {
                const active = (form.tags || []).includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                      active
                        ? "bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-300"
                        : "bg-white border-gray-200 text-gray-600 hover:border-amber-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium">Display Order</Label>
            <Input type="number" min="0" value={form.displayOrder || 0} onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })} className="mt-1" />
          </div>

          <div>
            <Label className="text-xs font-medium">Image</Label>
            <div className="mt-1 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-primary border border-dashed rounded-md px-3 py-2 hover:bg-primary/5 transition-colors">
                <ImagePlus className="size-4" />
                {imagePreview || form.imageUrl ? "Change image" : "Upload image"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </label>
              {(imagePreview || (editing && form.imageUrl)) && (
                <div className="relative">
                  <img src={imagePreview || form.imageUrl} alt="Preview" className="size-12 rounded-md object-cover" />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-red-500 text-white flex items-center justify-center">
                    <X className="size-3" />
                  </button>
                </div>
              )}
            </div>
            {editing && form.imageUrl && !imagePreview && <p className="text-[11px] text-muted-foreground mt-1">Current image shown. Select a new file to replace.</p>}
          </div>

          <div className="flex items-center justify-between p-2 rounded-md bg-green-50/40 dark:bg-green-900/10 border border-green-200/40 dark:border-green-800/40">
            <div>
              <Label className="text-sm">In Stock</Label>
              <p className="text-[11px] text-muted-foreground">Available for ordering on customer menu</p>
            </div>
            <Switch checked={form.isAvailable !== false} onCheckedChange={val => setForm({ ...form, isAvailable: val })} className="data-[state=checked]:bg-green-600" />
          </div>

          <div className="flex items-center justify-between p-2 rounded-md bg-red-50/40 dark:bg-red-900/10 border border-red-200/40 dark:border-red-800/40">
            <div>
              <Label className="text-sm">Force Hide</Label>
              <p className="text-[11px] text-muted-foreground">Manually hide this item from customer displays (overrides time)</p>
            </div>
            <Switch checked={form.isHidden || false} onCheckedChange={val => setForm({ ...form, isHidden: val })} className="data-[state=checked]:bg-red-600" />
          </div>

          <div className="flex items-center justify-between p-2 rounded-md bg-amber-50/40 dark:bg-amber-900/10 border border-amber-200/40 dark:border-amber-800/40">
            <div>
              <Label className="text-sm">Featured</Label>
              <p className="text-[11px] text-muted-foreground">Show in the Featured row on the customer menu</p>
            </div>
            <Switch checked={form.isFeatured || false} onCheckedChange={val => setForm({ ...form, isFeatured: val })} className="data-[state=checked]:bg-amber-600" />
          </div>

          {mealPeriods.length > 0 && (
            <div>
              <Label className="text-xs font-medium flex items-center gap-1">
                <Clock className="size-3" /> Meal Types
              </Label>
              <p className="text-[11px] text-muted-foreground mb-2">
                Check the meal types this item appears on. Select All-Day to keep it on all menus — unselecting All-Day removes it from the All-Day menu.
              </p>
              {selectedMpIds.length === 0 && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 border border-dashed border-amber-300 dark:border-amber-700 rounded-md px-2 py-1 mb-1.5 bg-amber-50/40 dark:bg-amber-900/10">
                  No meal types selected — this item follows its category (including All-Day if the category is All-Day).
                </p>
              )}
              <div className="space-y-1.5">
                {mealPeriods.map(mp => {
                  const allDay = isAllDayMealType(mp);
                  const isSelected = selectedMpIds.includes(mp._id);
                  return (
                    <button
                      key={mp._id}
                      type="button"
                      onClick={() => toggleMealPeriod(mp._id, mp)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-sm text-left transition-all ${
                        allDay
                          ? isSelected
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-amber-300"
                          : isSelected
                            ? "border-primary bg-primary/5 dark:bg-primary/10"
                            : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
                      }`}
                    >
                      <div className={`size-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "border-primary bg-primary" : "border-gray-300"
                      }`}>
                        {isSelected && <div className="size-2 rounded-sm bg-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{mp.name}</p>
                        {mp.startTime && mp.endTime && (
                          <p className="text-[10px] text-muted-foreground">{mp.startTime} – {mp.endTime}</p>
                        )}
                      </div>
                      {allDay && (
                        <span className="flex-shrink-0 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded-full px-2 py-0.5">
                          {isSelected ? "Selected" : "Off"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
