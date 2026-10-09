"use client";

import React, { useState } from "react";
import { useTheme } from "../layout";
import { MetricCard } from "@/components/ui/MetricCard";
import { ActionTable, ActionTableItem } from "@/components/ui/ActionTable";
import { DonutChart } from "@/components/ui/Charts";
import { Users, AlertTriangle, GraduationCap } from "lucide-react";
import { usePendingApprovals, useDashboardMetrics } from "@/hooks/useQueries";
import { ReviewApplicationModal } from "@/components/modals/ReviewApplicationModal";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DeanDashboard() {
  const { isDark } = useTheme();
  const [selectedApplication, setSelectedApplication] = useState<ActionTableItem | null>(null);
  
  const { data: pendingApprovals = [], isLoading } = usePendingApprovals();
  const { data: metrics, isLoading: loadingMetrics } = useDashboardMetrics("DEAN");

  const facultyOnLeaveData = [
    { name: "CSE", value: 4, color: "blue" },
    { name: "ECE", value: 3, color: "emerald" },
    { name: "MECH", value: 2, color: "amber" },
    { name: "CIVIL", value: 1, color: "rose" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dean's Overview</h1>
          <p className="text-slate-500 mt-1">Cross-departmental insights and escalated approvals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Escalated Approvals" value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : (metrics?.pendingRequests || 0)} icon={<AlertTriangle />} isDark={isDark} />
        <MetricCard title="Total Faculty on Leave" value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : (metrics?.onLeaveToday || 0)} icon={<Users />} isDark={isDark} />
        <MetricCard title="HODs on Leave" value="1" icon={<GraduationCap />} isDark={isDark} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <ActionTable 
            title={isLoading ? "Loading Approvals..." : "Escalated Approvals (Requires Dean Review)"} 
            items={pendingApprovals} 
            isDark={isDark} 
            onReview={setSelectedApplication}
          />
        </div>
        
        <div className="space-y-8">
          <div className="h-80">
            <DonutChart title="Faculty on Leave by Dept" data={facultyOnLeaveData} isDark={isDark} />
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
