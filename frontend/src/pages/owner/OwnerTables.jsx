import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useBranchStore } from "@/store/useBranchStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

const OwnerTables = () => {
  const { authUser } = useAuthStore();
  const { branches, fetchBranchesByOrganization } = useBranchStore();
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  useEffect(() => {
    // Single-branch mode: auto-resolve organization
    fetchBranches();
  }, [fetchBranches]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="size-5" /> Tables & QR Codes
        </h1>
        <p className="text-sm text-muted-foreground">Select a branch to manage its tables</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Branch</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedBranchId || ""} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
              {branches?.map((branch) => (
                <SelectItem key={branch._id} value={branch._id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedBranchId && (
        <Card>
          <CardHeader>
            <CardTitle>Tables for Selected Branch</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Use the <strong>Manager Tables & QR</strong> page while logged in as a Manager for branch "{branches?.find(b => b._id === selectedBranchId)?.name}" to manage tables.
            </p>
            <Badge variant="outline">
              Branch ID: {selectedBranchId}
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OwnerTables;
