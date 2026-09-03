import {
  LayoutDashboard,
  ShoppingCart,
  PlusCircle,
  ListChecks,
  Truck,
  UserRound,
  Wallet,
  Receipt,
  Banknote,
  ChefHat,
  Menu,
  Package,
  Users,
  FileBarChart,
  Settings,
  Building2,
  UserCog,
  ShieldCheck,
  QrCode,
  Trash2,
  WifiOff,
  MessageSquare,
  DollarSign,
  LayoutGrid,
  Star,
} from "lucide-react";

/**
 * Per-role navigation configuration.
 */

export const waiterNav = {
  title: "Waiter",
  items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, link: "/waiter/dashboard" },
    {
      id: "tables",
      label: "Tables",
      icon: LayoutGrid,
      link: "/waiter/tables",
      subItems: [
        { id: "my-tables", label: "My Tables", link: "/waiter/tables" },
      ]
    },
    {
      id: "orders",
      label: "Orders",
      icon: ListChecks,
      link: "/waiter/active",
      subItems: [
        { id: "new-order", label: "New Order", link: "/waiter/create" },
        { id: "active-orders", label: "Active Orders", link: "/waiter/active" },
        { id: "order-status", label: "Order Status", link: "/waiter/status" },
      ]
    },
  ],
  bottom: [{ id: "profile", label: "Profile", icon: UserRound, link: "/waiter/profile" }],
};

export const cashierNav = {
  title: "Cashier",
  items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, link: "/cashier/dashboard" },
    {
      id: "orders",
      label: "Bills & Orders",
      icon: Receipt,
      link: "/cashier/create",
      subItems: [
        { id: "create", label: "New Order", link: "/cashier/create" },
      ]
    },
    {
      id: "payments",
      label: "Payments",
      icon: Wallet,
      link: "/cashier/payments",
      subItems: [
        { id: "active-payments", label: "Active Payments", link: "/cashier/payments" },
        { id: "history", label: "Payment History", link: "/cashier/transactions" },
      ]
    },
    {
      id: "operations",
      label: "Operations",
      icon: WifiOff,
      link: "/cashier/manual-entry",
      subItems: [
        { id: "manual-entry", label: "Manual Entry", link: "/cashier/manual-entry" },
      ]
    },
  ],
  bottom: [{ id: "profile", label: "Profile", icon: UserRound, link: "/cashier/profile" }],
};

export const kitchenNav = {
  title: "Kitchen",
  items: [
    {
      id: "dashboard",
      label: "Kitchen Board",
      icon: ChefHat,
      link: "/kitchen/dashboard",
      subItems: [
        { id: "active", label: "Active Orders", link: "/kitchen/dashboard" },
      ]
    },
  ],
  bottom: [{ id: "profile", label: "Profile", icon: UserRound, link: "/kitchen/profile" }],
};

