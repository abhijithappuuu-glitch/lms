import React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Shield, Users, Briefcase } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function LoginPortal() {
  const roles = [
    { name: "Employee", path: "/dashboard/employee", icon: <Users className="w-5 h-5" />, desc: "Apply for leaves and view history." },
    { name: "HOD", path: "/dashboard/hod", icon: <BookOpen className="w-5 h-5" />, desc: "Manage department leaves and workflows." },
    { name: "Dean", path: "/dashboard/dean", icon: <Briefcase className="w-5 h-5" />, desc: "Oversee academic leave adjustments." },
    { name: "Principal", path: "/dashboard/principal", icon: <Shield className="w-5 h-5" />, desc: "Final authority and high-level approvals." },
    { name: "System Admin", path: "/dashboard/admin", icon: <Shield className="w-5 h-5 text-blue-500" />, desc: "Configure system policies and settings." }
  ];

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 font-sans transition-colors">
      <ThemeToggle className="fixed top-5 right-5 z-30" />
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-black/40 border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="bg-blue-600 dark:bg-gradient-to-br dark:from-blue-700 dark:to-indigo-800 p-8 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-inner mb-4">
            <span className="text-blue-600 font-bold text-2xl">SD</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SDMCET Portal</h1>
          <p className="text-blue-100 mt-2 text-sm">Digital Staff Leave Management System</p>
        </div>
        <div className="p-6">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Select Role Prototype</h2>
          <div className="space-y-3">
            {roles.map((role) => (
              <Link 
                key={role.name} 
                href={role.path}
                className="group flex items-center p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-500 dark:hover:border-blue-500/60 hover:shadow-md transition-all bg-slate-50 hover:bg-white dark:bg-slate-800/40 dark:hover:bg-slate-800"
              >
                <div className="w-10 h-10 bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {role.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{role.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{role.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
