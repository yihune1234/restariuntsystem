import React, { useEffect, useState } from "react";
import { useBranchStore } from "@/store/useBranchStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Plus, Trash2 } from "lucide-react";
import { BranchDialog } from "./OwnerDialogs";

/**
 * Owner: manage branches.
 *
 * In single-branch mode, the organization is auto-resolved by the backend.
 *
 * Backend:
 *   GET   /organizations/:organizationId/branches   - list
 *   POST  /organizations/:organizationId/branches   - create
 *   PATCH /branches/:branchId                       - update
 *   DELETE/branches/:branchId                       - soft delete
 */
const OwnerBranches = () => {
  const {
    branches, fetchBranches,
    createBranch, deleteBranch,
  } = useBranchStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", city: "", phone: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Single-branch mode: auto-resolve organization
    fetchBranches();
  }, [fetchBranches]);

  const create = async () => {
    if (!form.name || !form.code) return;
    setBusy(true);
    const res = await createBranch(null, {
      name: form.name,
      code: form.code.toUpperCase(),
      phone: form.phone,
      address: { city: form.city },
    });
    setBusy(false);
    if (res.success) {
      setOpen(false);
      setForm({ name: "", code: "", city: "", phone: "" });
    }
  };

  const remove = async (id) => {
    if (!confirm("Deactivate this branch? (Soft delete)")) return;
    await deleteBranch(id);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="size-5" /> Branches
        </h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Branch
        </Button>
      </div>

      <div>
        {branches.length === 0 ? (
          <EmptyState title="No branches yet" description="Create your first branch to start serving customers." icon={Building2} />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {branches.map((b) => (
              <Card key={b._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold">{b.name}</h3>
                    <Button variant="ghost" size="icon-sm" onClick={() => remove(b._id)}>
                      <Trash2 className="size-3 text-red-500" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {b.address?.city || ""} {b.address?.street || ""}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">{b.code}</Badge>
                    <Badge className={b.isActive ? "bg-green-600" : "bg-red-500"}>
                      {b.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BranchDialog
        open={open}
        onOpenChange={setOpen}
        form={form}
        setForm={setForm}
        managers={[]}
        onSave={create}
      />

      {busy && <Skeleton className="h-2 w-full mt-2" />}
    </div>
  );
};

export default OwnerBranches;
