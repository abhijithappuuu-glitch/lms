"use client";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { fetchWithAuth } from "@/lib/apiClient";

export function RegistrationApprovals({ isDark }: { isDark?: boolean }) {
  const [users, setUsers] = useState<any[]>([]);
  const { user } = useAuth();
  
  const fetchPending = async () => {
    try {
      let data = await fetchWithAuth("/auth/pending-registrations");
      // If HOD, filter by department!
      if (user?.role === "HOD") {
        data = data.filter((u: any) => u.employee?.departmentId === user?.departmentId);
      }
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) fetchPending();
  }, [user]);

  const handleApprove = async (id: string, status: string) => {
    try {
      await fetchWithAuth(`/auth/approve-registration/${id}`, {
        method: "POST",
        body: JSON.stringify({ status })
      });
      fetchPending();
    } catch (e) {
      console.error(e);
    }
  };

  if (users.length === 0) return null; // Hide if nothing to approve

  return (
    <div className={cn("rounded-xl border shadow-sm overflow-hidden flex flex-col mt-8", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
      <div className={cn("px-6 py-4 border-b flex justify-between items-center", isDark ? "border-slate-800" : "border-slate-200")}>
        <h3 className={cn("font-semibold text-lg", isDark ? "text-slate-100" : "text-slate-800")}>
          Pending Staff Registrations
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className={cn("text-xs uppercase", isDark ? "bg-slate-950/50 text-slate-400" : "bg-slate-50 text-slate-500")}>
            <tr>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Department</th>
              <th className="px-6 py-3 font-medium">Category / Tenure</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y", isDark ? "divide-slate-800/50" : "divide-slate-100")}>
            {users.map((u) => (
              <tr key={u.id} className={cn("group transition-colors", isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-50")}>
                <td className="px-6 py-4">
                  <div className={cn("font-medium", isDark ? "text-slate-200" : "text-slate-900")}>{u.employee?.fullName}</div>
                  <div className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-500")}>{u.email}</div>
                </td>
                <td className="px-6 py-4">{u.employee?.department?.name}</td>
                <td className="px-6 py-4">
                  <div>{u.employee?.category} - {u.employee?.serviceType}</div>
                  <div className="text-xs opacity-70">{u.employee?.tenureStatus}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleApprove(u.id, "REJECTED")} className="text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-md mr-2 text-xs font-medium">Reject</button>
                  <button onClick={() => handleApprove(u.id, "ACTIVE")} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-sm">Approve</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
