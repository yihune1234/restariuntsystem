/**
 * Single source of truth for payment methods across the entire app.
 *
 * Keeping this in one shared module prevents the duplicate/divergent lists that
 * previously lived in several stores and pages (some missing BANK_TRANSFER,
 * some in different order). The canonical list mirrors the values the backend
 * accepts (see backend/src/modules/payments/payment.validation.js):
 *
 *   CASH, CARD, CHAPA, TELEBIRR, BANK_TRANSFER
 *
 * Each entry exposes a display `label` and an optional Lucide `icon` for UIs
 * that want one. The base list is also exported for simple <select>/<option>
 * rendering.
 */
import { Wallet, CreditCard, Smartphone, Building2, Landmark } from "lucide-react";

export const PAYMENT_METHODS = ["CASH", "CARD", "CHAPA", "TELEBIRR", "BANK_TRANSFER"];

export const PAYMENT_METHOD_OPTIONS = [
  { id: "CASH", label: "Cash", icon: Wallet },
  { id: "CARD", label: "Card", icon: CreditCard },
  { id: "CHAPA", label: "Chapa (Online)", icon: Building2 },
  { id: "TELEBIRR", label: "Telebirr", icon: Smartphone },
  { id: "BANK_TRANSFER", label: "Bank Transfer", icon: Landmark },
];

/** Map a payment method / provider to a human-friendly display label. */
export const PAYMENT_METHOD_LABEL = (value) => {
  const found = PAYMENT_METHOD_OPTIONS.find(
    (m) => m.id === value || m.label.toLowerCase() === String(value || "").toLowerCase()
  );
  return found?.label || value || "Other";
};