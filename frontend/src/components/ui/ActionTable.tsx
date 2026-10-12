"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { StatusPill, StatusType } from "./StatusPill";
import { Calendar, User, Clock, ChevronRight, ArrowRight, FileSearch } from "lucide-react";

export interface ActionTableItem {
  id: string;
  applicant: string;
  department: string;
  leaveType: string;
  dates: string;
  duration: number;
  status: StatusType;
  actionRequired?: boolean;
  nextRouting?: string;
  canCancel?: boolean;
  actingAsDelegate?: boolean;
}

interface ActionTableProps {
  title: string;
  titleIcon?: React.ReactNode;
  items: ActionTableItem[];
  isDark?: boolean;
  onReview?: (item: ActionTableItem) => void;
  onDownloadPdf?: (id: string) => void;
  onCancel?: (id: string) => void;
  onViewAll?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
}

export function ActionTable({ title, titleIcon, items, isDark, onReview, onDownloadPdf, onCancel, onViewAll, emptyTitle = "No records found", emptyMessage = "There are no pending applications at this level." }: ActionTableProps) {
  return (
    <div className={cn("rounded-xl border overflow-hidden flex flex-col", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
      <div className={cn("px-6 py-4 border-b flex justify-between items-center gap-4", isDark ? "border-slate-800" : "border-slate-100")}>
        <h3 className={cn("font-serif font-semibold text-lg flex items-center gap-2.5", isDark ? "text-slate-100" : "text-slate-800")}>
          {titleIcon && <span className={cn(isDark ? "text-blue-400" : "text-blue-600")}>{titleIcon}</span>}
          {title}
        </h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors shrink-0",
              isDark
                ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className={cn("text-xs uppercase tracking-wide", isDark ? "bg-slate-950/50 text-slate-400" : "bg-slate-50 text-slate-500")}>
            <tr>
              <th className="px-6 py-3 font-medium w-10">#</th>
              <th className="px-6 py-3 font-medium">Applicant</th>
              <th className="px-6 py-3 font-medium">Department</th>
              <th className="px-6 py-3 font-medium">Leave Type</th>
              <th className="px-6 py-3 font-medium">Dates & Duration</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y", isDark ? "divide-slate-800/50" : "divide-slate-100")}>
            {items.map((item, index) => (
              <tr key={item.id} className={cn("group transition-colors", isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-50")}>
                <td className={cn("px-6 py-4 text-xs font-medium", isDark ? "text-slate-500" : "text-slate-400")}>{index + 1}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")}>
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className={cn("font-medium", isDark ? "text-slate-200" : "text-slate-900")}>{item.applicant}</div>
                    </div>
                  </div>
                </td>
                <td className={cn("px-6 py-4", isDark ? "text-slate-400" : "text-slate-600")}>{item.department}</td>
                <td className="px-6 py-4">
                  <div className={cn("font-medium", isDark ? "text-slate-300" : "text-slate-700")}>{item.leaveType}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Calendar className={cn("w-3.5 h-3.5", isDark ? "text-slate-500" : "text-slate-400")} />
                    <span className={cn(isDark ? "text-slate-300" : "text-slate-600")}>{item.dates}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className={cn("w-3.5 h-3.5", isDark ? "text-slate-500" : "text-slate-400")} />
                    <span className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-500")}>{item.duration} day{item.duration !== 1 ? "s" : ""}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusPill status={item.status} isDark={isDark} />
                </td>
                <td className="px-6 py-4 text-right">
                  {item.actionRequired ? (
                    <button
                      onClick={() => onReview && onReview(item)}
                      className={cn(
                        "inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors shadow-sm",
                        item.nextRouting === 'TERMINAL' 
                          ? "bg-blue-600 text-white hover:bg-blue-700" 
                          : isDark
                            ? "bg-transparent border border-blue-500/50 text-blue-400 hover:bg-blue-900/30"
                            : "bg-transparent border border-blue-200 text-blue-700 hover:bg-blue-50"
                      )}
                    >
                      {item.nextRouting === 'TERMINAL' ? "Sanction" : "Review & Forward"}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      {item.status === 'approved' && onDownloadPdf && (
                        <button
                          onClick={() => onDownloadPdf(item.id)}
                          className={cn(
                            "inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors shadow-sm",
                            isDark ? "bg-emerald-900/30 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/50" : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          )}
                        >
                          Official PDF
                        </button>
                      )}
                      {(item.status === 'pending' || item.status === 'approved') && onCancel && (
                        <button
                          onClick={() => onCancel(item.id)}
                          className={cn(
                            "inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors shadow-sm",
                            isDark ? "bg-rose-900/30 border border-rose-500/50 text-rose-400 hover:bg-rose-900/50" : "bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100"
                          )}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => onReview && onReview(item)}
                        className={cn(
                          "inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                          isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-white border text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        View
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mb-1", isDark ? "bg-slate-800 text-slate-500" : "bg-slate-50 text-slate-400")}>
                      <FileSearch className="w-7 h-7" />
                    </div>
                    <div className={cn("text-[15px] font-semibold", isDark ? "text-slate-200" : "text-slate-700")}>{emptyTitle}</div>
                    <div className="text-sm text-slate-500">{emptyMessage}</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
