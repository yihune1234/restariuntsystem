import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useBranchStore } from "@/store/useBranchStore";
import useUserStore from "@/store/useUserStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, User, Trash2, Loader2, Edit, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ALL_ROLES = [
  { key: "OWNER", label: "Owner", color: "bg-purple-100 text-purple-700" },
  { key: "MANAGER", label: "Managers", color: "bg-blue-100 text-blue-700" },
  { key: "CASHIER", label: "Cashiers", color: "bg-green-100 text-green-700" },
  { key: "KITCHEN", label: "Kitchen", color: "bg-orange-100 text-orange-700" },
  { key: "WAITER", label: "Waiters", color: "bg-pink-100 text-pink-700" },
];

const OwnerUsersPage = () => {
  const { authUser } = useAuthStore();
  const { branches, fetchBranches } = useBranchStore();
  const { staff, fetchStaffByBranch, createStaff, updateStaff, deleteStaff, isLoading } = useUserStore();

  const [activeTab, setActiveTab] = useState("MANAGER");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "MANAGER", branchId: "", password: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Single-branch mode: auto-resolve organization
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0]._id);
    }
  }, [branches]);

  useEffect(() => {
    if (selectedBranch) {
      fetchStaffByBranch(selectedBranch);
    }
  }, [selectedBranch, fetchStaffByBranch]);

  const filteredStaff = staff.filter((s) => {
    if (activeTab === "OWNER" && s.role !== "OWNER") return false;
    if (activeTab === "MANAGER" && s.role !== "MANAGER") return false;
    if (activeTab === "CASHIER" && s.role !== "CASHIER") return false;
    if (activeTab === "KITCHEN" && s.role !== "KITCHEN") return false;
    if (activeTab === "WAITER" && s.role !== "WAITER") return false;
    return true;
  });

  const counts = ALL_ROLES.map((r) => ({
    ...r,
    count: staff.filter((s) => s.role === r.key).length,
  }));

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", email: "", phone: "", role: activeTab === "OWNER" ? "MANAGER" : activeTab, branchId: selectedBranch, password: "" });
    setOpen(true);
  };

  const openEdit = (s) => {
    setEditingId(s._id);
    setForm({ name: s.name, email: s.email, phone: s.phone || "", role: s.role, branchId: s.branchId?._id || s.branchId || "", password: "" });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) return toast.error("Name and email required");
    if (!form.branchId) return toast.error("Branch is required");
    setBusy(true);
    let res;
    if (editingId) {
      res = await updateStaff(editingId, { name: form.name, email: form.email, phone: form.phone, role: form.role });
    } else {
      res = await createStaff(form.branchId, { name: form.name, email: form.email, phone: form.phone, role: form.role, password: form.password });
    }
    setBusy(false);
    if (res.success) {
      setOpen(false);
      fetchStaffByBranch(selectedBranch);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Deactivate this user?")) return;
    const res = await deleteStaff(id);
    if (res.success) fetchStaffByBranch(selectedBranch);
  };

  const getRoleColor = (role) => ALL_ROLES.find((r) => r.key === role)?.color || "bg-gray-100 text-gray-700";

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users & Staff</h1>
          <p className="text-sm text-muted-foreground">Manage all staff across branches</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">Select Branch</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => fetchStaffByBranch(selectedBranch)}>
            <RefreshCw className="size-4" />
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4 mr-2" /> Add Staff
          </Button>
        </div>
      </div>

      {/* Role Tabs */}
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

      {/* Staff Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
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
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredStaff.map((s) => (
            <Card key={s._id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                  </div>
                  <Badge className={cn("text-xs capitalize", s.isActive ? getRoleColor(s.role) : "bg-gray-100 text-gray-400")}>
                    {s.isActive ? s.role : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {s.phone && <span>{s.phone}</span>}
                    {s.branchId && (
                      <span className="ml-2">
                        · {branches.find((b) => b._id === (s.branchId?._id || s.branchId))?.name || s.branchId}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)} title="Edit">
                      <Edit className="size-3" />
                    </Button>
                    {s.isActive && s.role !== "OWNER" && (
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(s._id)} title="Deactivate">
                        <Trash2 className="size-3 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Staff" : "Add New Staff"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full h-9 rounded-md border bg-transparent px-2 text-sm"
            >
              {ALL_ROLES.filter((r) => r.key !== "OWNER").map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
            <select
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              className="w-full h-9 rounded-md border bg-transparent px-2 text-sm"
            >
              <option value="">Select Branch</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
            {!editingId && (
              <Input
                placeholder="Password (min 6 chars)"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={busy}>
              {busy ? <Loader2 className="animate-spin size-4" /> : (editingId ? "Update" : "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnerUsersPage;
