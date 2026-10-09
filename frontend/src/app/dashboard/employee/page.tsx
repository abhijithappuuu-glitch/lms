"use client";

import React from "react";
import { useTheme } from "../layout";
import { MetricCard } from "@/components/ui/MetricCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ActionTable, ActionTableItem } from "@/components/ui/ActionTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { Calendar, Clock, FileText, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { ApplyLeaveForm } from "@/components/forms/ApplyLeaveForm";
import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMyApplications, useCancelLeave, useDashboardMetrics, useLeaveTypes, usePendingApprovals } from "@/hooks/useQueries";
import { API_URL } from "@/lib/apiClient";
import { LeaveType } from "@/types/api";
import { ViewApplicationModal } from "@/components/modals/ViewApplicationModal";
import { ReviewApplicationModal } from "@/components/modals/ReviewApplicationModal";

export default function EmployeeDashboard() {
  const { isDark } = useTheme();
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [viewApp, setViewApp] = useState<ActionTableItem | null>(null);
  const [reviewApp, setReviewApp] = useState<ActionTableItem | null>(null);
  const { user } = useAuth();
  
  const { data: recentApplications = [], isLoading: loadingApps } = useMyApplications();
  const { data: pendingApprovals = [], isLoading: loadingApprovals } = usePendingApprovals();
  const { data: metrics, isLoading: loadingMetrics } = useDashboardMetrics("EMPLOYEE");
  const { data: leaveTypes = [], isLoading: loadingTypes } = useLeaveTypes();
  const cancelLeave = useCancelLeave();

  const handleDownloadPdf = (id: string) => {
    window.open(`${API_URL}/leave/applications/${id}/pdf`, '_blank');
  };

  const handleCancel = (id: string) => {
    if (confirm("Are you sure you want to cancel this leave application?")) {
      cancelLeave.mutate(id);
    }
  };

  const clBalance = metrics?.balances?.CL || 0;
  const elBalance = metrics?.balances?.EL || 0;
  
  const clPolicy = leaveTypes.find((lt: LeaveType) => lt.code === "CL")?.annualEntitlement || 15;
  const elPolicy = leaveTypes.find((lt: LeaveType) => lt.code === "EL")?.annualEntitlement || 60;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.fullName?.split(' ')[1] || user?.fullName}!</h1>
          <p className="text-slate-500 mt-1">Here is the status of your leaves and entitlements.</p>
        </div>
        <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
          <DialogTrigger asChild>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Apply for Leave
            </button>
          </DialogTrigger>
          <DialogContent isDark={isDark}>
            <ApplyLeaveForm isDark={isDark} onSuccess={() => setIsApplyModalOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="Casual Leave Balance" 
          value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : clBalance} 
          icon={<Calendar />} 
          isDark={isDark} 
        />
        <MetricCard 
          title="Earned Leave Balance" 
          value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : elBalance} 
          icon={<Clock />} 
          isDark={isDark} 
        />
        <MetricCard 
          title="Upcoming Leaves" 
          value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : (metrics?.upcomingLeaves || 0)} 
          icon={<FileText />} 
          isDark={isDark} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {pendingApprovals.length > 0 && (
            <ActionTable 
              title="Duty Adjustment Requests" 
              items={pendingApprovals} 
              isDark={isDark}
              onReview={(item) => setReviewApp(item)}
            />
          )}

          <ActionTable 
            title="Recent Applications" 
            items={recentApplications} 
            isDark={isDark} 
            onDownloadPdf={handleDownloadPdf}
            onCancel={handleCancel}
            onReview={(item) => setViewApp(item)}
          />
        </div>
        
        <div className="space-y-6">
          {/* Leave Entitlements Progress */}
          <div className={`p-6 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="font-semibold text-lg mb-6">Leave Utilization</h3>
            <div className="space-y-5">
              {loadingTypes || loadingMetrics ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" isDark={isDark} />
                  <Skeleton className="h-8 w-full" isDark={isDark} />
                </div>
              ) : (
                <>
                  <ProgressBar label="Casual Leave (CL)" value={clPolicy - clBalance} max={clPolicy} color="blue" isDark={isDark} />
                  <ProgressBar label="Earned Leave (EL)" value={elPolicy - elBalance} max={elPolicy} color="emerald" isDark={isDark} />
                  <ProgressBar label="Official On Duty (OOD)" value={metrics?.balances?.OOD || 0} max={10} color="amber" isDark={isDark} />
                </>
              )}
            </div>
          </div>
          
          {/* Removed decorative banner as requested */}
        </div>
      </div>
      
      <ViewApplicationModal
        isOpen={!!viewApp}
        onClose={() => setViewApp(null)}
        application={viewApp}
        isDark={isDark}
      />

      <ReviewApplicationModal 
        isOpen={!!reviewApp} 
        onClose={() => setReviewApp(null)} 
        application={reviewApp} 
        isDark={isDark} 
      />
    </div>
  );
}
