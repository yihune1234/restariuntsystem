/**
 * Manual / Offline entry status mappings + helpers, shared by the cashier and
 * manager manual-entry screens.
 *
 * Lifecycle (matches the backend offline-transaction model):
 *   DRAFT -> PENDING -> APPROVED -> APPLIED
 *                     \-> REJECTED / CANCELLED
 */
export const MANUAL_ENTRY_STATUS = {
  DRAFT: { label: "Draft", badge: "outline", text: "text-slate-600", border: "border-slate-300" },
  PENDING: { label: "Pending Approval", badge: "secondary", text: "text-yellow-700", border: "border-yellow-300" },
  APPROVED: { label: "Approved", badge: "secondary", text: "text-blue-700", border: "border-blue-300" },
  APPLIED: { label: "Applied to System", badge: "default", text: "text-green-700", border: "border-green-300" },
  REJECTED: { label: "Rejected", badge: "destructive", text: "text-red-700", border: "border-red-300" },
  CANCELLED: { label: "Cancelled", badge: "destructive", text: "text-slate-500", border: "border-slate-300" },
};

export const MANUAL_ENTRY_STATUS_ORDER = ["DRAFT", "PENDING", "APPROVED", "APPLIED", "REJECTED", "CANCELLED"];

/** Human-readable "Applied to System" summary from the backend result. */
export function appliedSummary(tx) {
  if (String(tx.status || "").toUpperCase() !== "APPLIED") return null;
  return tx.applicationResult?.appliedText || tx.applicationResult?.orderNumber || null;
}