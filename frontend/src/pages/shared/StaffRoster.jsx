import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import useUserStore from "@/store/useUserStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, User, Trash2, Loader2, Search, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const VALID_ROLES = ["OWNER", "MANAGER", "CASHIER", "KITCHEN"];

const StaffRoster = ({ title, roles = ["MANAGER", "CASHIER", "KITCHEN"] }) => {
  const { authUser } = useAuthStore();
  const { staff, fetchStaff, createStaff, updateStaff, deleteStaff, isLoading } = useUserStore();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: roles[0] || "CASHIER",
    phone: "",
  });
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({
    role: "",
    status: "",
    search: "",
  });

  const canManageStaff = () => authUser?.role === "OWNER" || authUser?.role === "MANAGER";

  useEffect(() => {
    if (canManageStaff()) {
      fetchStaff({
        role: filters.role || undefined,
        isActive: filters.status !== "INACTIVE",
      });
    }
  }, [authUser?.role, filters.role, filters.status, fetchStaff]);

  const handleCreate = async () => {
    if (!form.name || !form.email) {
      return toast.error("Name and email are required");
    }
    if (!form.password) {
      return toast.error("Password is required");
    }

    setBusy(true);
    const res = await createStaff({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      phone: form.phone,
    });
    setBusy(false);
    if (res.success) {
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: roles[0] || "CASHIER", phone: "" });
      fetchStaff({ role: filters.role || undefined, isActive: filters.status !== "INACTIVE" });
    }
  };

  const handleRemove = async (id) => {
    if (!confirm("Deactivate this staff member?")) return;
    const res = await deleteStaff(id);
    if (res.success) {
      fetchStaff({ role: filters.role || undefined, isActive: filters.status !== "INACTIVE" });
    }
  };

  const handleView = (s) => {
    setForm({
      name: s.name,
      email: s.email,
      password: "",
      role: s.role,
      phone: s.phone || "",
    });
    setOpen(true);
  };

  if (!canManageStaff()) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Access Denied</h2>
        <p className="text-muted-foreground">Staff management is only available to Owners and Managers.</p>
      </div>
    );
  }

  const filteredStaff = staff.filter((s) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!s.name?.toLowerCase().includes(q) && !s.email?.toLowerCase().includes(q)) return false;
    }
    if (filters.role && s.role?.toLowerCase() !== filters.role.toLowerCase()) return false;
    if (filters.status === "ACTIVE" && !s.isActive) return false;
    if (filters.status === "INACTIVE" && s.isActive) return false;
    return true;
  });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        <Button onClick={() => {
          setForm({
            name: "",
            email: "",
            password: "",
            role: roles[0] || "CASHIER",
            phone: "",
          });
          setOpen(true);
        }}>
          <Plus className="size-4 mr-2" /> Add Staff
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">All Roles</option>
          {roles.map((r) => (
            <option key={r.toLowerCase()} value={r.toLowerCase()}>{r}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <Input
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="h-9 w-48"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
      ) : filteredStaff.length === 0 ? (
        <p className="text-muted-foreground">No staff found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStaff.map((s) => (
            <Card key={s._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">{s.email}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{s.role}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => handleView(s)} title="Edit">
                      <Edit className="size-4" />
                    </Button>
                    {s.isActive && authUser?.role === "OWNER" && (
                      <Button variant="ghost" size="icon-sm" onClick={() => handleRemove(s._id)} title="Deactivate">
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
                    )}
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
            <DialogTitle>{form.name ? "Edit Staff" : "Add New Staff"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value.toUpperCase() })}
              className="w-full h-9 rounded-md border bg-transparent px-2 text-sm"
            >
              {roles.map((r) => (
                <option key={r.toUpperCase()} value={r.toUpperCase()}>{r}</option>
              ))}
            </select>
            <Input
              placeholder={form.name ? "Leave blank to keep current password" : "Password (min 6 chars)"}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : (form.name ? "Update" : "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffRoster;
