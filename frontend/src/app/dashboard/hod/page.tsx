"use client";

import React from "react";
import { useTheme } from "@/lib/dashboard-theme";
import { MetricCard } from "@/components/ui/MetricCard";
import { ActionTable, ActionTableItem } from "@/components/ui/ActionTable";
import { DonutChart, SimpleBarChart } from "@/components/ui/Charts";
import { Users, FileCheck, AlertCircle } from "lucide-react";
import { usePendingApprovals, useDashboardMetrics, useChartData } from "@/hooks/useQueries";
import { ReviewApplicationModal } from "@/components/modals/ReviewApplicationModal";
import { useState } from "react";
import { RegistrationApprovals } from "@/components/tables/RegistrationApprovals";
import { useAuth } from "@/components/providers/AuthProvider";
import { Skeleton } from "@/components/ui/Skeleton";

export default function HODDashboard() {
  const { isDark } = useTheme();
  const [selectedApplication, setSelectedApplication] = useState<ActionTableItem | null>(null);

  const { user } = useAuth();
  const { data: pendingApprovals = [], isLoading } = usePendingApprovals();
  const { data: metrics, isLoading: loadingMetrics } = useDashboardMetrics("HOD");
  const { data: chartData, isLoading: loadingCharts } = useChartData();

  const leaveTypesData = chartData?.distribution || [];
  const weeklyTrend = chartData?.trend || [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HOD Dashboard</h1>
          <p className="text-slate-400 mt-1">Department of Computer Science & Engineering</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard title="Total Faculty" value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : (metrics?.totalFaculty || 0)} icon={<Users />} isDark={isDark} />
        <MetricCard title="Staff on Leave Today" value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : (metrics?.onLeaveToday || 0)} icon={<Users />} isDark={isDark} />
        <MetricCard title="Pending Approvals" value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : (metrics?.pendingRequests || 0)} icon={<AlertCircle />} isDark={isDark} />
        <MetricCard title="Approved This Month" value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : (metrics?.approvedThisMonth || 0)} icon={<FileCheck />} isDark={isDark} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <ActionTable 
            title={isLoading ? "Loading Approvals..." : "Action Required: Leave Applications"} 
            items={pendingApprovals} 
            isDark={isDark}
            onReview={setSelectedApplication}
          />

        </div>
        
        <div className="space-y-8">
          <div className="h-80">
            {loadingCharts ? <Skeleton className="w-full h-full" isDark={isDark} /> : <DonutChart title="Department Leave Distribution" data={leaveTypesData} isDark={isDark} />}
          </div>
          <div className="h-80">
            {loadingCharts ? <Skeleton className="w-full h-full" isDark={isDark} /> : <SimpleBarChart title="Monthly Leave Trend" data={weeklyTrend} isDark={isDark} />}
          </div>
        </div>
      </div>

      <ReviewApplicationModal 
        isOpen={!!selectedApplication} 
        onClose={() => setSelectedApplication(null)} 
        application={selectedApplication} 
        isDark={isDark} 
        actingAsDelegate={selectedApplication?.actingAsDelegate}
      />
    </div>
  );
}
