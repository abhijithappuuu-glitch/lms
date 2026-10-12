import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/apiClient";

export function useLeaveTypes() {
  return useQuery({
    queryKey: ["leaveTypes"],
    queryFn: () => fetchWithAuth("/leave-types")
  });
}

export function useColleagues(departmentId?: string) {
  return useQuery({
    queryKey: ["colleagues", departmentId],
    queryFn: () => fetchWithAuth(`/colleagues?departmentId=${departmentId || ''}`)
  });
}

export function useBalances() {
  return useQuery({
    queryKey: ["balances"],
    queryFn: () => fetchWithAuth(`/ledger/balances`),
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ["pendingApprovals"],
    queryFn: () => fetchWithAuth(`/leave/applications/pending`),
  });
}

export function useProcessApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, decision, remarks }: { id: string; decision: "APPROVE" | "RECOMMEND" | "RETURN" | "REJECT"; remarks: string }) => {
      return fetchWithAuth(`/workflow/process/${id}`, {
        method: "POST",
        body: JSON.stringify({ decision, remarks })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingApprovals"] });
    },
    onError: (err: any) => {
      alert(`Approval failed: ${err.message}`);
    },
  });
}

export function useSimulateLeave(leaveTypeCode: string | undefined, startDate: string | undefined, endDate: string | undefined, isHalfDay: boolean = false, uploadedDocumentTypes: string[] = []) {
  return useQuery({
    queryKey: ["simulateLeave", leaveTypeCode, startDate, endDate, isHalfDay, uploadedDocumentTypes],
    queryFn: () => {
      const payload = { leaveTypeCode, startDate, endDate, isHalfDay, uploadedDocumentTypes };
      return fetchWithAuth(`/leave/applications/simulate`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    enabled: !!leaveTypeCode && !!startDate && !!endDate,
  });
}

export function useMyApplications() {
  return useQuery({
    queryKey: ["myApplications"],
    queryFn: () => fetchWithAuth(`/leave/applications/my-applications`),
  });
}

export function useCancelLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      return fetchWithAuth(`/leave/applications/${id}/cancel`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
    },
    onError: (err: any) => {
      alert(`Cancellation failed: ${err.message}`);
    },
  });
}

export function useDashboardMetrics(role: string) {
  return useQuery({
    queryKey: ["dashboardMetrics", role],
    queryFn: () => {
      if (role === "EMPLOYEE") return fetchWithAuth(`/dashboard/employee/metrics`);
      if (role === "HOD") return fetchWithAuth(`/dashboard/hod/metrics`);
      return fetchWithAuth(`/dashboard/principal/metrics`);
    },
    enabled: !!role
  });
}

export function useChartData() {
  return useQuery({
    queryKey: ["chartData"],
    queryFn: () => fetchWithAuth(`/dashboard/charts`),
  });
}

export function useRecentApprovals() {
  return useQuery({
    queryKey: ["recentApprovals"],
    queryFn: () => fetchWithAuth(`/leave/applications/recent`),
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, entitlement }: { id: string; entitlement: number }) => {
      return fetchWithAuth(`/admin/policies/${id}`, {
        method: "POST",
        body: JSON.stringify({ annualEntitlement: entitlement })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaveTypes"] });
    },
    onError: (err: any) => {
      alert(`Policy update failed: ${err.message}`);
    },
  });
}

export function useApplication(id: string | null) {
  return useQuery({
    queryKey: ["application", id],
    queryFn: () => fetchWithAuth(`/leave/applications/${id}`),
    enabled: !!id,
  });
}
