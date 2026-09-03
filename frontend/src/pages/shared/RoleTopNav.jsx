import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useI18nStore, languages } from "@/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Moon, Sun, Globe, User, LogOut, UtensilsCrossed,
  Search, Bell, ChevronDown, Settings, HelpCircle,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

const MAX_VISIBLE_ITEMS = 7;

/**
 * Professional branded top navigation.
 * Desktop: Full brand + nav items + search + actions + user.
 * Tablet: Compact nav with overflow in "More" dropdown.
 * Navigation items are sourced from roleConfig per authenticated role.
 */
const RoleTopNav = ({ navItems = [], bottomItems = [], onMobileMenuOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { authUser, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { lang, setLang } = useI18nStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef(null);

  // Combine all nav items for display
  const allItems = [...navItems, ...bottomItems];
  const visibleItems = allItems.slice(0, MAX_VISIBLE_ITEMS);
  const overflowItems = allItems.slice(MAX_VISIBLE_ITEMS);

  // Close search on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setSearchOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const isActive = (link) => location.pathname === link;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        {/* Left: Brand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Mobile hamburger */}
          <button
            onClick={onMobileMenuOpen}
            className="xl:hidden text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open menu"
          >
            <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <button
            onClick={() => navigate(`/${authUser?.role?.toLowerCase()}/dashboard`)}
            className="flex items-center gap-2.5 group"
            aria-label="Go to dashboard"
          >
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
              <UtensilsCrossed className="size-5 text-primary-foreground" />
            </div>
            <div className="hidden lg:block leading-none">
              <span className="text-sm font-bold tracking-tight">Faarees</span>{" "}
            </div>
          </button>
        </div>

        {/* Center: Desktop navigation */}
        <nav className="hidden xl:flex items-center gap-1 flex-1 min-w-0">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.link);
            return (
              <Link key={item.id} to={item.link}>
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}

          {/* Overflow dropdown */}
          {overflowItems.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground"
                >
                  <MoreHorizontal className="size-4" />
                  <span className="hidden 2xl:inline">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {overflowItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.id} asChild>
                      <Link to={item.link} className="flex items-center gap-2 w-full cursor-pointer">
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          {/* Search */}
          {searchOpen ? (
            <div className="relative" ref={searchRef}>
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search orders, menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                autoFocus
                className="h-8 w-48 pl-9 text-sm"
              />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <Search className="size-4" />
            </Button>
          )}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 relative" aria-label="Notifications">
                <Bell className="size-4" />
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-background" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-sm font-semibold">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-4 text-center text-sm text-muted-foreground">
                No new notifications
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          {/* Language — desktop only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 hidden lg:inline-flex"
                aria-label="Language"
              >
                <Globe className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel className="text-xs">Language</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {languages.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={lang === l.code ? "bg-accent" : ""}
                >
                  <span className="mr-2 text-xs">{l.short}</span>
                  <span className="text-sm">{l.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Divider */}
          <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-1.5 sm:px-2">
                <Avatar className="size-7">
                  {authUser?.avatar && <AvatarImage src={authUser.avatar} />}
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                    {authUser?.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex items-center gap-1 text-left">
                  <div className="leading-none">
                    <div className="text-sm font-medium max-w-[100px] truncate">{authUser?.name}</div>
                    <div className="text-[10px] text-muted-foreground capitalize">{authUser?.role}</div>
                  </div>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="p-2">
                <div className="text-sm font-semibold">{authUser?.name}</div>
                <div className="text-xs font-normal text-muted-foreground capitalize">
                  {authUser?.role}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Language inside dropdown on mobile */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="lg:hidden">
                  <Globe className="size-4 mr-2" />
                  <span className="text-sm">Language</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {languages.find((l) => l.code === lang)?.short || lang}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-36">
                    {languages.map((l) => (
                      <DropdownMenuItem
                        key={l.code}
                        onClick={() => setLang(l.code)}
                        className={lang === l.code ? "bg-accent" : ""}
                      >
                        <span className="mr-2 text-xs">{l.short}</span>
                        <span className="text-sm">{l.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuItem className="gap-2" asChild>
                <Link to={`/${authUser?.role?.toLowerCase()}/profile`}>
                  <User className="size-4" />
                  <span className="text-sm">Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" asChild>
                <Link to={`/${authUser?.role?.toLowerCase()}/branch-settings`}>
                  <Settings className="size-4" />
                  <span className="text-sm">Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <HelpCircle className="size-4" />
                <span className="text-sm">Help & Support</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-red-500 focus:text-red-600" onClick={logout}>
                <LogOut className="size-4" />
                <span className="text-sm">Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default RoleTopNav;
