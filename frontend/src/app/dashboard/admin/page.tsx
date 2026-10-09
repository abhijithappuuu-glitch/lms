"use client";

import React, { useState } from "react";
import { useTheme } from "../layout";
import { cn } from "@/lib/utils";
import { Calendar, Settings, FileText, CheckCircle2 } from "lucide-react";
import { ActionTable, ActionTableItem } from "@/components/ui/ActionTable";
import { useLeaveTypes, useUpdatePolicy } from "@/hooks/useQueries";
import { RegistrationApprovals } from "@/components/tables/RegistrationApprovals";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEffect } from "react";
import { LeaveType } from "@/types/api";

export default function AdminDashboard() {
  const { isDark } = useTheme();
  const { data: leaveTypes = [], isLoading: loadingTypes } = useLeaveTypes();
  const updatePolicy = useUpdatePolicy();
  const [isSuccess, setIsSuccess] = useState(false);

  const [policies, setPolicies] = useState<Record<string, number>>({});

  useEffect(() => {
    if (leaveTypes.length > 0) {
      const initial: Record<string, number> = {};
      leaveTypes.forEach((lt: LeaveType) => {
        initial[lt.id] = lt.annualEntitlement;
      });
      setPolicies(initial);
    }
  }, [leaveTypes]);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update each changed policy sequentially for simplicity
    for (const lt of leaveTypes) {
      if (policies[lt.id] !== lt.annualEntitlement) {
        await updatePolicy.mutateAsync({ id: lt.id, entitlement: policies[lt.id] });
      }
    }

    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  const holidays: ActionTableItem[] = [
    { id: "h1", applicant: "System", department: "Institution", leaveType: "Deepavali", dates: "Oct 24", duration: 1, status: "approved" },
    { id: "h2", applicant: "System", department: "Institution", leaveType: "Christmas", dates: "Dec 25", duration: 1, status: "approved" },
  ];

  const inputStyle = cn(
    "w-full px-4 py-2 rounded-lg border text-sm transition-colors outline-none focus:ring-2 focus:ring-blue-500/20",
    isDark
      ? "bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
      : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
  );

  const labelStyle = cn("block text-sm font-medium mb-1.5", isDark ? "text-slate-300" : "text-slate-700");

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6" /> System Configuration
          </h1>
          <p className="text-slate-500 mt-1">Manage institutional leave policies, holidays, and workflow rules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Leave Policy Management */}
        <div className={cn("p-6 rounded-xl border shadow-sm", isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200")}>
          <div className="flex justify-between items-center mb-6">
            <h2 className={cn("text-xl font-bold", isDark ? "text-slate-100" : "text-slate-900")}>Leave Policy Configuration</h2>
            {isSuccess && (
              <span className="flex items-center gap-1 text-sm text-emerald-500 font-medium animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" /> Saved Successfully
              </span>
            )}
          </div>
          
          <form onSubmit={handleSavePolicy} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {loadingTypes ? (
                <>
                  <Skeleton className="h-14 w-full" isDark={isDark} />
                  <Skeleton className="h-14 w-full" isDark={isDark} />
                  <Skeleton className="h-14 w-full" isDark={isDark} />
                </>
              ) : (
                leaveTypes.map((lt: LeaveType) => (
                  <div key={lt.id}>
                    <label className={labelStyle}>{lt.name} ({lt.code}) Quota</label>
                    <input 
                      type="number" 
                      className={inputStyle} 
                      value={policies[lt.id] !== undefined ? policies[lt.id] : lt.annualEntitlement || 0} 
                      onChange={(e) => setPolicies({ ...policies, [lt.id]: Number(e.target.value) })}
                      min="0"
                    />
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
              >
                Update Ledger Policies
              </button>
            </div>
          </form>
        </div>

        {/* Dynamic Leave Types Catalog */}
        <div className={cn("p-6 rounded-xl border shadow-sm", isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200")}>
           <h2 className={cn("text-xl font-bold mb-6", isDark ? "text-slate-100" : "text-slate-900")}>Leave Types Catalog</h2>
           <div className="space-y-3">
             {loadingTypes ? (
               <p className="text-sm text-slate-500">Loading catalog...</p>
             ) : (
               leaveTypes.map((lt: any) => (
                 <div key={lt.id} className={cn("p-3 rounded-lg border flex justify-between items-center", isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200")}>
                   <div>
                     <p className={cn("font-medium", isDark ? "text-slate-200" : "text-slate-800")}>{lt.name}</p>
                     <p className={cn("text-xs mt-0.5", isDark ? "text-slate-500" : "text-slate-500")}>Code: {lt.code}</p>
                   </div>
                   <div className="flex gap-2">
                     {lt.tracksBalance && <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] uppercase font-bold rounded">Tracks Bal</span>}
                     {lt.requiresDoc && <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] uppercase font-bold rounded">Doc Req</span>}
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>
      </div>

      {/* Holiday Calendar Manager */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Institutional Holidays</h2>
          <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white">
            Add Holiday
          </button>
        </div>
        <ActionTable 
          title="Upcoming Holidays" 
          items={holidays} 
          isDark={isDark} 
        />
        <RegistrationApprovals isDark={isDark} />
      </div>
    </div>
  );
}
