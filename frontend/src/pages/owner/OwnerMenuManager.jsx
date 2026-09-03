import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useBranchStore } from "@/store/useBranchStore";
import { useMenuStore } from "@/store/useMenuStore";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Building2, ChevronDown, History, User, Clock, ArrowRight,
} from "lucide-react";
import MenuManager from "../shared/MenuManager";

const ACTION_LABELS = {
  CREATE_MEAL_PERIOD: { label: "Created Meal Type", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  UPDATE_MEAL_PERIOD: { label: "Updated Meal Type", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  DELETE_MEAL_PERIOD: { label: "Deleted Meal Type", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  ACTIVATE_MEAL_PERIOD: { label: "Activated Meal Type", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  DEACTIVATE_MEAL_PERIOD: { label: "Deactivated Meal Type", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  CREATE_CATEGORY: { label: "Created Category", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  UPDATE_CATEGORY: { label: "Updated Category", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  DELETE_CATEGORY: { label: "Deleted Category", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  ACTIVATE_CATEGORY: { label: "Activated Category", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  DEACTIVATE_CATEGORY: { label: "Deactivated Category", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  CREATE_FOOD_ITEM: { label: "Created Food Item", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  UPDATE_FOOD_ITEM: { label: "Updated Food Item", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  DELETE_FOOD_ITEM: { label: "Deleted Food Item", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  CHANGE_FOOD_AVAILABILITY: { label: "Changed Availability", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  ACTIVATE_FOOD_ITEM: { label: "Activated Food Item", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  DEACTIVATE_FOOD_ITEM: { label: "Deactivated Food Item", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  CHANGE_PRICE: { label: "Changed Price", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  CHANGE_CATEGORY_ASSIGNMENT: { label: "Changed Category", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  CHANGE_MEAL_PERIOD_ASSIGNMENT: { label: "Changed Meal Type", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
};

const getEntityName = (log) => {
  if (log.newValue?.name) return log.newValue.name;
  if (log.oldValue?.name) return log.oldValue.name;
  return log.entityType || "Unknown";
};

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Owner Menu Management with branch selector + audit log view.
 * Owner can select any branch and manage its menu, plus see activity history.
 */
const OwnerMenuManager = () => {
  const { authUser } = useAuthStore();
  const organizationId = authUser?.organizationId;
  const { t } = useTranslation();

  const { branches, fetchBranches } = useBranchStore();
  const { auditLogs, auditPagination, fetchAuditLogs } = useMenuStore();

  const [selectedBranch, setSelectedBranch] = useState(null);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("menu"); // "menu" | "activity"
  const [auditPage, setAuditPage] = useState(1);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    // Single-branch mode: auto-resolve organization
    fetchBranches();
  }, [fetchBranches]);

  // Auto-select first branch
  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0]);
    }
  }, [branches, selectedBranch]);

  // Load audit logs when switching to activity tab
  useEffect(() => {
    if (activeTab === "activity" && selectedBranch) {
      setLoadingAudit(true);
      fetchAuditLogs(selectedBranch._id, { page: auditPage, limit: 30 }).finally(() => setLoadingAudit(false));
    }
  }, [activeTab, selectedBranch, auditPage, fetchAuditLogs]);

  const handleBranchSelect = (branch) => {
    setSelectedBranch(branch);
    setShowBranchDropdown(false);
    setAuditPage(1);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="size-5" /> {t('owner.branchMenu')}
          </h1>
          <p className="text-sm text-muted-foreground">Manage menu for any of your branches</p>
        </div>
      </div>

      {/* Branch Selector */}
      <div className="relative">
        <button
          onClick={() => setShowBranchDropdown(!showBranchDropdown)}
          className="w-full flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-none">
              <Building2 className="size-5" />
            </div>
            <div className="text-left">
              {selectedBranch ? (
                <>
                  <p className="font-semibold">{selectedBranch.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedBranch.address?.city || ""} {selectedBranch.code || ""}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Select a branch</p>
              )}
            </div>
          </div>
          <ChevronDown className={`size-4 text-muted-foreground transition-transform ${showBranchDropdown ? "rotate-180" : ""}`} />
        </button>

        {showBranchDropdown && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border rounded-xl shadow-lg overflow-hidden">
            {branches.map((b) => (
              <button
                key={b._id}
                onClick={() => handleBranchSelect(b)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left ${
                  selectedBranch?._id === b._id ? "bg-accent" : ""
                }`}
              >
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-none text-sm font-bold">
                  {b.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.address?.city || ""} {b.code || ""}</p>
                </div>
                {selectedBranch?._id === b._id && (
                  <Badge className="ml-auto bg-primary text-primary-foreground text-xs">Active</Badge>
                )}
              </button>
            ))}
            {branches.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">No branches found</div>
            )}
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      {selectedBranch && (
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("menu")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
              activeTab === "menu"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Menu Management
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === "activity"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="size-3.5" /> Activity Log
          </button>
        </div>
      )}

      {/* Content */}
      {!selectedBranch ? (
        <EmptyState
          title="Select a branch"
          description="Choose a branch above to manage its menu and view activity."
          icon={Building2}
        />
      ) : activeTab === "menu" ? (
        <MenuManager externalBranchId={selectedBranch._id} />
      ) : (
        <div className="space-y-3">
          {loadingAudit ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : auditLogs.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Menu management activity will appear here."
              icon={History}
            />
          ) : (
            <>
              <div className="space-y-2">
                {auditLogs.map((log) => {
                  const actionMeta = ACTION_LABELS[log.action] || { label: log.action, color: "bg-gray-100 text-gray-700" };
                  const entityName = getEntityName(log);
                  const userName = log.userId?.name || "System";

                  // Build description based on action type
                  let description = "";
                  if (log.action === "CHANGE_PRICE") {
                    const oldPrice = log.oldValue?.price;
                    const newPrice = log.newValue?.price;
                    if (oldPrice != null && newPrice != null) {
                      description = `${Number(oldPrice).toLocaleString()} ETB → ${Number(newPrice).toLocaleString()} ETB`;
                    }
                  } else if (log.action === "CHANGE_FOOD_AVAILABILITY") {
                    const was = log.oldValue?.isAvailable ? "Available" : "Unavailable";
                    const now = log.newValue?.isAvailable ? "Available" : "Unavailable";
                    description = `${was} → ${now}`;
                  } else if (log.action.includes("ACTIVATE") || log.action.includes("DEACTIVATE")) {
                    const wasActive = log.oldValue?.isActive;
                    const isActive = log.newValue?.isActive;
                    if (wasActive !== undefined && isActive !== undefined) {
                      description = `${wasActive ? "Active" : "Inactive"} → ${isActive ? "Active" : "Inactive"}`;
                    }
                  }

                  return (
                    <Card key={log._id}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="size-8 rounded-full bg-muted flex items-center justify-center flex-none mt-0.5">
                            <User className="size-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold">{userName}</span>
                              <Badge className={`text-xs ${actionMeta.color}`}>{actionMeta.label}</Badge>
                            </div>
                            <p className="text-sm mt-0.5">
                              <span className="font-medium">{entityName}</span>
                              {description && (
                                <span className="text-muted-foreground ml-1">— {description}</span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Clock className="size-3" />
                              <span>{formatTime(log.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {auditPagination && auditPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Page {auditPage} of {auditPagination.totalPages} ({auditPagination.total} entries)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={auditPage <= 1}
                      onClick={() => setAuditPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={auditPage >= auditPagination.totalPages}
                      onClick={() => setAuditPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default OwnerMenuManager;
