import React from "react";
import { Link } from "react-router-dom";
import { Users, ShieldCheck, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Role permissions reference. This is the source-of-truth matrix of what each
 * role can do, kept in sync with the backend route + service guards. Role and
 * staff account management actually happen in the live "Staff" page
 * (OwnerUsersPage), which is linked below.
 */
const ROLE_MATRIX = [
  {
    role: "Owner",
    badge: "bg-purple-100 text-purple-700",
    perms: [
      "Full system access (unrestricted)",
      "Create & delete branches",
      "System-level settings (currency, payment methods)",
      "Manage all staff roles",
      "Executive reports & analytics",
      "Final reconcile of daily closing & offline transactions",
    ],
  },
  {
    role: "Manager",
    badge: "bg-blue-100 text-blue-700",
    perms: [
      "Their assigned branch only",
      "Menu, inventory, tables & QR, staff (Cashier/Kitchen/Waiter)",
      "Branch reports & analytics, daily close open/close",
      "Cannot access other Owners or Managers",
    ],
  },
  {
    role: "Cashier",
    badge: "bg-green-100 text-green-700",
    perms: [
      "Create orders & confirm walk-in payments",
      "View transaction/payment history for the branch",
      "Cannot manage user accounts",
    ],
  },
  {
    role: "Waiter",
    badge: "bg-pink-100 text-pink-700",
    perms: [
      "Create customer orders, take & deliver ready orders",
      "Track active orders in real time",
      "Cannot manage user accounts",
    ],
  },
  {
    role: "Kitchen",
    badge: "bg-orange-100 text-orange-700",
    perms: [
      "View & update kitchen queue statuses in real time",
      "Paid orders only (unpaid orders never enter the kitchen)",
    ],
  },
  {
    role: "Customer",
    badge: "bg-gray-100 text-gray-600",
    perms: [
      "No account — scan a table QR, order, pay via Chapa, track",
      "Submit feedback and issues",
    ],
  },
];

const OwnerPermissions = () => {
  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="size-5" /> Role Permissions
          </h1>
          <p className="text-sm text-muted-foreground">
            What each role can do, matching the backend authorization guards.
          </p>
        </div>
        <Link to="/owner/users">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-3 flex items-center gap-2 text-sm">
              <Users className="size-4 text-primary" />
              Manage staff &amp; roles
              <ArrowRight className="size-4" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardContent className="space-y-3">
          {ROLE_MATRIX.map(({ role, badge, perms }) => (
            <div key={role} className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={badge}>{role}</Badge>
              </div>
              <ul className="space-y-1">
                {perms.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerPermissions;
