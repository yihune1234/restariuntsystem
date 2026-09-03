import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { LogOut, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, UtensilsCrossed } from "lucide-react";

/**
 * Generic role sidebar. Each role provides its menu items.
 */
const RoleSidebar = ({ title, items = [], bottomItems = [] }) => {
  const { logout } = useAuthStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (id, e) => {
    if (e) e.preventDefault();
    if (collapsed) {
      setCollapsed(false);
      setExpandedSections({ [id]: true });
    } else {
      setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
    }
  };

  const isItemActive = (item) => {
    if (location.pathname === item.link) return true;
    if (item.subItems) {
      return item.subItems.some((sub) => location.pathname === sub.link);
    }
    return false;
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-background border-r transition-all duration-300 relative",
        collapsed ? "w-20" : "w-64 max-md:w-56"
      )}
    >
      {/* Header */}
      <div className="p-5 border-b">
        <div className={cn("flex items-center justify-between", collapsed && "justify-center")}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="size-9 bg-primary rounded-lg flex items-center justify-center shadow-md">
                <UtensilsCrossed className="size-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight tracking-tight">
                  Tasty <span className="font-normal text-muted-foreground">Station</span>
                </h1>
                <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-widest">
                  {title}
                </p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="size-10 bg-primary rounded-lg flex items-center justify-center shadow-md">
              <UtensilsCrossed className="size-5 text-primary-foreground" />
            </div>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted-foreground hover:text-primary absolute -right-3 top-7 bg-background border rounded-full size-6 flex items-center justify-center shadow-sm z-10"
              aria-label="Toggle sidebar"
            >
              {collapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item);
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedSections[item.id];

          return (
            <div key={item.id} className="relative group">
              <Link to={hasSubItems ? "#" : item.link} onClick={(e) => hasSubItems && toggleSection(item.id, e)}>
                <div
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground",
                    collapsed && "justify-center"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn("size-5", isActive && "text-primary", collapsed && "mx-auto")} />
                  {!collapsed && (
                    <span className="font-medium flex-1 text-left">{item.label}</span>
                  )}
                  {!collapsed && item.badge > 0 && (
                    <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  {!collapsed && hasSubItems && (
                    isExpanded ? <ChevronUp className="size-4 opacity-50" /> : <ChevronDown className="size-4 opacity-50" />
                  )}
                </div>
              </Link>
              
              {/* Sub items rendered if expanded and not collapsed */}
              {!collapsed && hasSubItems && isExpanded && (
                <div className="mt-1 space-y-1 ml-4 pl-4 border-l border-border/50">
                  {item.subItems.map((sub) => {
                    const isSubActive = location.pathname === sub.link;
                    return (
                      <Link key={sub.id} to={sub.link}>
                        <div
                          className={cn(
                            "w-full flex items-center px-3 py-2 rounded-md text-sm transition-all duration-200 cursor-pointer",
                            isSubActive
                              ? "text-primary font-semibold bg-primary/5"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          )}
                        >
                          {sub.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 space-y-1 border-t">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.link;
          return (
            <Link key={item.id} to={item.link}>
              <div
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  collapsed && "justify-center"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={cn("size-5", collapsed && "mx-auto")} />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </div>
            </Link>
          );
        })}
        <button
          onClick={logout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="size-5" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default RoleSidebar;