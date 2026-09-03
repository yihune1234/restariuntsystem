import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useCustomerStore } from "@/store/useCustomerStore";
import { QrCode, Loader2, Lock, ArrowRight, ScanLine } from "lucide-react";
import { STORAGE_KEYS } from "@/axios/axiosInstace";

/**
 * QR landing route — what the printed restaurant QR code encodes.
 *
 * New simplified flow (matches backend paperless-restaurant model):
 *   URL:  /customer/qr/:branchId
 *        (branchId may be encoded in the QR; the qrToken is encoded too
 *         via a separate encoded URL like /customer/qr/<branch>?t=<qrToken>)
 *
 * Backend accepts the QR token via POST /customer-sessions and returns a
 * sessionToken used for all subsequent customer calls.
 *
 * Session persistence: if a valid session token exists in localStorage and
 * matches the branch, skip QR token verification and go straight to menu.
 */
const CustomerQrLanding = () => {
  const { branch } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { startSession, fetchMenu, session, validateSession, resolveBranchFromToken } = useCustomerStore();
  const [status, setStatus] = useState("checking"); // checking | ok | locked | invalid | restored
  const [tableNumber, setTableNumber] = useState(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const qrToken = searchParams.get("t") || searchParams.get("token") || "";

    (async () => {
      // 1. First, check if we have a valid existing session for this branch
      const existingToken = localStorage.getItem(STORAGE_KEYS.customerSessionToken);
      if (existingToken && session?.branchId === branch) {
        done.current = true;
        setTableNumber(session?.table?.tableNumber || null);
        setStatus("restored");
        await fetchMenu(branch);
        setTimeout(() => navigate(`/customer/menu/${branch}`, { replace: true }), 400);
        return;
      }

      // 1b. No session yet, but no ?t= token either. Older printed QR codes
      // placed the TOKEN in the branch slot (`/customer/qr/<qrToken>`).
      // Self-heal: resolve the branch from that token (or any token-shaped
      // param) so the customer still reaches the menu instead of a dead end.
      if (!qrToken) {
        const candidate = branch && !/^[a-f\d]{24}$/i.test(branch) ? branch : null;
        const resolved = candidate ? await resolveBranchFromToken(candidate) : null;
        if (resolved?.branchId) {
          done.current = true;
          setTableNumber(resolved.tableNumber || null);
          setStatus("ok");
          await fetchMenu(resolved.branchId);
          setTimeout(() => navigate(`/customer/menu/${resolved.branchId}`, { replace: true }), 400);
          return;
        }
        setStatus("invalid");
        return;
      }
      done.current = true;
      const res = await startSession(qrToken);
      if (res?.success) {
        setTableNumber(res.session?.table?.tableNumber || null);
        setStatus("ok");
        await fetchMenu(res.session?.branchId || branch);
        setTimeout(() => navigate(`/customer/menu/${branch}`, { replace: true }), 400);
      } else {
        setStatus("locked");
      }
    })();
  }, [branch, searchParams, startSession, fetchMenu, navigate, session, resolveBranchFromToken]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md p-8 rounded-3xl border border-white/40 dark:border-gray-700 shadow-2xl">
        <div className="relative mx-auto size-24 mb-4">
          <div className="absolute inset-0 bg-amber-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative size-full bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl transform rotate-3 transition-transform hover:rotate-6">
            <QrCode className="size-12 animate-bounce-slow" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Connecting...</h1>

        {status === "checking" && (
          <p className="text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2 font-medium">
            <Loader2 className="size-5 animate-spin text-amber-500" /> Verifying table session
          </p>
        )}

        {status === "ok" && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="inline-flex items-center justify-center gap-2 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-4 py-2 rounded-full font-bold shadow-sm">
              <ArrowRight className="size-4" /> Connected
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {tableNumber ? `Table ${tableNumber}` : "Ordering enabled"}
            </p>
            {session?.branch?.name && (
              <p className="text-xs text-gray-500">{session.branch.name}</p>
            )}
          </div>
        )}

        {status === "restored" && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="inline-flex items-center justify-center gap-2 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-4 py-2 rounded-full font-bold shadow-sm">
              <ArrowRight className="size-4" /> Welcome back
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {tableNumber ? `Table ${tableNumber}` : "Resuming session"}
            </p>
            {session?.branch?.name && (
              <p className="text-xs text-gray-500">{session.branch.name}</p>
            )}
          </div>
        )}

        {status === "locked" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="inline-flex items-center justify-center gap-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-full font-bold shadow-sm">
              <Lock className="size-4" /> Code Expired
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This QR code appears to be outdated or invalid. Please ask a staff member for a fresh code to place orders.
            </p>
            <button
              onClick={() => navigate(`/customer/menu/${branch}`)}
              className="mt-4 w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              View menu only
            </button>
          </div>
        )}

        {status === "invalid" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="inline-flex items-center justify-center gap-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-4 py-2 rounded-full font-bold shadow-sm">
              <ScanLine className="size-4" /> Invalid Code
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please scan the QR code placed on your table.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerQrLanding;