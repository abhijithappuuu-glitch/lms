"use client";

import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { ActionTableItem } from "@/components/ui/ActionTable";
import { cn } from "@/lib/utils";
import { useProcessApproval } from "@/hooks/useQueries";
import { User, Calendar, Clock, CheckCircle2, ShieldAlert } from "lucide-react";

interface ReviewApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: ActionTableItem | null;
  isDark?: boolean;
  actingAsDelegate?: boolean;
}

export function ReviewApplicationModal({ isOpen, onClose, application, isDark = false, actingAsDelegate = false }: ReviewApplicationModalProps) {
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  
  const processApproval = useProcessApproval();

  if (!application) return null;

  const handleAction = (decision: "APPROVE" | "RECOMMEND" | "RETURN" | "REJECT") => {
    if ((decision === "RETURN" || decision === "REJECT") && !remarks.trim()) {
      setError("Remarks are mandatory when returning or rejecting an application.");
      return;
    }
    setError("");
    
    processApproval.mutate(
      { id: application.id, decision, remarks },
      {
        onSuccess: () => {
          setRemarks("");
          onClose();
        }
      }
    );
  };

  const isTerminal = application.nextRouting === "TERMINAL";

  // Mock ledger stats
  const currentBalance = 15;
  const projectedBalance = currentBalance - application.duration;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent isDark={isDark} className="max-w-3xl">
        <div className="p-6">
          <h2 className={cn("text-xl font-bold mb-6", isDark ? "text-slate-100" : "text-slate-900")}>
            Review Leave Application
          </h2>

          {actingAsDelegate && (
            <div className="bg-amber-100 border border-amber-200 text-amber-800 text-sm p-3 rounded-lg flex items-center gap-2 mb-6">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <strong>Acting under delegated authority.</strong> Your approval actions will be recorded with this context.
            </div>
          )}

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

              {/* Duty Adjustment Context */}
              <div className={cn("p-3 rounded-lg border flex items-start gap-2", isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200")}>
                <CheckCircle2 className={cn("w-4 h-4 mt-0.5", isDark ? "text-emerald-400" : "text-emerald-600")} />
                <div>
                  <p className={cn("text-sm font-medium", isDark ? "text-emerald-400" : "text-emerald-700")}>Duty Adjustment Verified</p>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-emerald-400/80" : "text-emerald-600/80")}>Accepted by Rahul K. on Oct 10</p>
                </div>
              </div>
            </div>

            {/* Ledger Impact Zone */}
            <div className={cn("p-5 rounded-xl border flex flex-col justify-center", isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200")}>
              <h4 className={cn("text-sm font-semibold mb-4 text-center uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-500")}>Ledger Impact</h4>
              <div className="flex justify-between items-center mb-4 px-4">
                <div className="text-center">
                  <p className={cn("text-2xl font-bold", isDark ? "text-slate-200" : "text-slate-800")}>{currentBalance}</p>
                  <p className={cn("text-xs mt-1", isDark ? "text-slate-500" : "text-slate-500")}>Current</p>
                </div>
                <div className="text-center text-rose-500">
                  <p className="text-xl font-bold">-{application.duration}</p>
                  <p className="text-xs mt-1 opacity-80">Deduction</p>
                </div>
                <div className="text-center">
                  <p className={cn("text-2xl font-bold", isDark ? "text-blue-400" : "text-blue-600")}>{projectedBalance}</p>
                  <p className={cn("text-xs mt-1", isDark ? "text-slate-500" : "text-slate-500")}>Projected</p>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800">
                <div className="h-full bg-blue-500" style={{ width: `${(projectedBalance / 20) * 100}%` }}></div>
                <div className="h-full bg-rose-400" style={{ width: `${(application.duration / 20) * 100}%` }}></div>
              </div>
            </div>
          </div>

          {/* Remarks Textarea */}
          <div className="mb-6">
            <label className={cn("block text-sm font-medium mb-2", isDark ? "text-slate-300" : "text-slate-700")}>
              Remarks (Mandatory for Return/Reject)
            </label>
            <textarea
              className={cn(
                "w-full px-4 py-3 rounded-lg border text-sm transition-colors outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[100px] resize-none",
                isDark ? "bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
              )}
              placeholder="Enter your remarks here..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
            {error && <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{error}</p>}
          </div>

          {/* Mutation Action Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => handleAction("REJECT")}
              disabled={processApproval.isPending}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", isDark ? "bg-slate-800 text-rose-400 hover:bg-slate-700" : "bg-white border border-slate-200 text-rose-600 hover:bg-rose-50")}
            >
              Reject
            </button>
            <button
              onClick={() => handleAction("RETURN")}
              disabled={processApproval.isPending}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", isDark ? "bg-slate-800 text-amber-400 hover:bg-slate-700" : "bg-white border border-slate-200 text-amber-600 hover:bg-amber-50")}
            >
              Return to Applicant
            </button>
            
            {isTerminal ? (
              <button
                onClick={() => handleAction("APPROVE")}
                disabled={processApproval.isPending}
                className="px-6 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                {processApproval.isPending ? "Processing..." : "Sanction Leave"}
              </button>
            ) : (
              <button
                onClick={() => handleAction("RECOMMEND")}
                disabled={processApproval.isPending}
                className={cn("px-6 py-2 rounded-lg text-sm font-semibold transition-colors", isDark ? "bg-blue-900/30 text-blue-400 border border-blue-500/50 hover:bg-blue-900/50" : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100")}
              >
                {processApproval.isPending ? "Processing..." : "Recommend & Forward"}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
