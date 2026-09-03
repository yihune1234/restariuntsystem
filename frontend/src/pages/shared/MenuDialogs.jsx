import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Globe, ImagePlus, X } from "lucide-react";

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

/** Meal Period (Meal Type) Dialog - with multilingual fields */
export const MealTypeDialog = ({ open, onOpenChange, editing, form, setForm, onSave }) => {
  const [showLang, setShowLang] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Meal Type" : "Create Meal Type"}</DialogTitle>
          <DialogDescription>
            Meal types organize your menu into sections (e.g., Hot Drinks, Foods, Snacks).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium">Meal Type Name *</Label>
            <Input
              placeholder="e.g. HOT DRINKS"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs font-medium">English</Label>
              <Input
                placeholder="e.g. Hot Drinks"
                value={form.nameEn || ""}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Afaan Oromo</Label>
              <Input
                placeholder="e.g. Dhugaatii"
                value={form.nameOm || ""}
                onChange={(e) => setForm({ ...form, nameOm: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Amharic</Label>
              <Input
                placeholder="e.g. ትኩስ ነገር"
                value={form.nameAm || ""}
                onChange={(e) => setForm({ ...form, nameAm: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-medium">Start Time</Label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">End Time</Label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Display Order</Label>
            <Input
              type="number"
              min="0"
              value={form.displayOrder || 0}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
            <Label className="text-sm">Active</Label>
            <Switch
              checked={form.isActive !== false}
              onCheckedChange={(val) => setForm({ ...form, isActive: val })}
              className="data-[state=checked]:bg-green-600"
            />
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

/** Category Dialog - belongs to a MealType, with multilingual fields */
export const CategoryDialog = ({ open, onOpenChange, editing, form, setForm, mealTypes, onSave, selectedMealType }) => {
  const [showLang, setShowLang] = useState(false);
  const effectiveMealTypeId = form.mealPeriodId || selectedMealType?._id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Category" : "Create Category"}</DialogTitle>
          <DialogDescription>
            Categories group food items within a meal type (e.g., Tea, Coffee, Burgers).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!selectedMealType && (
            <div>
              <Label className="text-xs font-medium">Meal Type *</Label>
              <select
                value={form.mealPeriodId || ""}
                onChange={(e) => setForm({ ...form, mealPeriodId: e.target.value })}
                className="w-full h-9 rounded-md border bg-transparent px-2 text-sm mt-1"
              >
                <option value="">Select meal type</option>
                {mealTypes.map((m) => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}
          {selectedMealType && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
              <span className="text-muted-foreground">Meal Type:</span>
              <span className="font-medium">{selectedMealType.name}</span>
              {editing && selectedMealType._id === (form.mealPeriodId?._id || form.mealPeriodId) && (
                <span className="text-[11px] text-muted-foreground ml-auto">belongs to this meal type</span>
              )}
            </div>
          )}
          <div>
            <Label className="text-xs font-medium">Category Name *</Label>
            <Input
              placeholder="e.g. BURGERS"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs font-medium">English</Label>
              <Input
                placeholder="e.g. Burgers"
                value={form.nameEn || ""}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Afaan Oromo</Label>
              <Input
                placeholder="e.g. Burger"
                value={form.nameOm || ""}
                onChange={(e) => setForm({ ...form, nameOm: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Amharic</Label>
              <Input
                placeholder="e.g. በርገር"
                value={form.nameAm || ""}
                onChange={(e) => setForm({ ...form, nameAm: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Display Order</Label>
            <Input
              type="number"
              min="0"
              placeholder="0 = first"
              value={form.displayOrder || 0}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
              className="mt-1"
            />
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

/** Food Item Dialog - belongs to a Category, with multilingual fields + image */
export const ItemDialog = ({ open, onOpenChange, editing, form, setForm, categories, onSave, selectedMealType }) => {
  const [showLang, setShowLang] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const selectedCat = categories.find((c) => c._id === form.categoryId);
  const scopeCategories = selectedMealType
    ? categories.filter((c) => (c.mealPeriodId?._id || c.mealPeriodId) === selectedMealType._id)
    : categories;

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    await onSave(imageFile);
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Food Item" : "Add Food Item"}</DialogTitle>
          <DialogDescription>
            {selectedMealType && (
              <span className="text-xs">
                Meal Type: {selectedMealType.name}
                {selectedCat && <> → Category: {selectedCat.name}</>}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!editing && (
            <div>
              <Label className="text-xs font-medium">Category *</Label>
              <select
                value={form.categoryId || ""}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full h-9 rounded-md border bg-transparent px-2 text-sm mt-1"
              >
                <option value="">Select category</option>
                {scopeCategories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium">Food Name *</Label>
            <Input
              placeholder="e.g. Burger"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs font-medium">Name (EN)</Label>
              <Input
                placeholder="English"
                value={form.nameEn || ""}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Name (OM)</Label>
              <Input
                placeholder="Afaan Oromo"
                value={form.nameOm || ""}
                onChange={(e) => setForm({ ...form, nameOm: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Name (AM)</Label>
              <Input
                placeholder="አማርኛ"
                value={form.nameAm || ""}
                onChange={(e) => setForm({ ...form, nameAm: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium">Description</Label>
            <Textarea
              placeholder="Brief description of the food item"
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs font-medium">Desc (EN)</Label>
              <Input
                placeholder="English"
                value={form.descriptionEn || ""}
                onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Desc (OM)</Label>
              <Input
                placeholder="Afaan Oromo"
                value={form.descriptionOm || ""}
                onChange={(e) => setForm({ ...form, descriptionOm: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Desc (AM)</Label>
              <Input
                placeholder="አማርኛ"
                value={form.descriptionAm || ""}
                onChange={(e) => setForm({ ...form, descriptionAm: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-medium">Price (ETB) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price || 0}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Prep Time (min)</Label>
              <Input
                type="number"
                min="1"
                value={form.preparationTimeMinutes || 15}
                onChange={(e) => setForm({ ...form, preparationTimeMinutes: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium">Display Order</Label>
            <Input
              type="number"
              min="0"
              value={form.displayOrder || 0}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
              className="mt-1"
            />
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
                  <img
                    src={imagePreview || form.imageUrl}
                    alt="Preview"
                    className="size-12 rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-red-500 text-white flex items-center justify-center"
                    aria-label="Remove selected image"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
            </div>
            {editing && form.imageUrl && !imagePreview && (
              <p className="text-[11px] text-muted-foreground mt-1">Current image shown. Select a new file to replace it.</p>
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
            <Label className="text-sm">Available on customer menu</Label>
            <Switch
              checked={form.isAvailable !== false}
              onCheckedChange={(val) => setForm({ ...form, isAvailable: val })}
              className="data-[state=checked]:bg-green-600"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
