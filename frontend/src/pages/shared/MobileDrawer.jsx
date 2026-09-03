import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, LogOut, ChevronRight, UtensilsCrossed } from "lucide-react";

/**
 * Modern mobile navigation drawer.
 * Full user info at top, complete nav for the role, clear active states.
 */
const MobileDrawer = ({ isOpen, onClose, navItems = [], bottomItems = [], title }) => {
  const location = useLocation();
  const { authUser, logout } = useAuthStore();

  const isActive = (link) => location.pathname === link;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-background",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Header with user info */}
        <div className="flex flex-col h-full">
          {/* Top section — branding + close */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <UtensilsCrossed className="size-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight">
                  Tasty <span className="font-normal text-muted-foreground">Station</span>
                </h1>
                <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-widest">
                  {title || authUser?.role}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* User info card */}
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                {authUser?.avatar && <AvatarImage src={authUser.avatar} />}
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {authUser?.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{authUser?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{authUser?.role}</p>
                {authUser?.branchId && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Branch assigned
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2">
                  Menu
                </p>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const hasSubItems = item.subItems && item.subItems.length > 0;
                  const active = isActive(item.link) || (hasSubItems && item.subItems.some(sub => isActive(sub.link)));
                  
                  return (
                    <div key={item.id} className="mb-1">
                      <Link to={hasSubItems ? "#" : item.link} onClick={hasSubItems ? undefined : onClose}>
                        <div
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer",
                            "hover:bg-accent hover:text-accent-foreground",
                            active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                          )}
                        >
                          <Icon className={cn("size-5", active && "text-primary")} />
                          <span className="flex-1 text-sm">{item.label}</span>
                          {!hasSubItems && active && (
                            <ChevronRight className="size-4 text-primary" />
                          )}
                        </div>
                      </Link>
                      
                      {hasSubItems && (
                        <div className="mt-1 space-y-1 ml-4 pl-4 border-l border-border/50">
                          {item.subItems.map((sub) => {
                            const isSubActive = isActive(sub.link);
                            return (
                              <Link key={sub.id} to={sub.link} onClick={onClose}>
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
              </>
            )}

            {bottomItems.length > 0 && (
              <>
                <div className="h-px bg-border my-3" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2">
                  More
                </p>
                {bottomItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.link);
                  return (
                    <Link key={item.id} to={item.link} onClick={onClose}>
                      <div
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer",
                          "hover:bg-accent hover:text-accent-foreground",
                          active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                        )}
                      >
                        <Icon className={cn("size-5", active && "text-primary")} />
                        <span className="flex-1 text-sm">{item.label}</span>
                        {active && (
                          <ChevronRight className="size-4 text-primary" />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Bottom — logout */}
          <div className="p-3 border-t">
            <button
              onClick={() => { onClose(); logout(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors"
            >
              <LogOut className="size-5" />
              <span className="font-medium text-sm">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileDrawer;
