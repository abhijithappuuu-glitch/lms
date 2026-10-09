import { cn } from "@/lib/utils";

export function Skeleton({ className, isDark }: { className?: string, isDark?: boolean }) {
  return (
    <div className={cn("animate-pulse rounded-md", isDark ? "bg-slate-800" : "bg-slate-200", className)} />
  );
}
