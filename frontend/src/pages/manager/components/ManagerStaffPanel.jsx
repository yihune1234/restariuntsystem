import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUserStore } from "@/store/useUserStore";
import { useOrderStore } from "@/store/useOrderStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Users,
  UserRound,
  ChefHat,
  Wallet,
  LayoutGrid,
  List,
  UserCog,
  Settings,
} from "lucide-react";

const ROLE_CONFIG = {
  manager: { icon: UserRound, color: "text-purple-600", bg: "bg-purple-50", label: "Manager" },
  cashier: { icon: Wallet, color: "text-green-600", bg: "bg-green-50", label: "Cashier" },
  kitchen: { icon: ChefHat, color: "text-orange-600", bg: "bg-orange-50", label: "Kitchen" },
  owner: { icon: UserRound, color: "text-red-600", bg: "bg-red-50", label: "Owner" },
};

const ManagerStaffPanel = () => {
  const navigate = useNavigate();
  const { staff, fetchStaff, isLoading } = useUserStore();
  const { orders } = useOrderStore();

  const [viewMode, setViewMode] = useState("cards");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filteredStaff = useMemo(() => {
    let result = staff;

    if (roleFilter !== "all") {
      result = result.filter((s) => s.role?.toLowerCase() === roleFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((s) => s.isActive === (statusFilter === "active"));
    }

    return result;
  }, [staff, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: staff.length,
      active: staff.filter((s) => s.isActive).length,
      managers: staff.filter((s) => s.role === "MANAGER").length,
      cashiers: staff.filter((s) => s.role === "CASHIER").length,
      kitchen: staff.filter((s) => s.role === "KITCHEN").length,
    };
  }, [staff]);

  const staffByRole = useMemo(() => ({
    manager: staff.filter((s) => s.role?.toLowerCase() === "manager"),
    cashier: staff.filter((s) => s.role?.toLowerCase() === "cashier"),
    kitchen: staff.filter((s) => s.role?.toLowerCase() === "kitchen"),
  }), [staff]);

  const roleTabs = [
    { key: "all", label: "All Staff" },
    { key: "manager", label: `Managers (${staffByRole.manager.length})` },
    { key: "kitchen", label: `Kitchen (${staffByRole.kitchen.length})` },
    { key: "cashier", label: `Cashiers (${staffByRole.cashier.length})` },
  ];

  if (isLoading && staff.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staff Overview</CardTitle>
        </CardHeader>
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
            <div className="flex gap-2">
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
            <div className="text-center p-2 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{stats.kitchen}</p>
              <p className="text-xs text-muted-foreground">Kitchen</p>
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
        </CardHeader>

        <CardContent>
          {filteredStaff.length === 0 ? (
            <EmptyState
              title="No staff found"
              description="Staff will appear here once added."
              icon={Users}
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
                      <div className={`size-12 rounded-full ${roleConfig.bg} flex items-center justify-center mx-auto mb-3`}>
                        <RoleIcon className={`size-6 ${roleConfig.color}`} />
                      </div>
                      <p className="font-medium text-sm truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {roleConfig.label}
                      </Badge>
                      <div className="flex items-center justify-center gap-1 mt-2">
                        <div className={`size-2 rounded-full ${s.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                        <span className="text-xs">{s.isActive ? "Active" : "Inactive"}</span>
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
                return (
                  <div
                    key={s._id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedStaff(s)}
                  >
                    <div className={`size-10 rounded-full ${roleConfig.bg} flex items-center justify-center`}>
                      <roleConfig.icon className={`size-5 ${roleConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {roleConfig.label}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <div className={`size-2 rounded-full ${s.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                      <span className="text-xs">{s.isActive ? "Active" : "Inactive"}</span>
                    </div>
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
                  <p className="text-muted-foreground">Last Login</p>
                  <p className="font-medium">{selectedStaff.lastLogin ? new Date(selectedStaff.lastLogin).toLocaleString() : "Never"}</p>
                </div>
              </div>
            </CardContent>
          )}
          <DrawerFooter>
            <Button variant="outline" onClick={() => setSelectedStaff(null)}>Close</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default ManagerStaffPanel;
