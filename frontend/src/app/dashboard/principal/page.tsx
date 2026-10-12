"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useTheme } from "@/lib/dashboard-theme";
import { MetricCard } from "@/components/ui/MetricCard";
import { ActionTable, ActionTableItem } from "@/components/ui/ActionTable";
import { SimpleBarChart, DonutChart, ChartSelect } from "@/components/ui/Charts";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  Users,
  FileText,
  Hourglass,
  CheckCircle2,
  BarChart3,
  PieChart,
  Clock,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { usePendingApprovals, useDashboardMetrics, useChartData, useRecentApprovals } from "@/hooks/useQueries";
import { Skeleton } from "@/components/ui/Skeleton";
import { ReviewApplicationModal } from "@/components/modals/ReviewApplicationModal";
import { cn } from "@/lib/utils";

/** Human-readable leave-type names & slice colors for the distribution donut. */
const LEAVE_NAMES: Record<string, string> = {
  CL: "Casual Leave",
  SL: "Sick Leave",
  EL: "Earned Leave",
  DL: "Duty Leave",
  OOD: "Special Leave",
  SPL: "Special Leave",
  LOP: "Loss of Pay",
};
const LEAVE_COLORS: Record<string, string> = {
  CL: "#315B73",
  SL: "#B18A52",
  EL: "#6E9B7A",
  DL: "#5D8AA3",
  OOD: "#102A3A",
  SPL: "#102A3A",
  LOP: "#C6A372",
};

