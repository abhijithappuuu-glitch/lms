"use client";

import React from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { ActionTableItem } from "@/components/ui/ActionTable";
import { cn } from "@/lib/utils";
import { useApplication } from "@/hooks/useQueries";
import { User, Calendar, Clock, CheckCircle2, History } from "lucide-react";
import { format } from "date-fns";

interface ViewApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: ActionTableItem | null;
  isDark?: boolean;
}

export function ViewApplicationModal({ isOpen, onClose, application, isDark = false }: ViewApplicationModalProps) {
  const { data: details, isLoading } = useApplication(application?.id || null);

  if (!application) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent isDark={isDark} className="max-w-2xl">
        <div className="p-6">
          <h2 className={cn("text-xl font-bold mb-6", isDark ? "text-slate-100" : "text-slate-900")}>
            Application Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Context & Applicant Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")}>
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={cn("font-semibold text-lg", isDark ? "text-slate-200" : "text-slate-900")}>{application.applicant}</h3>
                  <p className={cn("text-sm", isDark ? "text-slate-500" : "text-slate-500")}>{application.department}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className={cn(isDark ? "text-slate-400" : "text-slate-500")}>Leave Type:</span>
                  <span className={cn("font-medium", isDark ? "text-slate-200" : "text-slate-800")}>{application.leaveType}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className={cn(isDark ? "text-slate-400" : "text-slate-500")}>Duration:</span>
                  <span className={cn("font-medium", isDark ? "text-slate-200" : "text-slate-800")}>{application.duration} day(s)</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className={cn(isDark ? "text-slate-400" : "text-slate-500")}>Dates:</span>
                  <span className={cn("font-medium flex items-center gap-1.5", isDark ? "text-slate-200" : "text-slate-800")}>
                    <Calendar className="w-3.5 h-3.5" />
                    {application.dates}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className={cn("p-5 rounded-xl border flex flex-col justify-center space-y-4", isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200")}>
               <div>
                  <p className={cn("text-xs uppercase font-semibold", isDark ? "text-slate-500" : "text-slate-500")}>Reason</p>
                  <p className={cn("text-sm mt-1", isDark ? "text-slate-300" : "text-slate-700")}>{details?.reason || "..."}</p>
               </div>
               
               {details?.dutyAdjustee && (
                 <div className={cn("p-3 rounded-lg border flex items-start gap-2", isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200")}>
                    <CheckCircle2 className={cn("w-4 h-4 mt-0.5", isDark ? "text-emerald-400" : "text-emerald-600")} />
                    <div>
                      <p className={cn("text-sm font-medium", isDark ? "text-emerald-400" : "text-emerald-700")}>Duty Adjustment</p>
                      <p className={cn("text-xs mt-0.5", isDark ? "text-emerald-400/80" : "text-emerald-600/80")}>Covered by: {details.dutyAdjustee.fullName}</p>
                    </div>
                  </div>
               )}
            </div>
          </div>

          {/* Timeline */}
          <div>
             <h3 className={cn("text-lg font-semibold mb-4 flex items-center gap-2", isDark ? "text-slate-200" : "text-slate-800")}>
                <History className="w-5 h-5" /> Workflow Timeline
             </h3>
             {isLoading ? (
                <p className="text-sm text-slate-500">Loading timeline...</p>
             ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                  {details?.history?.map((entry: any, index: number) => (
                    <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                       <div className={cn("flex items-center justify-center w-10 h-10 rounded-full border-4 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow", isDark ? "bg-slate-800 border-slate-900 text-slate-300" : "bg-white border-slate-50 text-slate-500")}>
                          <CheckCircle2 className="w-5 h-5 text-blue-500" />
                       </div>
                       <div className={cn("w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border shadow-sm", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
                          <div className="flex items-center justify-between mb-1">
                             <h4 className={cn("font-bold text-sm", isDark ? "text-slate-200" : "text-slate-800")}>{entry.action}</h4>
                             <time className={cn("text-xs font-medium", isDark ? "text-slate-500" : "text-slate-500")}>{format(new Date(entry.createdAt), "MMM d, h:mm a")}</time>
                          </div>
                          <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-600")}>By {entry.actorName} at {entry.stepName}</p>
                          {entry.remarks && <p className={cn("text-sm mt-2 p-2 rounded-md bg-slate-100 dark:bg-slate-800 italic", isDark ? "text-slate-300" : "text-slate-600")}>&quot;{entry.remarks}&quot;</p>}
                       </div>
                    </div>
                  ))}
                </div>
             )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
