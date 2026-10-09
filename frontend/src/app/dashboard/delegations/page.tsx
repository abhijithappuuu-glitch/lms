"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { fetchWithAuth } from "@/lib/apiClient";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePendingApprovals } from "@/hooks/useQueries";
import { ActionTable, ActionTableItem } from "@/components/ui/ActionTable";
import { ReviewApplicationModal } from "@/components/modals/ReviewApplicationModal";

import { useTheme } from "../layout";

export default function DelegationsPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [given, setGiven] = useState<any[]>([]);
  const [received, setReceived] = useState<any[]>([]);
  const [colleagues, setColleagues] = useState<any[]>([]);
  
  // form state
  const [delegateUserId, setDelegateUserId] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [reason, setReason] = useState("");

  const { data: pendingApprovals = [], isLoading: isLoadingApprovals } = usePendingApprovals();
  const [selectedApplication, setSelectedApplication] = useState<ActionTableItem | null>(null);

  const loadDelegations = async () => {
    try {
      const [gRes, rRes] = await Promise.all([
        fetchWithAuth("/delegations/my"),
        fetchWithAuth("/delegations/received")
      ]);
      setGiven(gRes);
      setReceived(rRes);
    } catch (e) {
      console.error(e);
    }
  };

  const loadColleagues = async () => {
    try {
      const res = await fetchWithAuth("/colleagues");
      setColleagues(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDelegations();
    loadColleagues();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth("/delegations", {
        method: "POST",
        body: JSON.stringify({
          delegateUserId,
          scope: user?.role,
          validFrom: new Date(validFrom).toISOString(),
          validTo: new Date(validTo).toISOString(),
          reason
        })
      });
      alert("Delegation created successfully");
      loadDelegations();
    } catch (err: any) {
      alert("Failed to create delegation: " + err.message);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this delegation?")) return;
    try {
      await fetchWithAuth(`/delegations/${id}/revoke`, { method: "POST" });
      loadDelegations();
    } catch (err: any) {
      alert("Failed to revoke: " + err.message);
    }
  };

  const renderDelegationCard = (d: any, type: 'given' | 'received') => {
    const isActive = d.status === 'ACTIVE' && new Date(d.validFrom) <= new Date() && new Date(d.validTo) >= new Date();
    
    return (
      <div key={d.id} className={cn("p-4 rounded-xl border mb-4 transition-colors", 
        isActive 
          ? (isDark ? 'bg-slate-900 border-slate-700 shadow-sm' : 'bg-white border-slate-200 shadow-sm')
          : (isDark ? 'bg-slate-950/50 border-slate-800 opacity-60' : 'bg-slate-50 border-slate-200 opacity-60')
      )}>
        <div className="flex justify-between items-start">
          <div>
            <div className={cn("font-semibold text-lg", isDark ? "text-slate-100" : "text-slate-900")}>
              {type === 'given' ? `To: ${d.delegate.employee?.fullName}` : `From: ${d.delegator.employee?.fullName}`}
            </div>
            <div className={cn("text-sm mb-2", isDark ? "text-slate-400" : "text-slate-500")}>Scope: {d.scope} {d.departmentId && `(${d.departmentId})`}</div>
            <div className="text-sm">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Valid: </span> 
              <span className={isDark ? "text-slate-300" : "text-slate-800"}>{format(new Date(d.validFrom), 'PPp')} — {format(new Date(d.validTo), 'PPp')}</span>
            </div>
            {d.reason && <div className={cn("text-sm mt-2 italic", isDark ? "text-slate-500" : "text-slate-600")}>"{d.reason}"</div>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={cn("px-2 py-1 rounded text-xs font-medium", 
              isActive 
                ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-green-100 text-green-700')
                : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700')
            )}>
              {isActive ? 'ACTIVE' : d.status === 'REVOKED' ? 'REVOKED' : 'EXPIRED'}
            </span>
            {type === 'given' && d.status === 'ACTIVE' && (
              <button onClick={() => handleRevoke(d.id)} className="text-xs text-rose-600 hover:underline">
                Revoke
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Delegations</h1>
        <p className="text-slate-500 mt-1">Manage your acting authorities and assignments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className={cn("rounded-xl p-6 shadow-sm border transition-colors", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
            <h2 className={cn("text-lg font-semibold mb-5", isDark ? "text-slate-100" : "text-slate-900")}>Create New Delegation</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>Delegate To <span className="text-rose-500">*</span></label>
                <select 
                  required 
                  value={delegateUserId} 
                  onChange={e => setDelegateUserId(e.target.value)}
                  className={cn("w-full px-4 py-2 rounded-lg border text-sm transition-colors outline-none focus:ring-2 focus:ring-blue-500/20", isDark ? "bg-slate-950 border-slate-700 text-slate-100" : "bg-white border-slate-200")}
                >
                  <option value="">Select colleague...</option>
                  {colleagues.map(c => (
                    <option key={c.userId} value={c.userId}>{c.fullName} ({c.designation})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>Valid From <span className="text-rose-500">*</span></label>
                  <input type="datetime-local" required value={validFrom} onChange={e => setValidFrom(e.target.value)} className={cn("w-full px-4 py-2 rounded-lg border text-sm transition-colors outline-none focus:ring-2 focus:ring-blue-500/20", isDark ? "bg-slate-950 border-slate-700 text-slate-100 [color-scheme:dark]" : "bg-white border-slate-200 [color-scheme:light]")} />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>Valid To <span className="text-rose-500">*</span></label>
                  <input type="datetime-local" required value={validTo} onChange={e => setValidTo(e.target.value)} className={cn("w-full px-4 py-2 rounded-lg border text-sm transition-colors outline-none focus:ring-2 focus:ring-blue-500/20", isDark ? "bg-slate-950 border-slate-700 text-slate-100 [color-scheme:dark]" : "bg-white border-slate-200 [color-scheme:light]")} />
                </div>
              </div>
              <div>
                <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>Reason <span className="text-rose-500">*</span></label>
                <input type="text" required value={reason} onChange={e => setReason(e.target.value)} className={cn("w-full px-4 py-2 rounded-lg border text-sm transition-colors outline-none focus:ring-2 focus:ring-blue-500/20", isDark ? "bg-slate-950 border-slate-700 text-slate-100" : "bg-white border-slate-200")} placeholder="e.g., On Leave" />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
                  Grant Authority
                </button>
              </div>
            </form>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4 text-slate-900">Active Authorities Received</h2>
            {received.length === 0 ? (
              <p className="text-sm text-slate-500 italic p-4 text-center border border-dashed rounded-xl border-slate-300">No active delegations received.</p>
            ) : (
              received.map(d => renderDelegationCard(d, 'received'))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4 text-slate-900">My Delegations (Given)</h2>
          {given.length === 0 ? (
            <p className="text-sm text-slate-500 italic p-4 text-center border border-dashed rounded-xl border-slate-300">You haven't delegated your authority.</p>
          ) : (
            given.map(d => renderDelegationCard(d, 'given'))
          )}
        </div>
      </div>

      {received.length > 0 && (
        <div className="pt-8">
          <ActionTable 
            title="Action Required: Delegated Approvals" 
            items={pendingApprovals} 
            isDark={false}
            onReview={setSelectedApplication}
          />
        </div>
      )}

      <ReviewApplicationModal 
        isOpen={!!selectedApplication} 
        onClose={() => setSelectedApplication(null)} 
        application={selectedApplication} 
        isDark={false} 
        actingAsDelegate={selectedApplication?.actingAsDelegate}
      />
    </div>
  );
}
