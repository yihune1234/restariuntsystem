import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useUserStore } from "@/store/useUserStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrderStore } from "@/store/useOrderStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  UserRound,
  ChefHat,
  Wallet,
  LayoutGrid,
  List,
  Search,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
} from "lucide-react";

const ROLE_CONFIG = {
  owner: { icon: ShieldCheck, color: "text-red-600", bg: "bg-red-50", label: "Owner" },
  manager: { icon: UserRound, color: "text-purple-600", bg: "bg-purple-50", label: "Manager" },
  cashier: { icon: Wallet, color: "text-green-600", bg: "bg-green-50", label: "Cashier" },
  kitchen: { icon: ChefHat, color: "text-orange-600", bg: "bg-orange-50", label: "Kitchen" },
};

const MANAGEABLE_ROLES = ["MANAGER", "CASHIER", "KITCHEN"];

const EMPTY_FORM = { name: "", email: "", phone: "", role: "MANAGER", password: "" };

const OwnerStaffPanel = () => {
  const { authUser } = useAuthStore();
  const { staff, fetchStaff, createStaff, updateStaff, deleteStaff, isLoading } = useUserStore();
  const { orders, getOrders } = useOrderStore();

  const [viewMode, setViewMode] = useState("cards");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchStaff();
    getOrders({ limit: 100 });
  }, [fetchStaff, getOrders]);

  const filteredStaff = useMemo(() => {
    let result = staff;

    if (roleFilter !== "all") {
      result = result.filter((s) => s.role?.toLowerCase() === roleFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((s) => s.isActive === (statusFilter === "active"));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.role?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [staff, roleFilter, statusFilter, search]);

  const ordersPerStaff = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const id = o.createdBy?._id || o.createdBy;
      if (id) map[id] = (map[id] || 0) + 1;
    });
    return map;
  }, [orders]);

  const stats = useMemo(() => {
    return {
      total: staff.length,
      active: staff.filter((s) => s.isActive).length,
      owners: staff.filter((s) => s.role === "OWNER").length,
      managers: staff.filter((s) => s.role === "MANAGER").length,
      cashiers: staff.filter((s) => s.role === "CASHIER").length,
      kitchen: staff.filter((s) => s.role === "KITCHEN").length,
      openOrders: orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.orderStatus)).length,
    };
  }, [staff, orders]);

  const staffByRole = useMemo(() => ({
    owner: staff.filter((s) => s.role?.toLowerCase() === "owner"),
    manager: staff.filter((s) => s.role?.toLowerCase() === "manager"),
    cashier: staff.filter((s) => s.role?.toLowerCase() === "cashier"),
    kitchen: staff.filter((s) => s.role?.toLowerCase() === "kitchen"),
  }), [staff]);

  const roleTabs = [
    { key: "all", label: `All (${staff.length})` },
    { key: "owner", label: `Owners (${staffByRole.owner.length})` },
    { key: "manager", label: `Managers (${staffByRole.manager.length})` },
    { key: "cashier", label: `Cashiers (${staffByRole.cashier.length})` },
    { key: "kitchen", label: `Kitchen (${staffByRole.kitchen.length})` },
  ];

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, role: roleFilter === "all" || roleFilter === "owner" ? "MANAGER" : roleFilter.toUpperCase() });
    setOpen(true);
  };

  const openEdit = (s) => {
    setEditingId(s._id);
    setForm({ name: s.name || "", email: s.email || "", phone: s.phone || "", role: s.role || "MANAGER", password: "" });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (!editingId && !form.password) {
      toast.error("Password is required for new staff");
      return;
    }
    setBusy(true);
    let res;
    if (editingId) {
      res = await updateStaff(editingId, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
      });
    } else {
      res = await createStaff({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        password: form.password,
      });
    }
    setBusy(false);
    if (res.success) {
      setOpen(false);
      setForm({ ...EMPTY_FORM, role: "MANAGER" });
      fetchStaff();
    }
  };

  const handleDeactivate = async (s) => {
    if (!window.confirm(`Deactivate ${s.name}? They will no longer be able to sign in.`)) return;
    const res = await deleteStaff(s._id);
    if (res.success) {
      setSelectedStaff(null);
      fetchStaff();
    }
  };

  const handleActivate = async (s) => {
    setBusy(true);
    const res = await updateStaff(s._id, { isActive: true });
    setBusy(false);
    if (res.success) fetchStaff();
  };

  if (isLoading && staff.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Staff Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4" />
              Staff Overview
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-2 ${viewMode === "cards" ? "bg-muted" : ""}`}
                  onClick={() => setViewMode("cards")}
                >
                  <LayoutGrid className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-2 ${viewMode === "list" ? "bg-muted" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  <List className="size-4" />
                </Button>
              </div>
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4 mr-1" /> Add Staff
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
            <div className="text-center p-2 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Staff</p>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{stats.managers}</p>
              <p className="text-xs text-muted-foreground">Managers</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.openOrders}</p>
              <p className="text-xs text-muted-foreground">Open Orders</p>
            </div>
          </div>

          <div className="flex gap-1 flex-wrap mt-2 overflow-x-auto pb-1">
            {roleTabs.map((tab) => (
              <Badge
                key={tab.key}
                variant={roleFilter === tab.key ? "default" : "outline"}
                className="cursor-pointer text-xs whitespace-nowrap"
                onClick={() => setRoleFilter(tab.key)}
              >
                {tab.label}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            <div className="relative">
              <Search className="size-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search name / email / role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {filteredStaff.length === 0 ? (
            <EmptyState
              title="No staff found"
              description="Add staff members to get started."
              icon={Users}
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus className="size-4 mr-1" /> Add Staff
                </Button>
              }
            />
          ) : viewMode === "cards" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredStaff.map((s) => {
                const roleConfig = ROLE_CONFIG[s.role?.toLowerCase()] || ROLE_CONFIG.manager;
                const RoleIcon = roleConfig.icon;
                return (
                  <Card
                    key={s._id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedStaff(s)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-end gap-1 -mt-1">
                        {s._id !== authUser?._id && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                              className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                              title="Edit staff"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            {s.isActive ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeactivate(s); }}
                                className="p-1 rounded-md hover:bg-red-50 text-red-500"
                                title="Deactivate"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleActivate(s); }}
                                className="p-1 rounded-md hover:bg-green-50 text-green-600"
                                title="Reactivate"
                              >
                                <ShieldCheck className="size-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <div className={`size-12 rounded-full ${roleConfig.bg} flex items-center justify-center mx-auto mb-3`}>
                        <RoleIcon className={`size-6 ${roleConfig.color}`} />
                      </div>
                      <p className="font-medium text-sm truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {roleConfig.label}
                      </Badge>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <div className={`size-2 rounded-full ${s.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                        <span className="text-xs">{s.isActive ? "Active" : "Inactive"}</span>
                        {s.isActive && (ordersPerStaff[s._id] || 0) > 0 && (
                          <span className="text-xs text-primary font-medium">
                            {ordersPerStaff[s._id]} orders
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStaff.map((s) => {
                const roleConfig = ROLE_CONFIG[s.role?.toLowerCase()] || ROLE_CONFIG.manager;
                const RoleIcon = roleConfig.icon;
                return (
                  <div
                    key={s._id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedStaff(s)}
                  >
                    <div className={`size-10 rounded-full ${roleConfig.bg} flex items-center justify-center`}>
                      <RoleIcon className={`size-5 ${roleConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{roleConfig.label}</Badge>
                    {ordersPerStaff[s._id] ? (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {ordersPerStaff[s._id]} orders
                      </span>
                    ) : null}
                    <div className="flex items-center gap-1">
                      <div className={`size-2 rounded-full ${s.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                      <span className="text-xs">{s.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    {s._id !== authUser?._id && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(s)} title="Edit">
                          <Pencil className="size-3.5" />
                        </Button>
                        {s.isActive ? (
                          <Button size="sm" variant="ghost" onClick={() => handleDeactivate(s)} title="Deactivate">
                            <Trash2 className="size-3.5 text-red-500" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => handleActivate(s)} title="Reactivate">
                            <ShieldCheck className="size-3.5 text-green-600" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Drawer open={!!selectedStaff} onOpenChange={(open) => !open && setSelectedStaff(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Staff Details</DrawerTitle>
          </DrawerHeader>
          {selectedStaff && (
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {(() => {
                  const roleConfig = ROLE_CONFIG[selectedStaff.role?.toLowerCase()] || ROLE_CONFIG.manager;
                  const RoleIcon = roleConfig.icon;
                  return (
                    <>
                      <div className={`size-16 rounded-full ${roleConfig.bg} flex items-center justify-center`}>
                        <RoleIcon className={`size-8 ${roleConfig.color}`} />
                      </div>
                      <div>
                        <p className="font-bold text-lg">{selectedStaff.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedStaff.email}</p>
                        <Badge variant="outline" className="mt-1">{roleConfig.label}</Badge>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedStaff.isActive ? "Active" : "Inactive"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <p className="font-medium">{selectedStaff.role}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedStaff.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Orders Placed</p>
                  <p className="font-medium">{ordersPerStaff[selectedStaff._id] || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Login</p>
                  <p className="font-medium">
                    {selectedStaff.lastLogin ? new Date(selectedStaff.lastLogin).toLocaleString() : "Never"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Joined</p>
                  <p className="font-medium">
                    {selectedStaff.createdAt ? new Date(selectedStaff.createdAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          )}
          <DrawerFooter className="flex-row justify-end gap-2">
            {selectedStaff && selectedStaff._id !== authUser?._id && (
              <Button
                variant={selectedStaff.isActive ? "destructive" : "outline"}
                onClick={() => (selectedStaff.isActive ? handleDeactivate(selectedStaff) : handleActivate(selectedStaff))}
              >
                {selectedStaff.isActive ? "Deactivate" : "Reactivate"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedStaff(null)}>Close</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Staff" : "Add New Staff"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Full Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
                placeholder="e.g. Abebe Kebede"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1"
                placeholder="name@restaurant.com"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1"
                placeholder="+2519..."
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Role</Label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full h-10 mt-1 rounded-md border bg-transparent px-3 text-sm"
              >
                {MANAGEABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">
                {editingId ? "Password (leave blank to keep current)" : "Password"}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1"
                placeholder="Min 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={busy}>
              {busy ? "Saving..." : editingId ? "Save Changes" : "Create Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OwnerStaffPanel;