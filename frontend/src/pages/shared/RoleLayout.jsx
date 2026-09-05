import React, { useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import RoleSidebar from "./RoleSidebar";
import MobileDrawer from "./MobileDrawer";
import {
  cashierNav,
  kitchenNav,
  managerNav,
  ownerNav,
} from "./roleConfig";
import { UtensilsCrossed } from "lucide-react";

const ROLE_NAV = {
  cashier: cashierNav,
  kitchen: kitchenNav,
  manager: managerNav,
  owner: ownerNav,
};

/**
 * Shared layout for all staff roles.
 * Desktop: Sidebar navigation (collapsible).
 * Mobile: Hamburger menu opens a slide-out drawer.
 */
const RoleLayout = ({ role }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const nav = ROLE_NAV[role] || { items: [], bottom: [] };

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((v) => !v), []);

  // Close drawer on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") closeDrawer(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeDrawer]);

  return (
    <div className="w-full h-screen flex bg-background overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <RoleSidebar
          title={nav.title}
          items={nav.items}
          bottomItems={nav.bottom}
        />
      </div>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex items-center px-4 gap-3">
        <button
          onClick={toggleDrawer}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <svg className="size-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
            <UtensilsCrossed className="size-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm">Tasty Station</span>
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        navItems={nav.items}
        bottomItems={nav.bottom}
        title={nav.title}
      />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar lg:pt-0 pt-14">
        <Outlet context={{ closeDrawer }} />
      </div>
    </div>
  );
};

export default RoleLayout;