/** Recent Approvals panel — decided applications, mockup layout. */
function RecentApprovalsTable({ items, isLoading, isDark, onViewAll }: {
  items: any[];
  isLoading?: boolean;
  isDark?: boolean;
  onViewAll?: () => void;
}) {
  return (
    <div className={cn("rounded-xl border overflow-hidden flex flex-col", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
      <div className={cn("px-6 py-4 border-b flex justify-between items-center gap-4", isDark ? "border-slate-800" : "border-slate-100")}>
        <h3 className={cn("font-serif font-semibold text-lg flex items-center gap-2.5", isDark ? "text-slate-100" : "text-slate-800")}>
          <span className={cn(isDark ? "text-blue-400" : "text-blue-600")}><Clock className="w-5 h-5" /></span>
          Recent Approvals
        </h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors shrink-0",
              isDark ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"
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
              <th className="px-6 py-3 font-medium">Dates</th>
              <th className="px-6 py-3 font-medium">Decision</th>
              <th className="px-6 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y", isDark ? "divide-slate-800/50" : "divide-slate-100")}>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center">
                  <Skeleton className="h-5 w-48 mx-auto" isDark={isDark} />
                </td>
              </tr>
            )}
            {!isLoading && items.map((item, index) => (
              <tr key={item.id} className={cn("transition-colors", isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-50")}>
                <td className={cn("px-6 py-4 text-xs font-medium", isDark ? "text-slate-500" : "text-slate-400")}>{index + 1}</td>
                <td className={cn("px-6 py-4 font-medium", isDark ? "text-slate-200" : "text-slate-900")}>{item.applicant}</td>
                <td className={cn("px-6 py-4", isDark ? "text-slate-400" : "text-slate-600")}>{item.department}</td>
                <td className={cn("px-6 py-4 font-medium", isDark ? "text-slate-300" : "text-slate-700")}>{item.leaveType}</td>
                <td className={cn("px-6 py-4", isDark ? "text-slate-400" : "text-slate-600")}>{item.dates}</td>
                <td className="px-6 py-4"><StatusPill status={item.status} isDark={isDark} /></td>
                <td className={cn("px-6 py-4 whitespace-nowrap", isDark ? "text-slate-500" : "text-slate-500")}>{item.date}</td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mb-1", isDark ? "bg-slate-800 text-slate-500" : "bg-slate-50 text-slate-400")}>
                      <Inbox className="w-7 h-7" />
                    </div>
                    <div className={cn("text-[15px] font-semibold", isDark ? "text-slate-200" : "text-slate-700")}>No recent approvals</div>
                    <div className="text-sm text-slate-500">Approved applications will appear here.</div>
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

export default function PrincipalDashboard() {
  const { isDark } = useTheme();
  const [selectedApplication, setSelectedApplication] = useState<ActionTableItem | null>(null);
  const [barPeriod, setBarPeriod] = useState("This Month");
  const [donutPeriod, setDonutPeriod] = useState("This Year");

  const { data: highLevelApprovals = [], isLoading } = usePendingApprovals();
  const { data: recentApprovals = [], isLoading: loadingRecent } = useRecentApprovals();
  const { data: metrics, isLoading: loadingMetrics } = useDashboardMetrics("PRINCIPAL");
  const { data: chartData, isLoading: loadingCharts } = useChartData();

  const departmentComparison = (chartData?.departmentStats || []).map((stat: any) => ({
    name: stat.name,
    value: stat.total ?? stat.activeLeaves ?? 0,
    value2: stat.approved ?? stat.activeLeaves ?? 0,
  }));

  const distributionData = (chartData?.distribution || []).map((d: any) => ({
    name: LEAVE_NAMES[d.name] || d.name,
    value: d.value,
    color: LEAVE_COLORS[d.name],
  }));

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* ── Welcome hero with campus imagery ─────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-y-0 right-0 w-[55%]">
          <Image
            src="/campus-bg.png"
            alt="SDMCET Campus, Dharwad"
            fill
            sizes="(max-width: 1024px) 100vw, 700px"
            className="object-cover object-center"
            priority
          />
          <div className={cn("absolute inset-0 bg-gradient-to-r", isDark ? "from-[#0A1D29] via-[#0A1D29]/92 to-[#0A1D29]/10" : "from-[#F5F2EA] via-[#F5F2EA]/92 to-[#F5F2EA]/10")} />
        </div>

        <div className="relative px-2 py-8">
          <div className="absolute top-6 right-8 text-right hidden sm:block">
            <div className="h-0.5 w-10 bg-[#B18A52] ml-auto mb-3" />
            <p className={cn("text-[11px] font-semibold tracking-[0.4em] uppercase leading-relaxed", isDark ? "text-slate-300" : "text-slate-600")}>
              SDMCET
              <br />
              Dharwad
            </p>
          </div>

          <p className={cn("text-xs font-semibold tracking-[0.35em] uppercase mb-2", isDark ? "text-slate-500" : "text-slate-500")}>
            Welcome Back
          </p>
          <h1 className={cn("font-serif text-4xl lg:text-[42px] font-bold tracking-tight", isDark ? "text-slate-50" : "text-[#263238]")}>
            Principal Dashboard
          </h1>
          <p className={cn("mt-2 text-[17px]", isDark ? "text-slate-400" : "text-slate-600")}>
            Institution Overview &amp; Approvals
          </p>
        </div>
      </section>

      {/* ── Compact stat tiles ───────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <MetricCard
          title="Total Staff"
          subtitle="Across all departments"
          value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : (metrics?.totalFaculty || 0)}
          icon={<Users />}
          tint="blue"
          showArrow
          isDark={isDark}
        />
        <MetricCard
          title="Staff on Leave"
          subtitle="Currently on leave"
          value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : (metrics?.onLeaveToday || 0)}
          icon={<FileText />}
          tint="brass"
          showArrow
          isDark={isDark}
        />
        <MetricCard
          title="High-Level Approvals"
          subtitle="Pending at your level"
          value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : (metrics?.pendingRequests || 0)}
          icon={<Hourglass />}
          tint="rose"
          showArrow
          isDark={isDark}
        />
        <MetricCard
          title="Approved This Month"
          subtitle="Total sanctioned"
          value={loadingMetrics ? <Skeleton className="h-8 w-16" isDark={isDark} /> : (metrics?.approvedThisMonth || 0)}
          icon={<CheckCircle2 />}
          tint="emerald"
          showArrow
          isDark={isDark}
        />
      </section>

      {/* ── Priority: approvals table + charts ───────────────────── */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          <ActionTable
            title={isLoading ? "Loading..." : "Pending HOD / Special Leave Approvals"}
            titleIcon={<FileText className="w-5 h-5" />}
            items={highLevelApprovals}
            isDark={isDark}
            onReview={setSelectedApplication}
            onViewAll={() => {}}
            emptyTitle="No records found"
            emptyMessage="There are no pending applications at this level."
          />

          <RecentApprovalsTable
            items={recentApprovals}
            isLoading={loadingRecent}
            isDark={isDark}
            onViewAll={() => {}}
          />
        </div>

        <div className="space-y-6">
          <div className="h-[420px]">
            {loadingCharts ? (
              <Skeleton className="w-full h-full" isDark={isDark} />
            ) : (
              <SimpleBarChart
                title="Leaves by Department"
                titleIcon={<BarChart3 className="w-5 h-5" />}
                action={
                  <ChartSelect
                    value={barPeriod}
                    onChange={setBarPeriod}
                    options={["This Month", "This Year"]}
                    isDark={isDark}
                  />
                }
                data={departmentComparison}
                secondSeriesName="Approved"
                legend={[{ name: "Total Leaves", color: isDark ? "#5D8AA3" : "#315B73" }]}
                isDark={isDark}
              />
            )}
          </div>

          <div className="h-[360px]">
            {loadingCharts ? (
              <Skeleton className="w-full h-full" isDark={isDark} />
            ) : (
              <DonutChart
                title="Leave Type Distribution"
                titleIcon={<PieChart className="w-5 h-5" />}
                action={
                  <ChartSelect
                    value={donutPeriod}
                    onChange={setDonutPeriod}
                    options={["This Year", "Last Year"]}
                    isDark={isDark}
                  />
                }
                data={distributionData}
                showPercentages
                isDark={isDark}
              />
            )}
          </div>
        </div>
      </section>

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
