import React from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export type MetricTint = "blue" | "brass" | "rose" | "emerald";

interface MetricCardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  tint?: MetricTint;
  showArrow?: boolean;
  className?: string;
  isDark?: boolean;
}

const TINTS: Record<MetricTint, { light: string; dark: string; iconLight: string; iconDark: string }> = {
  blue: {
    light: "bg-blue-50/70 border-blue-100",
    dark: "bg-blue-950/40 border-blue-900/60",
    iconLight: "bg-blue-100 text-blue-600",
    iconDark: "bg-blue-900/60 text-blue-300",
  },
  brass: {
    light: "bg-amber-50/70 border-amber-100",
    dark: "bg-amber-950/30 border-amber-900/50",
    iconLight: "bg-amber-100 text-amber-700",
    iconDark: "bg-amber-900/50 text-amber-400",
  },
  rose: {
    light: "bg-rose-50/70 border-rose-100",
    dark: "bg-rose-950/30 border-rose-900/50",
    iconLight: "bg-rose-100 text-rose-600",
    iconDark: "bg-rose-900/50 text-rose-300",
  },
  emerald: {
    light: "bg-emerald-50/70 border-emerald-100",
    dark: "bg-emerald-950/30 border-emerald-900/50",
    iconLight: "bg-emerald-100 text-emerald-700",
    iconDark: "bg-emerald-900/50 text-emerald-300",
  },
};

export function MetricCard({ title, subtitle, value, icon, trend, tint = "blue", showArrow = false, className, isDark }: MetricCardProps) {
  const t = TINTS[tint];

  return (
    <div
      className={cn(
        "rounded-xl border p-5 transition-colors",
        isDark ? t.dark : t.light,
        isDark ? "text-slate-100" : "text-slate-900",
        className
      )}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center shrink-0 [&>svg]:w-5 [&>svg]:h-5", isDark ? t.iconDark : t.iconLight)}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className={cn("text-[15px] font-semibold leading-tight", isDark ? "text-slate-100" : "text-slate-800")}>{title}</h3>
          {subtitle && (
            <p className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-slate-500")}>{subtitle}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight leading-none">{value}</span>
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

        {showArrow && (
          <div
            className={cn(
              "w-8 h-8 rounded-full border flex items-center justify-center shrink-0",
              isDark ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500 bg-white/70"
            )}
            aria-hidden
          >
            <ArrowRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
