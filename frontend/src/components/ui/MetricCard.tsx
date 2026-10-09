import React from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  isDark?: boolean;
}

export function MetricCard({ title, value, icon, trend, className, isDark }: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-5 shadow-sm transition-all hover:shadow-md",
        isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className={cn("text-sm font-medium", isDark ? "text-slate-400" : "text-slate-500")}>{title}</h3>
        {icon && <div className={cn("p-2 rounded-lg", isDark ? "bg-slate-800 text-blue-400" : "bg-blue-50 text-blue-600")}>{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        {trend && (
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              trend.isPositive
                ? (isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-100 text-emerald-700")
                : (isDark ? "bg-rose-500/10 text-rose-400" : "bg-rose-100 text-rose-700")
            )}
          >
            {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
  );
}
