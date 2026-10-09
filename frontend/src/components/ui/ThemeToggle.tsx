"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Standalone floating theme toggle for pages outside the dashboard shell. */
export default function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggleTheme } = useThemeMode();
  return (
    <button
      type="button"
      id="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "p-2.5 rounded-full border shadow-sm transition-colors bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700",
        className
      )}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
