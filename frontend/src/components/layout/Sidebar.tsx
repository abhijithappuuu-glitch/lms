"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FileText, CheckSquare, Users, Settings, LogOut, Network } from "lucide-react";
import { useAuth } from "../providers/AuthProvider";

interface SidebarProps {
  role: string;
  isDark?: boolean;
}

export default function Sidebar({ role, isDark }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  const currentRole = user?.role || role;

  const getLinks = () => {
    const base = [
      { name: "Dashboard", href: `/dashboard/${currentRole.toLowerCase()}`, icon: LayoutDashboard },
    ];
    
    // Delegations is a separate page implemented in /dashboard/delegations
    if (['HOD', 'DEAN', 'PRINCIPAL'].includes(currentRole)) {
      base.push({ name: "Delegations", href: `/dashboard/delegations`, icon: Network });
    }
    
    return base;
  };

  const links = getLinks();

  return (
    <aside className={cn("w-64 flex flex-col h-full transition-colors", "bg-slate-900 border-r border-slate-800 text-slate-300")}>
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
          SD
        </div>
        <span className="font-bold text-xl tracking-tight text-white">
          SDMCET
        </span>
      </div>
      
      <div className="px-4 py-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-3 px-2 text-slate-500">
          Main Menu
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <Icon className="w-[18px] h-[18px]" />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-400 hover:bg-slate-800 hover:text-rose-400"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Logout
        </button>
      </div>
    </aside>
  );
}
