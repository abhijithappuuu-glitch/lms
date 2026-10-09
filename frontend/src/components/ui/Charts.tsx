"use client";

import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

interface DonutChartProps {
  data: { name: string; value: number; color: string }[];
  title: string;
  isDark?: boolean;
}

export function DonutChart({ data, title, isDark }: DonutChartProps) {
  return (
    <div className={cn("rounded-xl border p-5 shadow-sm flex flex-col h-full", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
      <h3 className={cn("font-semibold text-lg mb-4", isDark ? "text-slate-100" : "text-slate-800")}>{title}</h3>
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
                borderColor: isDark ? "#1e293b" : "#e2e8f0",
                color: isDark ? "#f8fafc" : "#0f172a",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              itemStyle={{ color: isDark ? "#cbd5e1" : "#475569" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-600")}>
              {item.name} ({item.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SimpleBarChartProps {
  data: { name: string; value: number }[];
  title: string;
  isDark?: boolean;
}

export function SimpleBarChart({ data, title, isDark }: SimpleBarChartProps) {
  return (
    <div className={cn("rounded-xl border p-5 shadow-sm flex flex-col h-full", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
      <h3 className={cn("font-semibold text-lg mb-4", isDark ? "text-slate-100" : "text-slate-800")}>{title}</h3>
      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#e2e8f0"} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? "#64748b" : "#64748b", fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? "#64748b" : "#64748b", fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: isDark ? "#1e293b" : "#f1f5f9" }}
              contentStyle={{
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
                borderColor: isDark ? "#1e293b" : "#e2e8f0",
                color: isDark ? "#f8fafc" : "#0f172a",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="value" fill={isDark ? "#3b82f6" : "#2563eb"} radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
