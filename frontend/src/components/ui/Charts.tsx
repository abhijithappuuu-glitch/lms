"use client";

import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

interface DonutChartProps {
  data: { name: string; value: number; color?: string }[];
  title: string;
  titleIcon?: React.ReactNode;
  /** Header control, e.g. a "This Year" select. */
  action?: React.ReactNode;
  /** Render share percentages next to legend entries (mockup style). */
  showPercentages?: boolean;
  isDark?: boolean;
}

// Heritage palette used for donut slices when no valid color is supplied.
// Steel blue + muted brass + sage green + navy.
const HERITAGE_SLICE_COLORS = ["#315B73", "#B18A52", "#6E9B7A", "#5D8AA3", "#102A3A", "#C6A372"];

export function PanelHeader({ title, titleIcon, action, isDark }: { title: string; titleIcon?: React.ReactNode; action?: React.ReactNode; isDark?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h3 className={cn("font-serif font-semibold text-lg flex items-center gap-2.5", isDark ? "text-slate-100" : "text-slate-800")}>
        {titleIcon && <span className={cn(isDark ? "text-blue-400" : "text-blue-600")}>{titleIcon}</span>}
        {title}
      </h3>
      {action}
    </div>
  );
}

/** Small pill-style dropdown control shown in panel headers (mockup: "This Month ▾"). */
export function ChartSelect({ value, onChange, options, isDark }: { value: string; onChange: (v: string) => void; options: string[]; isDark?: boolean }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "text-xs font-medium px-2.5 py-1.5 rounded-md border bg-transparent cursor-pointer outline-none transition-colors focus:border-blue-500",
        isDark ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"
      )}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export function DonutChart({ data, title, titleIcon, action, showPercentages = false, isDark }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  const hasData = total > 0;

  return (
    <div className={cn("rounded-xl border p-5 flex flex-col h-full", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
      <PanelHeader title={title} titleIcon={titleIcon} action={action} isDark={isDark} />

      <div className={cn("flex-1 flex items-center gap-4 min-h-[220px]", !showPercentages && "justify-center")}>
        <div className="relative flex-1 h-full min-h-[200px]">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || HERITAGE_SLICE_COLORS[index % HERITAGE_SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#102A3A" : "#ffffff",
                    borderColor: isDark ? "#273844" : "#DFDACD",
                    color: isDark ? "#EDE9DF" : "#263238",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  itemStyle={{ color: isDark ? "#C7C3BA" : "#57646D" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <>
              <div className={cn("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[150px] rounded-full border-[14px]", isDark ? "border-slate-800" : "border-slate-100")} />
              <div className={cn("absolute inset-0 flex items-center justify-center text-sm font-medium", isDark ? "text-slate-500" : "text-slate-400")}>
                No Data
              </div>
            </>
          )}
        </div>

        {showPercentages && (
          <div className="w-40 shrink-0 flex flex-col gap-2.5">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color || HERITAGE_SLICE_COLORS[index % HERITAGE_SLICE_COLORS.length] }}
                />
                <span className={cn("font-medium truncate", isDark ? "text-slate-300" : "text-slate-600")}>{item.name}</span>
                <span className={cn("ml-auto font-semibold tabular-nums", isDark ? "text-slate-400" : "text-slate-500")}>
                  {total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SimpleBarChartProps {
  data: { name: string; value: number; value2?: number }[];
  title: string;
  titleIcon?: React.ReactNode;
  /** Header control, e.g. a "This Month" select. */
  action?: React.ReactNode;
  /** Optional second series name (e.g. "Approved"). Enables grouped bars when data has value2. */
  secondSeriesName?: string;
  secondSeriesColor?: string;
  /** Bottom legend entries. Defaults to a single "Total Leaves" entry. */
  legend?: { name: string; color: string }[];
  isDark?: boolean;
}

export function SimpleBarChart({ data, title, titleIcon, action, secondSeriesName, secondSeriesColor = "#B18A52", legend, isDark }: SimpleBarChartProps) {
  const hasSecond = data.some((d) => d.value2 !== undefined);
  const legendItems = legend || [{ name: "Total Leaves", color: isDark ? "#5D8AA3" : "#315B73" }];

  return (
    <div className={cn("rounded-xl border p-5 flex flex-col h-full", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
      <PanelHeader title={title} titleIcon={titleIcon} action={action} isDark={isDark} />

      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#273844" : "#DFDACD"} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? "#9EA2A3" : "#737C82", fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? "#9EA2A3" : "#737C82", fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: isDark ? "#273844" : "#F6F3EC" }}
              contentStyle={{
                backgroundColor: isDark ? "#102A3A" : "#ffffff",
                borderColor: isDark ? "#273844" : "#DFDACD",
                color: isDark ? "#EDE9DF" : "#263238",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="value" name={legendItems[0]?.name || "Total Leaves"} fill={isDark ? "#5D8AA3" : "#315B73"} radius={[4, 4, 0, 0]} barSize={hasSecond ? 18 : 32} />
            {hasSecond && (
              <Bar dataKey="value2" name={secondSeriesName || "Approved"} fill={secondSeriesColor} radius={[4, 4, 0, 0]} barSize={18} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-5">
        {legendItems.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-xs font-medium">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className={cn(isDark ? "text-slate-400" : "text-slate-600")}>{entry.name}</span>
          </div>
        ))}
        {hasSecond && secondSeriesName && (
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: secondSeriesColor }} />
            <span className={cn(isDark ? "text-slate-400" : "text-slate-600")}>{secondSeriesName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
