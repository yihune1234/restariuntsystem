import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { LayoutGrid, FolderTree, Store, Clock, ExternalLink, LogOut, Menu, X, ChevronLeft } from "lucide-react";

const AdminLayout = ({ children, activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  const { authUser, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { id: "items", label: "Items", icon: LayoutGrid },
    { id: "categories", label: "Categories", icon: FolderTree },
    { id: "mealPeriods", label: "Meal Periods", icon: Clock },
    { id: "branding", label: "Settings", icon: Store },
  ];

  const getPageTitle = () => {
    const titles = {
      items: "Menu Items",
      categories: "Categories",
      mealPeriods: "Meal Periods",
      branding: "Branding & Settings",
    };
    return titles[activeTab] || "Dashboard";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar - Fixed Left */}
      <aside className="hidden lg:flex w-64 min-h-screen bg-[#1E1E1E] text-white flex-col fixed left-0 top-0 bottom-0 z-50">
        {/* Brand */}
        <div className="p-5 border-b border-gray-700">
          <h1 className="text-lg font-bold text-amber-400">Faarees Kafee</h1>
          <p className="text-xs text-gray-400 mt-0.5">Menu Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/25"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <item.icon className="size-5" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom - User & Logout */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center">
              <span className="text-sm font-bold">{authUser?.name?.charAt(0) || "A"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{authUser?.name}</p>
              <p className="text-xs text-gray-400">{authUser?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-[#1E1E1E] z-40 border-b border-gray-700">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-amber-400 hover:bg-gray-800 rounded-lg"
            >
              <Menu className="size-5" />
            </button>
            <h1 className="text-base font-semibold text-amber-400">{getPageTitle()}</h1>
          </div>
          <button
            onClick={() => window.open("/menu", "_blank")}
            className="p-2 -mr-2 text-amber-400 hover:bg-gray-800 rounded-lg"
          >
            <ExternalLink className="size-5" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#1E1E1E] text-white">
            <div className="p-5 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-amber-400">Faarees Kafee</h1>
                <p className="text-xs text-gray-400">{authUser?.name} · {authUser?.role}</p>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    activeTab === item.id
                      ? "bg-amber-600 text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <item.icon className="size-5" />
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition"
              >
                <LogOut className="size-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="lg:ml-64">
        {/* Mobile Spacer for Fixed Header */}
        <div className="h-14 lg:hidden" />

        {/* Page Content */}
        <div className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
