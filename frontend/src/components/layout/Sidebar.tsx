"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Network, LogOut } from "lucide-react";
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
    <aside className="w-72 flex flex-col h-full shrink-0 bg-slate-900 border-r border-slate-800 text-slate-300 transition-colors">
      {/* Institutional header — crest + wordmark */}
      <div className="px-6 pt-6 pb-5 flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
          <Image src="/logo.png" alt="SDMCET Crest" width={44} height={44} className="object-contain p-0.5" priority />
        </div>
        <div className="min-w-0">
          <div className="font-serif text-xl font-bold tracking-wide text-white leading-tight">
            SDMCET
          </div>
          <div className="text-[11px] leading-snug text-slate-400 mt-0.5">
            Staff Leave Management
            <br />
            System
          </div>
        </div>
      </div>

      {/* Main navigation — steel-blue active state with narrow vertical rule */}
      <nav className="mt-2 flex flex-col">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "relative flex items-center gap-3 px-6 py-3 text-[15px] font-medium transition-colors",
                isActive
                  ? "bg-blue-600/25 text-white"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-400" aria-hidden />
              )}
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Decorative institutional footer — campus imagery + motto */}
      <div className="mt-auto">
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="h-px w-6 bg-blue-400/60" />
            <span className="h-px w-6 bg-blue-400/60" />
          </div>
          <p className="text-[11px] font-semibold tracking-[0.35em] text-amber-500/90 uppercase leading-relaxed">
            People
            <br />
            Academics
            <br />
            Progress
          </p>
        </div>

        <div className="relative h-36 overflow-hidden">
          <Image
            src="/campus-bg.png"
            alt="SDMCET Campus"
            fill
            sizes="288px"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900/30 to-slate-900" />
        </div>
      </div>

      <div className="px-4 py-4 border-t border-slate-800">
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
