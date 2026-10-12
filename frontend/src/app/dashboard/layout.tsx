"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { cn } from "@/lib/utils";
import React from "react";
import { useThemeMode } from "@/lib/theme";
import { ThemeContext } from "@/lib/dashboard-theme";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useThemeMode();

  // Determine role based on URL
  let role = "Employee";
  if (pathname.includes("/hod")) role = "HOD";
  if (pathname.includes("/dean")) role = "Dean";
  if (pathname.includes("/principal")) role = "Principal";
  if (pathname.includes("/admin")) role = "Admin";
  if (pathname.includes("/system-admin")) role = "Admin";

  return (
    <div className={cn("flex h-screen w-full font-sans transition-colors duration-200", isDark ? "bg-slate-950 text-slate-50 dark" : "bg-slate-50 text-slate-900")}>
      <Sidebar role={role} isDark={isDark} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar role={role} isDark={isDark} toggleTheme={toggleTheme} />
        <main className="flex-1 overflow-y-auto p-8">
          <ThemeContext.Provider value={{ isDark, role, toggleTheme }}>
            {children}
          </ThemeContext.Provider>
        </main>
      </div>
    </div>
  );
}
