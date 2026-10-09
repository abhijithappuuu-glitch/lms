import React from "react";
import { cn } from "@/lib/utils";

export type StatusType = "pending" | "approved" | "rejected" | "review" | "cancelled" | "returned";

interface StatusPillProps {
  status: StatusType;
  className?: string;
  isDark?: boolean;
}

export function StatusPill({ status, className, isDark }: StatusPillProps) {
  const styles = {
    pending: isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200",
    approved: isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: isDark ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-700 border-rose-200",
    review: isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200",
    cancelled: isDark ? "bg-slate-500/10 text-slate-400 border-slate-500/20" : "bg-slate-50 text-slate-700 border-slate-200",
    returned: isDark ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-purple-50 text-purple-700 border-purple-200",
  };

  const labels = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    review: "In Review",
    cancelled: "Cancelled",
    returned: "Returned",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        styles[status],
        className
      )}
    >
      {labels[status]}
    </span>
  );
}
