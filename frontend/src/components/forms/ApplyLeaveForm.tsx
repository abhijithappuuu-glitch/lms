"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leaveApplicationSchema, LeaveApplicationFormValues } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { Calendar, UploadCloud, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { useLeaveTypes, useColleagues, useBalances, useSimulateLeave } from "@/hooks/useQueries";
import { useDebounce } from "@/hooks/useDebounce";
import { parseISO } from "date-fns";
import { useAuth } from "@/components/providers/AuthProvider";
import { fetchWithAuth } from "@/lib/apiClient";

export function ApplyLeaveForm({ isDark, onSuccess }: { isDark?: boolean, onSuccess?: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { user } = useAuth();

  // TanStack Query Hooks
  const { data: leaveTypes = [], isLoading: loadingTypes } = useLeaveTypes();
  const { data: colleagues = [], isLoading: loadingColleagues } = useColleagues(user?.departmentId);
  
  const { data: balances, isLoading: loadingBalances } = useBalances();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LeaveApplicationFormValues>({
    resolver: zodResolver(leaveApplicationSchema),
    defaultValues: {
      leaveTypeId: "",
      startDate: "",
      endDate: "",
      reason: "",
      dutyAdjustedTo: "",
    },
  });

  const selectedLeaveTypeCode = watch("leaveTypeId"); // Form maps value to code for ease of lookup
  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const isHalfDay = watch("isHalfDay");

  const selectedLeaveType = leaveTypes.find((lt: any) => lt.code === selectedLeaveTypeCode);
  
  const tracksBalance = selectedLeaveType?.tracksBalance || false;

  const debouncedStartDate = useDebounce(startDate, 300);
  const debouncedEndDate = useDebounce(endDate, 300);
  const debouncedIsHalfDay = useDebounce(isHalfDay, 300);

  const { data: simulation, isLoading: isSimulating } = useSimulateLeave(
    selectedLeaveTypeCode,
    debouncedStartDate,
    debouncedEndDate,
    debouncedIsHalfDay,
    [] // document uploads later
  );

  const requiresDocument = selectedLeaveType?.requiresDoc || (simulation?.requiredDocuments && simulation.requiredDocuments.length > 0) || false;

  const duration = simulation?.duration || 0;
  const currentBalance = simulation?.balanceBefore || 0;
  const projectedBalance = simulation?.balanceAfter || 0;
  // If simulation is loaded, use its eligible flag. Otherwise default to true to not falsely block before math is done.
  const isEligible = simulation ? simulation.eligible : true;
  const violations = simulation?.violations || [];
  const warnings = simulation?.warnings || [];
  const requiresDutyAdjustment = simulation?.requiresDutyAdjustment || false;

  const onSubmit = async (data: LeaveApplicationFormValues) => {
    if (!isEligible) return; // Client-side guard

    setIsSubmitting(true);
    try {
      console.log("Submitting:", data);
      
      const payload = {
        leaveTypeCode: selectedLeaveTypeCode, 
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: duration, // From simulation
        isHalfDay: data.isHalfDay,
        reason: data.reason,
        employeeId: user?.employeeId,
        dutyAdjustedTo: data.dutyAdjustedTo || null,
        uploadedDocumentTypes: simulation?.requiredDocuments || []
      };

      const savedApp = await fetchWithAuth("/leave/applications", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      console.log("201 Created:", savedApp);

      setIsSuccess(true);
      
      setTimeout(() => {
        setIsSuccess(false);
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = cn(
    "w-full px-4 py-2 rounded-lg border text-sm transition-colors outline-none focus:ring-2 focus:ring-blue-500/20",
    isDark
      ? "bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
      : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
  );

  const labelStyle = cn(
    "block text-sm font-medium mb-1.5",
    isDark ? "text-slate-300" : "text-slate-700"
  );

  return (
    <div className={cn("p-6 max-w-4xl w-full", isDark ? "bg-slate-950" : "bg-white")}>
      <h2 className={cn("text-xl font-bold mb-6", isDark ? "text-slate-100" : "text-slate-900")}>
        Leave Request
      </h2>

      {isSuccess ? (
        <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-emerald-600">Application Submitted!</h3>
          <p className={isDark ? "text-slate-400 mt-2" : "text-slate-500 mt-2"}>
            Your application has been routed to the appropriate workflow.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-5">
            {/* Leave Type */}
            <div>
              <label className={labelStyle}>Leave Type <span className="text-rose-500">*</span></label>
              <select {...register("leaveTypeId")} className={inputStyle} disabled={loadingTypes}>
                <option value="">Select a leave type</option>
                {leaveTypes.map((lt: any) => (
                  <option key={lt.id} value={lt.code}>{lt.name} ({lt.code})</option>
                ))}
              </select>
              {errors.leaveTypeId && <p className="text-rose-500 text-xs mt-1">{errors.leaveTypeId.message}</p>}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>Start Date <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input type="date" {...register("startDate")} className={inputStyle} />
                </div>
                {errors.startDate && <p className="text-rose-500 text-xs mt-1">{errors.startDate.message}</p>}
              </div>
              <div>
                <label className={labelStyle}>End Date <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input type="date" {...register("endDate")} className={inputStyle} />
                </div>
                {errors.endDate && <p className="text-rose-500 text-xs mt-1">{errors.endDate.message}</p>}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" id="isHalfDay" {...register("isHalfDay")} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <label htmlFor="isHalfDay" className={cn("text-sm", isDark ? "text-slate-300" : "text-slate-700")}>Apply for Half-Day Leave</label>
            </div>

            {/* Conditional: Duty Adjustment */}
            {requiresDutyAdjustment && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className={labelStyle}>Duty Adjustment (Peer Coverage) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Users className={cn("absolute left-3 top-2.5 w-4 h-4", isDark ? "text-slate-500" : "text-slate-400")} />
                  <select {...register("dutyAdjustedTo")} className={cn(inputStyle, "pl-10")} disabled={loadingColleagues}>
                    <option value="">Select a colleague to cover your duties</option>
                    {colleagues.map((colleague: any) => (
                      <option key={colleague.id} value={colleague.id}>
                        {colleague.fullName} ({colleague.department})
                      </option>
                    ))}
                  </select>
                </div>
                {errors.dutyAdjustedTo && <p className="text-rose-500 text-xs mt-1">{errors.dutyAdjustedTo.message}</p>}
                <p className={cn("text-[11px] mt-1.5 flex items-center gap-1", isDark ? "text-amber-400/80" : "text-amber-600")}>
                  Your colleague must accept this request before it routes to the HOD.
                </p>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className={labelStyle}>About</label>
              <textarea
                {...register("reason")}
                className={cn(inputStyle, "min-h-[100px] resize-none")}
                placeholder="Include comments for your approver..."
              />
              {errors.reason && <p className="text-rose-500 text-xs mt-1">{errors.reason.message}</p>}
            </div>

            {/* Conditional: Document Upload */}
            {requiresDocument && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className={labelStyle}>Attachments</label>
                <div className={cn("border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center", isDark ? "border-slate-700 hover:border-blue-500/50 bg-slate-900/50" : "border-slate-300 hover:border-blue-400 bg-slate-50")}>
                  <div className="flex items-center gap-3">
                    <UploadCloud className="w-6 h-6 text-blue-500" />
                    <div className="text-left">
                      <p className={isDark ? "text-slate-300 text-sm font-medium" : "text-slate-700 text-sm font-medium"}>
                        <span className="text-blue-600">Upload a file</span> or drag and drop
                      </p>
                      <p className={isDark ? "text-slate-500 text-xs" : "text-slate-400 text-xs"}>
                        PNG, JPG, PDF up to 10MB
                      </p>
                    </div>
                  </div>
                  <input type="file" {...register("document")} className="hidden" id="file-upload" />
                </div>
              </div>
            )}
          </div>

          <div className="w-full lg:w-72 flex flex-col gap-4">
            {/* Policy Evaluation Sidebar */}
            <div className={cn("p-5 rounded-xl border flex flex-col gap-4 transition-colors", 
              !isEligible && debouncedStartDate && debouncedEndDate 
                ? (isDark ? "bg-rose-500/10 border-rose-500/20" : "bg-rose-50 border-rose-200") 
                : (isDark ? "bg-blue-900/20 border-slate-800" : "bg-slate-50 border-slate-200")
            )}>
              <div className="flex items-center justify-between">
                <h4 className={cn("text-sm font-semibold", isDark ? "text-slate-200" : "text-slate-700")}>
                  Your Request Includes
                </h4>
                {isSimulating && <span className="text-xs text-blue-500 animate-pulse">Calculating...</span>}
              </div>

              {debouncedStartDate && debouncedEndDate && simulation && !errors.endDate ? (
                <>
                  <div className="flex flex-col gap-3 py-2 border-y border-slate-200 dark:border-slate-700/50">
                    <div className="flex justify-between text-sm">
                      <span className={cn(isDark ? "text-slate-300" : "text-slate-600")}>Dates</span>
                      <span className={cn("font-medium", isDark ? "text-slate-200" : "text-slate-800")}>
                        {startDate} {startDate !== endDate && `to ${endDate}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={cn(isDark ? "text-slate-300" : "text-slate-600")}>Time</span>
                      <span className={cn("font-medium", isDark ? "text-slate-200" : "text-slate-800")}>
                        {isHalfDay ? "Half Day" : "All Day"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className={cn("text-[15px] font-semibold", isDark ? "text-slate-200" : "text-slate-800")}>
                      {duration} days of {selectedLeaveType?.name || selectedLeaveTypeCode}
                    </div>
                    {tracksBalance && (
                      <div className={cn("text-sm mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
                        {projectedBalance} days remaining
                      </div>
                    )}
                  </div>

                  {(!isEligible || warnings.length > 0) && (
                    <div className="mt-2 pt-3 border-t border-slate-200 dark:border-slate-700/50 flex flex-col gap-2">
                      {violations.map((v: string, i: number) => (
                        <div key={i} className="flex gap-2 items-start text-rose-600 text-xs bg-rose-50 dark:bg-rose-950/30 p-2 rounded">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{v}</span>
                        </div>
                      ))}
                      {warnings.map((w: string, i: number) => (
                        <div key={i} className="flex gap-2 items-start text-amber-600 text-xs bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {simulation?.requiredDocuments && simulation.requiredDocuments.length > 0 && (
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-900/50">
                      <strong>Required:</strong> {simulation.requiredDocuments.join(", ")}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                  Select dates to see request summary
                </div>
              )}
            </div>

            <div className="mt-auto flex flex-col gap-3 pt-4">
              <button
                type="button"
                className={cn("w-full py-2.5 rounded-lg text-sm font-medium transition-colors", 
                  isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
                onClick={() => { if (onSuccess) onSuccess(); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isEligible || !simulation}
                className={cn(
                  "w-full py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all flex justify-center items-center gap-2",
                  (isSubmitting || !isEligible || !simulation) ? "bg-blue-400 cursor-not-allowed opacity-70" : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {isSubmitting ? "Submitting..." : "Request Now"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
