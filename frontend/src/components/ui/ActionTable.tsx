"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { StatusPill, StatusType } from "./StatusPill";
import { Calendar, User, Clock, ChevronRight } from "lucide-react";

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
  items: ActionTableItem[];
  isDark?: boolean;
  onReview?: (item: ActionTableItem) => void;
  onDownloadPdf?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export function ActionTable({ title, items, isDark, onReview, onDownloadPdf, onCancel }: ActionTableProps) {
  return (
    <div className={cn("rounded-xl border shadow-sm overflow-hidden flex flex-col", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
      <div className={cn("px-6 py-4 border-b flex justify-between items-center", isDark ? "border-slate-800" : "border-slate-200")}>
        <h3 className={cn("font-semibold text-lg", isDark ? "text-slate-100" : "text-slate-800")}>{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className={cn("text-xs uppercase", isDark ? "bg-slate-950/50 text-slate-400" : "bg-slate-50 text-slate-500")}>
            <tr>
              <th className="px-6 py-3 font-medium">Applicant</th>
              <th className="px-6 py-3 font-medium">Leave Type</th>
              <th className="px-6 py-3 font-medium">Dates & Duration</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y", isDark ? "divide-slate-800/50" : "divide-slate-100")}>
            {items.map((item) => (
              <tr key={item.id} className={cn("group transition-colors", isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-50")}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")}>
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className={cn("font-medium", isDark ? "text-slate-200" : "text-slate-900")}>{item.applicant}</div>
                      <div className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-500")}>{item.department}</div>
                    </div>
                  </div>
                </td>
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
                    <span className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-500")}>{item.duration} day{item.duration > 1 ? 's' : ''}</span>
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
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
