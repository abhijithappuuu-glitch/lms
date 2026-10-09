"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Bell, Search, User, Moon, Sun } from "lucide-react";
import { useAuth } from "../providers/AuthProvider";

interface TopbarProps {
  role: string;
  isDark?: boolean;
  toggleTheme?: () => void;
}

export default function Topbar({ role, isDark, toggleTheme }: TopbarProps) {
  const { user } = useAuth();
  const displayRole = user?.role || role;
  const displayName = user?.fullName || "Loading...";

  return (
    <header className={cn("h-16 px-6 border-b flex items-center justify-between shrink-0 transition-colors", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
      <div className="flex-1 flex items-center">
        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border w-80 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all", isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
          <Search className={cn("w-4 h-4", isDark ? "text-slate-400" : "text-slate-400")} />
          <input 
            type="text" 
            placeholder="Search applications..." 
            className={cn("bg-transparent border-none outline-none text-sm w-full", isDark ? "text-slate-200 placeholder:text-slate-500" : "text-slate-800 placeholder:text-slate-400")}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-5">
        <button 
          onClick={toggleTheme}
          className={cn("p-2 rounded-full transition-colors", isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500")}
          aria-label="Toggle Dark Mode"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className={cn("p-2 rounded-full transition-colors relative", isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500")}>
          <Bell className="w-5 h-5" />
          <span className={cn("absolute top-2 right-2 w-2 h-2 rounded-full border-2", isDark ? "bg-rose-500 border-slate-900" : "bg-rose-500 border-white")}></span>
        </button>
        
        <div className={cn("h-8 w-px", isDark ? "bg-slate-800" : "bg-slate-200")}></div>
        
        <div className={cn("flex items-center gap-3 cursor-pointer p-1.5 pr-3 rounded-full transition-colors border border-transparent", isDark ? "hover:bg-slate-800 hover:border-slate-700" : "hover:bg-slate-50 hover:border-slate-200")}>
          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shadow-sm", isDark ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-700")}>
            <User className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-start">
            <span className={cn("text-sm font-semibold leading-tight", isDark ? "text-slate-200" : "text-slate-800")}>{displayName}</span>
            <span className={cn("text-[11px] font-medium leading-tight mt-0.5", isDark ? "text-slate-500" : "text-slate-500")}>{displayRole.replace('_', ' ')}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
