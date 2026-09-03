import { Clock, CheckCircle2, Flame, Package, XCircle } from "lucide-react";

/** Order status meta information. */
export const STATUS_META = {
  WAITING_FOR_PAYMENT: {
    label: "Payment Pending",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    icon: CheckCircle2,
  },
  PREPARING: {
    label: "Preparing",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    icon: Flame,
  },
  READY: {
    label: "Ready",
    color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    icon: CheckCircle2,
  },
  TAKEN_BY_WAITER: {
    label: "Picked up",
    color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
    icon: Package,
  },
  DELIVERED: {
    label: "Delivered",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    icon: Package,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    icon: XCircle,
  },
};

/** Payment status meta information. */
export const PAYMENT_META = {
  PAID: { label: "Paid", color: "bg-green-600 text-white" },
  UNPAID: { label: "Unpaid", color: "bg-amber-500 text-white" },
  PENDING: { label: "Pending", color: "bg-blue-500 text-white" },
  FAILED: { label: "Failed", color: "bg-red-500 text-white" },
  REFUNDED: { label: "Refunded", color: "bg-purple-500 text-white" },
  EXPIRED: { label: "Expired", color: "bg-gray-500 text-white" },
  CANCELLED: { label: "Cancelled", color: "bg-red-500 text-white" },
};