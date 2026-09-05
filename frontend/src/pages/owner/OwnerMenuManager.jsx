import React from "react";
import { useTranslation } from "@/i18n";
import { UtensilsCrossed } from "lucide-react";
import MenuManager from "../shared/MenuManager";

const OwnerMenuManager = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <UtensilsCrossed className="size-5" /> {t('owner.branchMenu', 'Menu Management')}
        </h1>
        <p className="text-sm text-muted-foreground">Manage categories and food items</p>
      </div>
      <MenuManager />
    </div>
  );
};

export default OwnerMenuManager;
