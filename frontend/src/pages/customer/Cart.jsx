import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCustomerStore } from "@/store/useCustomerStore";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingBag, ChevronRight, Coffee, Trash2, Minus, Plus } from "lucide-react";

const CustomerCart = () => {
  const { branch } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { cart, addToCart, removeFromCart, clearCart, getCartTotal } = useCustomerStore();

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
        <div className="max-w-2xl mx-auto px-4 py-8 w-full">
          <button
            onClick={() => navigate(`/customer/menu/${branch}`)}
            className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium mb-6 transition-colors"
          >
            <ChevronRight className="size-4 rotate-180" /> Back to Menu
          </button>

          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-amber-200/50 blur-3xl rounded-full" />
              <div className="relative size-24 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center shadow-2xl">
                <ShoppingBag className="size-12 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Your Cart is Empty
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm mb-8">
              Looks like you haven't added anything yet. Browse our menu and discover delicious items!
            </p>

            <Button
              className="bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg shadow-amber-500/30"
              onClick={() => navigate(`/customer/menu/${branch}`)}
            >
              <Coffee className="size-5 mr-2" /> Browse Menu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-36">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/customer/menu/${branch}`)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              <ChevronRight className="size-4 rotate-180" /> Menu
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Your Cart</h1>
            <button
              className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
              onClick={clearCart}
            >
              Clear All
            </button>
          </div>
        </div>
      </header>

      {/* Cart Items */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {cart.map((c) => (
          <div
            key={c.foodItemId}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white">{c.foodName}</h3>
              {c.notes && (
                <p className="text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 inline-block mt-1">
                  {"\u26a0"} {c.notes}
                </p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {c.unitPrice?.toLocaleString()} ETB each
              </p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
                {(c.unitPrice * c.quantity).toLocaleString()} ETB
              </p>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-1">
              <button
                onClick={() => removeFromCart(c.foodItemId)}
                className="size-9 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors shadow-sm"
              >
                {c.quantity === 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
              </button>
              <span className="w-8 text-center font-bold text-gray-900 dark:text-white">{c.quantity}</span>
              <button
                onClick={() => addToCart({ _id: c.foodItemId, name: c.foodName, price: c.unitPrice })}
                className="size-9 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 transition-colors shadow-sm"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </main>

      {/* Sticky Footer with Total & Checkout */}
      <div className="fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-2xl">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-medium text-gray-700 dark:text-gray-300">Order Total</span>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {getCartTotal().toLocaleString()} ETB
            </span>
          </div>
          <Button
            className="w-full h-14 text-base font-semibold bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white rounded-2xl shadow-lg shadow-amber-500/30"
            onClick={() => navigate(`/customer/checkout/${branch}`)}
          >
            Proceed to Checkout <ChevronRight className="size-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomerCart;
