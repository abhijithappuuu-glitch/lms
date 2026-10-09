"use client";

import { useCallback, useEffect, useState } from "react";
import { THEME_STORAGE_KEY } from "./theme-script";

export { THEME_STORAGE_KEY };
export type ThemeMode = "light" | "dark";

/** Resolve the initial theme: saved preference first, then OS preference. */
export function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
}

/**
 * Shared theme hook used by every page (login, register, portal, dashboard)
 * so the preference is consistent and persisted across the whole app.
 */
export function useThemeMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mode = getPreferredTheme();
    setIsDark(mode === "dark");
    applyTheme(mode);

    // Keep multiple open tabs in sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        setIsDark(e.newValue === "dark");
        applyTheme(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next: ThemeMode = prev ? "light" : "dark";
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      applyTheme(next);
      return next === "dark";
    });
  }, []);

  return { isDark, toggleTheme };
}
