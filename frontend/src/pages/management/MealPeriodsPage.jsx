import React, { useEffect, useState } from "react";
import axiosInstance from "@/axios/axiosInstace";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Clock, Plus, Edit, Trash2, ChevronUp, ChevronDown, Check } from "lucide-react";

const MealPeriodsPage = ({ onRefresh }) => {
  const [mealPeriods, setMealPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);

  const fetchMealPeriods = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/meal-periods");
      setMealPeriods(res.data?.data || []);
    } catch (e) {
      toast.error("Failed to load meal periods");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealPeriods();
  }, []);

  const toggleActive = async (period, newValue) => {
    try {
      await axiosInstance.patch(`/meal-periods/${period._id}`, { isActive: newValue });
      setMealPeriods((prev) => prev.map((p) => (p._id === period._id ? { ...p, isActive: newValue } : p)));
      onRefresh();
      toast.success(`"${period.nameEn || period.name}" is now ${newValue ? "active" : "inactive"}`);
    } catch (e) {
      toast.error(e.backendMessage || "Failed to update");
    }
  };

  const movePeriod = async (period, direction) => {
    const idx = mealPeriods.findIndex((p) => p._id === period._id);
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= mealPeriods.length) return;

    const newPeriods = [...mealPeriods];
    const tempOrder = newPeriods[idx].displayOrder;
    newPeriods[idx].displayOrder = newPeriods[newIdx].displayOrder;
    newPeriods[newIdx].displayOrder = tempOrder;
    setMealPeriods(newPeriods);

    try {
      await axiosInstance.patch("/meal-periods/reorder", {
        orders: [
          { id: newPeriods[idx]._id, displayOrder: newPeriods[idx].displayOrder },
          { id: newPeriods[newIdx]._id, displayOrder: newPeriods[newIdx].displayOrder },
        ],
      });
      onRefresh();
      toast.success("Meal periods reordered");
    } catch (e) {
      toast.error("Failed to reorder");
      fetchMealPeriods();
    }
  };

  const deletePeriod = async (periodId) => {
    try {
      await axiosInstance.delete(`/meal-periods/${periodId}`);
      setMealPeriods((prev) => prev.filter((p) => p._id !== periodId));
      onRefresh();
      toast.success("Meal period deleted");
    } catch (e) {
      toast.error(e.backendMessage || "Failed to delete");
    }
  };

  const activeCount = mealPeriods.filter((p) => p.isActive).length;

  return (
    <div className="p-4 pb-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Meal Periods</h1>
          <p className="text-xs text-gray-500">{activeCount} of {mealPeriods.length} active</p>
        </div>
        <Button
          onClick={() => { setEditingPeriod(null); setDialogOpen(true); }}
          className="bg-amber-600 hover:bg-amber-700 h-9 text-xs sm:text-sm w-full sm:w-auto"
        >
          <Plus className="size-4 mr-1.5" />
          Add Meal Period
        </Button>
      </div>

      {/* Meal Periods List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 flex items-center gap-3">
                <div className="size-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : mealPeriods.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="size-6 text-gray-400" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-1">No meal periods yet</h3>
            <p className="text-xs text-gray-500 mb-4">Create meal periods to define time windows (Breakfast, Lunch, Dinner)</p>
            <Button onClick={() => { setEditingPeriod(null); setDialogOpen(true); }} className="bg-amber-600 hover:bg-amber-700 h-9 text-sm">
              <Plus className="size-4 mr-1.5" />
              Add Meal Period
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {mealPeriods.map((period, idx) => (
              <div
                key={period._id}
                className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${!period.isActive ? "opacity-50" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {/* Order Controls */}
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => movePeriod(period, "up")}
                      disabled={idx === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <span className="text-xs font-medium text-gray-500 w-5 text-center">{period.displayOrder || 0}</span>
                    <button
                      onClick={() => movePeriod(period, "down")}
                      disabled={idx === mealPeriods.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </div>

                  {/* Period Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                        {period.nameEn || period.name || "Unnamed"}
                      </h3>
                      {period.isActive && <Check className="size-3 text-green-500 flex-shrink-0" />}
                      {!period.isActive && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-500">Inactive</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="size-3" />
                        {period.startTime} - {period.endTime}
                      </span>
                      {(period.nameOm || period.nameAm) && (
                        <div className="flex gap-x-3 text-xs text-gray-500">
                          {period.nameOm && <span>OM: {period.nameOm}</span>}
                          {period.nameAm && <span>AM: {period.nameAm}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Toggle & Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Switch
                      checked={period.isActive}
                      onCheckedChange={(v) => toggleActive(period, v)}
                      className="scale-90"
                    />
                    <button
                      onClick={() => { setEditingPeriod(period); setDialogOpen(true); }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit className="size-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${period.nameEn || period.name}"?`)) {
                          deletePeriod(period._id);
                        }
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MealPeriodDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        period={editingPeriod}
        onSave={() => {
          setDialogOpen(false);
          onRefresh();
          fetchMealPeriods();
        }}
      />
    </div>
  );
};

const MealPeriodDialog = ({ open, onClose, period, onSave }) => {
  const [form, setForm] = useState({
    nameEn: "",
    nameOm: "",
    nameAm: "",
    startTime: "06:00",
    endTime: "11:30",
    displayOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (period) {
      setForm({
        nameEn: period.nameEn || period.name || "",
        nameOm: period.nameOm || "",
        nameAm: period.nameAm || "",
        startTime: period.startTime || "06:00",
        endTime: period.endTime || "11:30",
        displayOrder: period.displayOrder || 0,
      });
    } else {
      setForm({ nameEn: "", nameOm: "", nameAm: "", startTime: "06:00", endTime: "11:30", displayOrder: 0 });
    }
  }, [period, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nameEn.trim()) { toast.error("English name is required"); return; }
    if (!form.startTime || !form.endTime) { toast.error("Start and end times are required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.nameEn,
        nameEn: form.nameEn,
        nameOm: form.nameOm,
        nameAm: form.nameAm,
        startTime: form.startTime,
        endTime: form.endTime,
        displayOrder: Number(form.displayOrder) || 0,
      };
      if (period) {
        await axiosInstance.patch(`/meal-periods/${period._id}`, payload);
        toast.success("Meal period updated");
      } else {
        await axiosInstance.post("/meal-periods", payload);
        toast.success("Meal period created");
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
          <DialogTitle className="text-base sm:text-lg">{period ? "Edit Meal Period" : "Add New Meal Period"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Name (English) *</label>
            <Input
              value={form.nameEn}
              onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
              placeholder="e.g. Breakfast"
              className="h-9"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Name (Oromoo)</label>
            <Input
              value={form.nameOm}
              onChange={(e) => setForm((f) => ({ ...f, nameOm: e.target.value }))}
              placeholder="e.g. Ciree"
              className="h-9"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Name (Amharic)</label>
            <Input
              value={form.nameAm}
              onChange={(e) => setForm((f) => ({ ...f, nameAm: e.target.value }))}
              placeholder="e.g. ቁርስ"
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Start Time *</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">End Time *</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Display Order</label>
            <Input
              type="number"
              value={form.displayOrder}
              onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
              className="w-24 h-9 text-sm"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto h-9 text-sm">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 h-9 text-sm">
              {saving ? "Saving..." : (period ? "Update" : "Add Meal Period")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MealPeriodsPage;
