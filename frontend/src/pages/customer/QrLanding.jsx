import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useCustomerStore } from "@/store/useCustomerStore";
import { Loader2, AlertCircle } from "lucide-react";
import { STORAGE_KEYS } from "@/axios/axiosInstace";
import { DEFAULT_BRANCH_ID } from "@/config/restaurant";

/**
 * QR landing route — what the printed restaurant QR code encodes.
 *
 * Simplified flow: scan QR → create session → redirect immediately to menu browse.
 * No intermediate "Connected" screen - goes straight to the menu like unscan browsing.
 */
const CustomerQrLanding = () => {
  const { branch } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    startSession,
    fetchMenu,
    restoreSession,
    session,
    canOrder,
    resolveBranchFromToken,
  } = useCustomerStore();
  const done = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (done.current) return;
    const qrToken = searchParams.get("t") || searchParams.get("token") || "";

    (async () => {
      // 1. If we already have a session token, try to restore the active
      //    session (covers page refreshes and repeat scans). If it's valid we
      //    can go straight to ordering.
      const existingToken = localStorage.getItem(STORAGE_KEYS.customerSessionToken);
      if (existingToken) {
        const restored = await restoreSession();
        if (restored.success) {
          done.current = true;
          await fetchMenu();
          navigate(`/customer/menu/${DEFAULT_BRANCH_ID}`, { replace: true });
          return;
        }
        // Invalid/expired token; fall through to start a fresh session with the
        // token carried by this URL (if present).
      }

      // 2b. No session token, but an older printed QR encoded the slug/branch
      //     directly in the path (no ?t= query). Resolve it for a browse-only
      //     experience (no ordering available).
      if (!qrToken) {
        const candidate = branch && !/^[a-f\d]{24}$/i.test(branch) ? branch : null;
        const resolved = candidate ? await resolveBranchFromToken(candidate) : null;
        done.current = true;
        await fetchMenu();
        navigate(`/customer/menu/${resolved?.branchId || DEFAULT_BRANCH_ID}`, { replace: true });
        return;
      }

      // 3. Normal QR scan: ?t=<qrToken>. Start a customer session so the guest
      //    can add items to cart and place an order.
      done.current = true;
      const res = await startSession(qrToken);
      if (!res?.success) {
        // Session failed (invalid/expired QR). Show the error and let the user
        // try to resean / browse the menu without ordering.
        setError(res?.message || "This QR code is no longer valid. Please ask staff for assistance.");
        return;
      }
      await fetchMenu();
      navigate(`/customer/menu/${DEFAULT_BRANCH_ID}`, { replace: true });
    })();
  }, [branch, searchParams, startSession, fetchMenu, restoreSession, navigate, resolveBranchFromToken, session, canOrder]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mx-auto shadow-sm">
            <AlertCircle className="size-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">QR Code Not Recognized</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => navigate(`/customer/menu/${DEFAULT_BRANCH_ID}`, { replace: true })}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 text-white font-semibold shadow-md hover:shadow-lg transition"
            >
              Browse Menu
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-white dark:hover:bg-gray-800 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center gap-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-full font-bold shadow-sm">
          <Loader2 className="size-5 animate-spin" /> Loading menu...
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please wait while we prepare your dining experience
        </p>
      </div>
    </div>
  );
};

export default CustomerQrLanding;
