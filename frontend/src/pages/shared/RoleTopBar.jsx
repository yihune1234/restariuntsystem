import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useI18nStore, languages } from "@/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Globe, User, LogOut, Menu, UtensilsCrossed } from "lucide-react";
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

/**
 * Premium compact branded top bar.
 * Displays restaurant branding + essential actions (theme, language, user).
 * The sidebar remains the main navigation — this bar does NOT duplicate it.
 */
const RoleTopBar = ({ onMenuToggle, showMenuButton }) => {
  const navigate = useNavigate();
  const { authUser, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { lang, setLang } = useI18nStore();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-12 items-center gap-2 px-3 lg:px-6">
        {/* Left: mobile menu toggle + branding */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {showMenuButton && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
          )}

          {/* Branding — compact */}
          <button
            onClick={() => navigate(`/${authUser?.role?.toLowerCase()}/dashboard`)}
            className="flex items-center gap-2 group"
            aria-label="Go to dashboard"
          >
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <UtensilsCrossed className="size-4 text-primary-foreground" />
            </div>
            <div className="hidden sm:block leading-none">
              <span className="text-sm font-bold tracking-tight">Tasty</span>{" "}
              <span className="text-sm font-medium text-muted-foreground tracking-tight">Station</span>
            </div>
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
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

          {/* Language — desktop/tablet only, moves to user dropdown on mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 hidden sm:inline-flex"
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
                <span className="hidden md:inline text-sm font-medium max-w-[100px] truncate">
                  {authUser?.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="p-2">
                <div className="text-sm font-semibold">{authUser?.name}</div>
                <div className="text-xs font-normal text-muted-foreground capitalize">
                  {authUser?.role}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Language inside user dropdown on mobile */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="sm:hidden">
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

              <DropdownMenuItem className="gap-2" onClick={() => navigate(`/${authUser?.role?.toLowerCase()}/profile`)}>
                <User className="size-4" />
                <span className="text-sm">Profile</span>
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

export default RoleTopBar;
