import React, { useEffect, useState } from "react";
import { useBranchStore } from "@/store/useBranchStore";
import { RestaurantMenu } from "./Menu";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_RESTAURANT, resolveDefaultBranchId } from "@/config/restaurant";
import { ChefHat, Clock, MapPin, Phone, Utensils, Coffee } from "lucide-react";

/**
 * Public home for the single default restaurant.
 *
 * Automatically resolves the existing/default branch from the backend and
 * immediately renders the real restaurant menu — no branch selection, no slug
 * input, no intermediate landing. The menu is the main purpose of this page.
 *
 * Future (multi-restaurant): `resolveDefaultBranchId()` can be extended to pick
 * from a configured set instead of the first active branch. The branch
 * architecture itself is untouched here.
 */
const Home = () => {
  const { fetchPublicBranches } = useBranchStore();
  const [defaultBranchId, setDefaultBranchId] = useState(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let list = [];
      try {
        list = (await fetchPublicBranches()) || [];
      } catch {
        list = [];
      }
      if (cancelled) return;
      // Single source of default-branch resolution lives in the restaurant config.
      const id = resolveDefaultBranchId(list);
      setDefaultBranchId(id);
      setResolving(false);
    })();
    return () => { cancelled = true; };
  }, [fetchPublicBranches]);

  // While resolving the default branch show a branded splash.
  if (resolving) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-orange-500 to-yellow-500 opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="flex flex-col items-center text-center">
              {/* Logo/Icon */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full" />
                <div className="relative size-20 sm:size-24 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30 shadow-2xl">
                  <Coffee className="size-10 sm:size-12 text-white" />
                </div>
              </div>
              
              {/* Restaurant Name */}
              <p className="text-sm sm:text-base uppercase tracking-[0.3em] text-white/90 mb-4 font-medium">
                Welcome to
              </p>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-3 tracking-tight">
                {DEFAULT_RESTAURANT.nameEn}
              </h1>
              {DEFAULT_RESTAURANT.nameAm && (
                <p className="text-xl sm:text-3xl lg:text-4xl font-semibold text-white/95 mb-6">
                  {DEFAULT_RESTAURANT.nameAm}
                </p>
              )}
              
              {/* Tagline */}
              <p className="text-base sm:text-lg text-white/80 max-w-2xl mb-8">
                {DEFAULT_RESTAURANT.tagline}
              </p>
              
              {/* Quick Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <Clock className="size-6 text-white/90 mb-2 mx-auto" />
                  <p className="text-white/80 text-sm">Opening Hours</p>
                  <p className="text-white font-semibold">6:30 AM - 11:00 PM</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <MapPin className="size-6 text-white/90 mb-2 mx-auto" />
                  <p className="text-white/80 text-sm">Location</p>
                  <p className="text-white font-semibold">Addis Ababa</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <Phone className="size-6 text-white/90 mb-2 mx-auto" />
                  <p className="text-white/80 text-sm">Contact</p>
                  <p className="text-white font-semibold">+251 911 123 456</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Loading Skeleton */}
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex-1">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Utensils className="size-5 animate-pulse" />
              <span className="font-medium">Loading our delicious menu...</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-lg">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-6 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If no branch could be resolved, show error state
  if (!defaultBranchId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-amber-200/50 blur-2xl rounded-full" />
            <div className="relative size-20 rounded-3xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-xl">
              <ChefHat className="size-10 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Restaurant Currently Unavailable
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            We're having trouble loading our menu. Please check back soon or contact us directly.
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-center gap-3 text-gray-700 dark:text-gray-300">
              <Phone className="size-5" />
              <span className="font-medium">+251 911 123 456</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Delegate to the shared restaurant menu. It fetches the real menu for the
  // resolved default branch and handles loading / empty / error / browse-vs-order.
  return <RestaurantMenu branchId={defaultBranchId} />;
};

export default Home;
