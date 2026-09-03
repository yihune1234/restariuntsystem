import React from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

/**
 * Shared profile page for all staff roles. Pulls from useAuthStore.
 */
const StaffProfile = () => {
  const { authUser } = useAuthStore();

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <h1 className="text-xl font-bold mb-4">My Profile</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              {authUser?.avatar && <AvatarImage src={authUser.avatar} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {authUser?.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{authUser?.name}</CardTitle>
              <Badge variant="outline" className="capitalize mt-1">{authUser?.role}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{authUser?.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">{authUser?.phone || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Organization</p>
              <p className="font-medium truncate">{authUser?.organizationId || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Branch</p>
              <p className="font-medium truncate">{authUser?.branchId || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">{authUser?.isActive ? "Active" : "Inactive"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffProfile;
