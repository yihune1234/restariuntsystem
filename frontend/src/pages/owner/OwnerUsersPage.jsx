import React, { useEffect, useState } from "react";
import useUserStore from "@/store/useUserStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, User, Trash2, Edit, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ALL_ROLES = [
  { key: "OWNER", label: "Owner", color: "bg-purple-100 text-purple-700" },
  { key: "MANAGER", label: "Managers", color: "bg-blue-100 text-blue-700" },
  { key: "CASHIER", label: "Cashiers", color: "bg-green-100 text-green-700" },
  { key: "KITCHEN", label: "Kitchen", color: "bg-orange-100 text-orange-700" },
];

const OwnerUsersPage = () => {
  const { staff, fetchStaff, createStaff, updateStaff, deleteStaff, isLoading } = useUserStore();

  const [activeTab, setActiveTab] = useState("MANAGER");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "MANAGER", password: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filteredStaff = staff.filter((s) => {
    if (activeTab === "OWNER" && s.role !== "OWNER") return false;
    if (activeTab === "MANAGER" && s.role !== "MANAGER") return false;
    if (activeTab === "CASHIER" && s.role !== "CASHIER") return false;
    if (activeTab === "KITCHEN" && s.role !== "KITCHEN") return false;
    return true;
  });

  const counts = ALL_ROLES.map((r) => ({
    ...r,
    count: staff.filter((s) => s.role === r.key).length,
  }));

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", email: "", phone: "", role: activeTab === "OWNER" ? "MANAGER" : activeTab, password: "" });
    setOpen(true);
  };

  const openEdit = (s) => {
    setEditingId(s._id);
    setForm({ name: s.name, email: s.email, phone: s.phone || "", role: s.role, password: "" });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) return toast.error("Name and email required");
    if (!editingId && !form.password) return toast.error("Password is required for new staff");
    setBusy(true);
    let res;
    if (editingId) {
      res = await updateStaff(editingId, { name: form.name, email: form.email, phone: form.phone, role: form.role });
    } else {
      res = await createStaff({ name: form.name, email: form.email, phone: form.phone, role: form.role, password: form.password });
    }
    setBusy(false);
    if (res.success) {
      setOpen(false);
      fetchStaff();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Deactivate this user?")) return;
    const res = await deleteStaff(id);
    if (res.success) fetchStaff();
  };

  const getRoleColor = (role) => ALL_ROLES.find((r) => r.key === role)?.color || "bg-gray-100 text-gray-700";

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Users & Staff</h1>
          <p className="text-sm text-muted-foreground">Manage all staff</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchStaff()}>
            <RefreshCw className="size-4" />
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4 mr-2" /> Add Staff
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {counts.map((r) => (
          <button
            key={r.key}
            onClick={() => setActiveTab(r.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              activeTab === r.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {r.label}
            <Badge variant="outline" className="ml-2 text-xs">{r.count}</Badge>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : filteredStaff.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="size-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No {ALL_ROLES.find((r) => r.key === activeTab)?.label.toLowerCase()} found.</p>
            <Button className="mt-3" size="sm" onClick={openCreate}>Add First {activeTab.toLowerCase()}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStaff.map((s) => (
            <Card key={s._id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-full ${getRoleColor(s.role)} flex items-center justify-center font-bold text-sm`}>
                      {s.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{s.role}</Badge>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">{s.isActive ? "Active" : "Inactive"}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Edit className="size-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(s._id)}><Trash2 className="size-3 text-red-500" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Staff" : "Add New Staff"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full h-10 mt-1 rounded-md border bg-transparent px-3 text-sm"
              >
                {ALL_ROLES.filter(r => r.key !== "OWNER").map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </div>
            {!editingId && (
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnerUsersPage;
