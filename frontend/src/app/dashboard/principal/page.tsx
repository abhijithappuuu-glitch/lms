"use client";

import React from "react";
import { useTheme } from "../layout";
import { MetricCard } from "@/components/ui/MetricCard";
import { ActionTable, ActionTableItem } from "@/components/ui/ActionTable";
import { SimpleBarChart } from "@/components/ui/Charts";
import { Building, Users, AlertTriangle } from "lucide-react";
import { usePendingApprovals, useDashboardMetrics, useChartData } from "@/hooks/useQueries";
import { Skeleton } from "@/components/ui/Skeleton";
import { ReviewApplicationModal } from "@/components/modals/ReviewApplicationModal";
import { useState } from "react";

export default function PrincipalDashboard() {
  const { isDark } = useTheme();
  const [selectedApplication, setSelectedApplication] = useState<ActionTableItem | null>(null);

  const { data: highLevelApprovals = [], isLoading } = usePendingApprovals();
  const { data: metrics, isLoading: loadingMetrics } = useDashboardMetrics("PRINCIPAL");
  const { data: chartData, isLoading: loadingCharts } = useChartData();

  const departmentComparison = chartData?.departmentStats?.map((stat: any) => ({
    name: stat.name,
    value: stat.activeLeaves
  })) || [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Principal Dashboard</h1>
          <p className="text-slate-400 mt-1">Institution Overview & Approvals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard title="Total Staff" value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : (metrics?.totalFaculty || 0)} icon={<Building />} isDark={isDark} />
        <MetricCard title="Total Staff on Leave" value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : (metrics?.onLeaveToday || 0)} icon={<Users />} isDark={isDark} />
        <MetricCard title="High-Level Approvals" value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : (metrics?.pendingRequests || 0)} icon={<AlertTriangle />} isDark={isDark} />
        <MetricCard title="Approved This Month" value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : (metrics?.approvedThisMonth || 0)} icon={<Building />} isDark={isDark} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <ActionTable 
            title={isLoading ? "Loading..." : "Pending HOD / Special Leave Approvals"} 
            items={highLevelApprovals} 
            isDark={isDark} 
            onReview={setSelectedApplication}
          />
        </div>
        
        <div className="space-y-8">
          <div className="h-96">
            {loadingCharts ? <Skeleton className="w-full h-full" isDark={isDark} /> : <SimpleBarChart title="Leaves by Department" data={departmentComparison} isDark={isDark} />}
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