export const managerNav = {
  title: "Manager",
  items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, link: "/manager/dashboard" },
    {
      id: "orders",
      label: "Orders",
      icon: ShoppingCart,
      link: "/manager/orders",
      subItems: [
        { id: "all-orders", label: "All Orders", link: "/manager/orders" },
        { id: "kitchen", label: "Kitchen Board", link: "/manager/kitchen" },
      ]
    },
    {
      id: "tables",
      label: "Tables",
      icon: QrCode,
      link: "/manager/tables",
      subItems: [
        { id: "floor-overview", label: "Floor Overview", link: "/manager/tables" },
        { id: "table-capacity", label: "Table Capacity", link: "/manager/table-capacity" },
        { id: "waiter-assignment", label: "Waiter & Table Assignment", link: "/manager/waiter-assignment" },
      ]
    },
    {
      id: "menu",
      label: "Menu",
      icon: Menu,
      link: "/manager/menu",
      subItems: [
        { id: "menu-items", label: "Menu Management", link: "/manager/menu" },
      ]
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Package,
      link: "/manager/inventory",
      subItems: [
        { id: "stock-overview", label: "Stock Overview", link: "/manager/inventory" },
        { id: "waste-mgmt", label: "Waste Mgmt", link: "/manager/waste" },
      ]
    },
    {
      id: "staff",
      label: "Staff",
      icon: Users,
      link: "/manager/staff",
      subItems: [
        { id: "employees", label: "Employees", link: "/manager/staff" },
      ]
    },
    {
      id: "customers",
      label: "Customers",
      icon: MessageSquare,
      link: "/manager/customers",
      subItems: [
        { id: "customer-list", label: "Feedback & Ratings", link: "/manager/customers" },
      ]
    },
    {
      id: "payments",
      label: "Payments",
      icon: DollarSign,
      link: "/manager/payments",
      subItems: [
        { id: "pending", label: "Payments", link: "/manager/payments" },
        { id: "transactions", label: "Transactions", link: "/manager/transactions" },
        { id: "refunds", label: "Refunds", link: "/manager/refunds" },
      ]
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileBarChart,
      link: "/manager/reports",
      subItems: [
        { id: "daily", label: "Daily Close", link: "/manager/daily" },
        { id: "operational", label: "Operational Reports", link: "/manager/reports" },
      ]
    },
  ],
  bottom: [
    { id: "offline", label: "Offline Mode", icon: WifiOff, link: "/manager/offline" },
    { id: "settings", label: "Branch Settings", icon: Settings, link: "/manager/branch-settings" },
    { id: "profile", label: "Profile", icon: UserRound, link: "/manager/profile" },
  ],
};

export const ownerNav = {
  title: "Owner",
  items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, link: "/owner/dashboard" },
    {
      id: "orders",
      label: "Orders",
      icon: ShoppingCart,
      link: "/owner/orders",
      subItems: [
        { id: "all-orders", label: "All Orders", link: "/owner/orders" },
      ]
    },
    {
      id: "tables",
      label: "Tables",
      icon: QrCode,
      link: "/owner/tables",
      subItems: [
        { id: "floor-overview", label: "Floor Overview", link: "/owner/tables" },
        { id: "table-capacity", label: "Table Capacity", link: "/owner/table-capacity" },
        { id: "waiter-assignment", label: "Waiter & Table Assignment", link: "/owner/waiter-assignment" },
      ]
    },
    {
      id: "menu",
      label: "Menu",
      icon: Menu,
      link: "/owner/menu",
      subItems: [
        { id: "menu-items", label: "Menu Management", link: "/owner/menu" },
      ]
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Package,
      link: "/owner/inventory",
      subItems: [
        { id: "stock-overview", label: "Stock Overview", link: "/owner/inventory" },
        { id: "waste-mgmt", label: "Waste & Operations", link: "/owner/operations" },
      ]
    },
    {
      id: "payments",
      label: "Payments",
      icon: Wallet,
      link: "/owner/payments",
      subItems: [
        { id: "transactions", label: "Transactions", link: "/owner/payments" },
        { id: "refunds", label: "Refunds", link: "/owner/refunds" },
      ]
    },
    {
      id: "customers",
      label: "Customers",
      icon: Star,
      link: "/owner/feedback",
      subItems: [
        { id: "feedback", label: "Feedback & Ratings", link: "/owner/feedback" },
      ]
    },
    {
      id: "employees",
      label: "Employees",
      icon: Users,
      link: "/owner/users",
      subItems: [
        { id: "users", label: "Users & Roles", link: "/owner/users" },
        { id: "permissions", label: "Permissions", link: "/owner/permissions" },
      ]
    },
    {
      id: "reports",
      label: "Reports & Analytics",
      icon: FileBarChart,
      link: "/owner/reports",
      subItems: [
        { id: "sales-rep", label: "Sales Analytics", link: "/owner/sales" },
        { id: "fin-rep", label: "Financial Reports", link: "/owner/reports" },
        { id: "cross-branch", label: "Cross-Branch", link: "/owner/analytics" },
      ]
    },
  ],
  bottom: [
    { id: "settings", label: "System Settings", icon: Settings, link: "/owner/settings" },
    { id: "profile", label: "Profile", icon: UserRound, link: "/owner/profile" },
  ],
};