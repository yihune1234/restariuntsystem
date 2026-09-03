import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, ShieldCheck } from "lucide-react";
import { STATUS_META, PAYMENT_META } from "./status-meta";

export const OrderStatusBadge = ({ status, paymentStatus }) => {
  const meta = STATUS_META[status] || {
    label: status,
    color: "bg-muted text-muted-foreground",
    icon: Clock,
  };
  const Icon = meta.icon;
  const payMeta = PAYMENT_META[paymentStatus] || { label: paymentStatus, color: "bg-muted" };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className={`inline-flex items-center gap-1 ${meta.color}`}>
        <Icon className="size-3" /> {meta.label}
      </Badge>
      <Badge className={`items-center gap-1 ${payMeta.color}`}>
        <ShieldCheck className="size-3" /> {payMeta.label}
      </Badge>
    </div>
  );
};

export const SecurityCode = ({ code }) => (
  <span className="inline-flex items-center gap-1 font-mono font-bold tracking-widest text-primary text-lg">
    <ShieldCheck className="size-4" /> {code || "—"}
  </span>
);