import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCustomerStore } from "@/store/useCustomerStore";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Minus, Plus, ShoppingCart, ArrowLeft, QrCode,
  Clock, CheckCircle2, AlertCircle,
} from "lucide-react";

const getDisplayName = (entity, lang) => {
  if (!entity) return "";
  if (lang === "om" && entity.nameOm) return entity.nameOm;
  if (lang === "am" && entity.nameAm) return entity.nameAm;
  if (lang === "en" && entity.nameEn) return entity.nameEn;
  return entity.name || entity.nameEn || "";
};

const getDescription = (entity, lang) => {
  if (!entity) return "";
  if (lang === "om" && entity.descriptionOm) return entity.descriptionOm;
  if (lang === "am" && entity.descriptionAm) return entity.descriptionAm;
  if (lang === "en" && entity.descriptionEn) return entity.descriptionEn;
  return entity.description || entity.descriptionEn || "";
};

const CustomerItem = () => {
  const { branch, itemId } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { flatItems, cart, addToCart, canOrder } = useCustomerStore();
  const [qty, setQty] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");

  const item = flatItems.find((i) => i._id === itemId || i.id === itemId);

  if (!flatItems.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="size-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <AlertCircle className="size-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Item Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400">This menu item may no longer be available.</p>
          <Button onClick={() => navigate(`/customer/menu/${branch}`)} className="bg-amber-600 hover:bg-amber-700">
            Back to Menu
          </Button>
        </div>
      </div>
    );
  }

  const translatedName = getDisplayName(item, lang);
  const translatedDesc = getDescription(item, lang);
  const inCart = cart.find((c) => c.foodItemId === (item._id || item.id))?.quantity || 0;
  const inStock = !item.isSoldOut && item.stockStatus !== "SOLD_OUT";
  const isLowStock = item.stockStatus === "LOW_STOCK" && !item.isSoldOut;
  const price = Number(item.price || 0);

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) {
      addToCart({ ...item, notes: specialInstructions });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Image */}
      <div className="relative">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={translatedName}
            className="w-full h-72 object-cover"
          />
        ) : (
          <div className="w-full h-72 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
            <div className="text-6xl">🍽️</div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <button
          onClick={() => navigate(`/customer/menu/${branch}`)}
          className="absolute top-4 left-4 size-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="size-5 text-gray-700 dark:text-gray-300" />
        </button>
        {!inStock && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <Badge className="bg-red-500 text-white text-base font-bold px-6 py-2 rounded-full">
              Currently Unavailable
            </Badge>
          </div>
        )}
        {isLowStock && inStock && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-amber-500 text-white font-semibold px-3 py-1 rounded-full">
              Low Stock
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-8 relative">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{translatedName}</h1>
              <div className="text-right flex-shrink-0">
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{price.toLocaleString()}</span>
                <span className="text-sm text-gray-500 ml-1">ETB</span>
              </div>
            </div>

            {translatedDesc && (
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{translatedDesc}</p>
            )}

            {item.preparationTimeMinutes && (
              <div className="flex items-center gap-2 mt-4 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="size-4" />
                <span>~{item.preparationTimeMinutes} min preparation time</span>
              </div>
            )}

            {/* Add-ons / Customizations placeholder */}
            {item.addOns && item.addOns.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Customize Your Order</h3>
                <div className="space-y-2">
                  {item.addOns.map((addon, idx) => (
                    <label key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="size-4 text-amber-600 rounded" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{addon.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">+{addon.price} ETB</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Special Instructions */}
            {canOrder && inStock && (
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Special Instructions</h3>
                <Textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any allergies or special requests? Let us know here..."
                  className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 rounded-xl resize-none text-sm"
                  rows={2}
                />
              </div>
            )}
          </div>

          {/* Quantity & Add to Cart */}
          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
            {!canOrder ? (
              <div className="space-y-3">
                <Button
                  className="w-full h-14 text-base font-semibold bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600"
                  disabled
                >
                  <QrCode className="size-5 mr-2" /> Viewing Only — Scan QR to Order
                </Button>
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                  Browse the full menu and details here. Ordering requires scanning the table QR code.
                </p>
              </div>
            ) : !inStock ? (
              <Button className="w-full h-14 text-base font-semibold" disabled variant="outline">
                Currently Unavailable
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      disabled={qty <= 1}
                      className="size-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-xl text-gray-900 dark:text-white">{qty}</span>
                    <button
                      onClick={() => setQty(qty + 1)}
                      className="size-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

                <Button
                  className="w-full h-14 text-base font-semibold bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 shadow-lg shadow-amber-500/30"
                  onClick={handleAdd}
                >
                  <ShoppingCart className="size-5 mr-2" />
                  Add to Cart — {(price * qty).toLocaleString()} ETB
                </Button>

                {inCart > 0 && (
                  <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
                    <CheckCircle2 className="size-4" />
                    <span>{inCart} already in your cart</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Back to Menu Link */}
        <div className="text-center py-6">
          <button
            onClick={() => navigate(`/customer/menu/${branch}`)}
            className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
          >
            ← Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerItem;
