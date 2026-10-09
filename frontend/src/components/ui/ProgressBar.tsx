import React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: "blue" | "emerald" | "amber" | "rose";
  className?: string;
  isDark?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  color = "blue",
  className,
  isDark
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colorStyles = {
    blue: isDark ? "bg-blue-500" : "bg-blue-600",
    emerald: isDark ? "bg-emerald-500" : "bg-emerald-500",
    amber: isDark ? "bg-amber-500" : "bg-amber-500",
    rose: isDark ? "bg-rose-500" : "bg-rose-500",
  };

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5 text-xs font-medium">
          {label && <span className={isDark ? "text-slate-300" : "text-slate-700"}>{label}</span>}
          {showValue && (
            <span className={isDark ? "text-slate-400" : "text-slate-500"}>
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div className={cn("h-2.5 w-full rounded-full overflow-hidden", isDark ? "bg-slate-800" : "bg-slate-100")}>
        <div
          className={cn("h-full transition-all duration-500 ease-in-out", colorStyles[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
