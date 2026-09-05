import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  Menu,
  QrCode,
  Users,
  FileBarChart,
  UserRound,
  DollarSign,
} from "lucide-react";

export const cashierNav = {
  title: "Cashier",
  items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, link: "/cashier/dashboard" },
    { id: "orders", label: "Orders", icon: ShoppingCart, link: "/cashier/create" },
    { id: "payments", label: "Payments", icon: DollarSign, link: "/cashier/payments" },
  ],
  bottom: [{ id: "profile", label: "Profile", icon: UserRound, link: "/cashier/profile" }],
};

export const kitchenNav = {
  title: "Kitchen",
  items: [
    { id: "dashboard", label: "Kitchen Board", icon: ChefHat, link: "/kitchen/dashboard" },
  ],
  bottom: [{ id: "profile", label: "Profile", icon: UserRound, link: "/kitchen/profile" }],
};

export const managerNav = {
  title: "Manager",
  items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, link: "/manager/dashboard" },
    { id: "create", label: "Create Order", icon: ShoppingCart, link: "/manager/create" },
    { id: "orders", label: "Orders", icon: ShoppingCart, link: "/manager/orders" },
    { id: "kitchen", label: "Kitchen", icon: ChefHat, link: "/manager/kitchen" },
    { id: "tables", label: "Tables & QR", icon: QrCode, link: "/manager/tables" },
    { id: "menu", label: "Menu", icon: Menu, link: "/manager/menu" },
    { id: "staff", label: "Employees", icon: Users, link: "/manager/staff" },
    { id: "reports", label: "Reports", icon: FileBarChart, link: "/manager/reports" },
  ],
  bottom: [{ id: "profile", label: "Profile", icon: UserRound, link: "/manager/profile" }],
};

export const ownerNav = {
  title: "Owner",
  items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, link: "/owner/dashboard" },
    { id: "create", label: "Create Order", icon: ShoppingCart, link: "/owner/create" },
    { id: "orders", label: "Orders", icon: ShoppingCart, link: "/owner/orders" },
    { id: "tables", label: "Tables & QR", icon: QrCode, link: "/owner/tables" },
    { id: "menu", label: "Menu", icon: Menu, link: "/owner/menu" },
    { id: "employees", label: "Employees", icon: Users, link: "/owner/employees" },
    { id: "reports", label: "Reports", icon: FileBarChart, link: "/owner/reports" },
  ],
  bottom: [{ id: "profile", label: "Profile", icon: UserRound, link: "/owner/profile" }],
};
