import React from "react";
import TableManagement from "../shared/TableManagement";
import { Building2 } from "lucide-react";

const OwnerTables = () => {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="size-5" /> Tables & QR Codes
        </h1>
        <p className="text-sm text-muted-foreground">Manage tables and QR codes for your restaurant</p>
      </div>
      <TableManagement />
    </div>
  );
};

export default OwnerTables;
