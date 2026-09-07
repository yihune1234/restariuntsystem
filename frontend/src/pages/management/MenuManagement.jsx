import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { useMenuStore } from "@/store/useMenuStore";
import AdminLayout from "./AdminLayout";
import MenuItemsPage from "./MenuItemsPage";
import CategoriesPage from "./CategoriesPage";
import MealPeriodsPage from "./MealPeriodsPage";
import BrandingPage from "./BrandingPage";

const MenuManagement = () => {
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const { fetchMenu, categories } = useMenuStore();
  const [activeTab, setActiveTab] = useState("items");

  useEffect(() => {
    if (!authUser) {
      navigate("/login");
      return;
    }
    fetchMenu();
  }, [authUser, navigate, fetchMenu]);

  if (!authUser) return null;

  return (
    <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === "items" && (
        <MenuItemsPage categories={categories} onRefresh={fetchMenu} />
      )}
      {activeTab === "categories" && (
        <CategoriesPage onRefresh={fetchMenu} />
      )}
      {activeTab === "mealPeriods" && (
        <MealPeriodsPage onRefresh={fetchMenu} />
      )}
      {activeTab === "branding" && (
        <BrandingPage />
      )}
    </AdminLayout>
  );
};

export default MenuManagement;
