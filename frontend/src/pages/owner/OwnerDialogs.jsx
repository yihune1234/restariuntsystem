import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

/**
 * Create new branch — talks to POST /organizations/:organizationId/branches.
 * Backend requires: name, code, phone, address.city (optional subcity/street).
 *
 * In single-branch mode, the organization is auto-resolved by the backend.
 */
export const BranchDialog = ({ open, onOpenChange, form, setForm, managers, onSave }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>New Branch</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <Input
          placeholder="Branch name (e.g. Bole Medhanialem Branch)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          placeholder="Branch code (e.g. BOLE-01, uppercase)"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
        />
        <Input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          placeholder="City"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
        {managers && managers.length > 0 && (
          <select
            value={form.manager}
            onChange={(e) => setForm({ ...form, manager: e.target.value })}
            className="w-full h-9 rounded-md border bg-transparent px-2 text-sm"
          >
            <option value="">Assign manager...</option>
            {managers.map((m) => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
          </select>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onSave}>Create Branch</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

/**
 * Create new organization — disabled in single-branch mode.
 * Organizations are managed server-side via seed scripts.
 */
export const OrgDialog = ({ open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>Organization Management</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Organizations are managed at the system level. In single-branch mode,
          the default organization is used automatically.
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);