"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Clock, AlertTriangle, Users, RefreshCw } from "lucide-react";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import type { Request } from "@/lib/types";

interface SupervisorMonitorProps {
  hotelId: string;
  initialRequests: Request[];
  staff: { id: string; full_name: string | null; role: string }[];
}

export function SupervisorMonitor({ hotelId, initialRequests, staff }: SupervisorMonitorProps) {
  const [requests, setRequests] = useState<Request[]>(initialRequests);
  const [reassigning, setReassigning] = useState<string | null>(null);
  const [newStaff, setNewStaff] = useState<Record<string, string>>({});

  const supabase = createClient();

  // Real-time
  useEffect(() => {
    const channel = supabase
      .channel(`supervisor-${hotelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "requests", filter: `hotel_id=eq.${hotelId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new as Request;
            if (!["completed", "cancelled"].includes(r.status)) setRequests((p) => [r, ...p]);
          } else if (payload.eventType === "UPDATE") {
            const r = payload.new as Request;
            setRequests((p) => {
              if (["completed", "cancelled"].includes(r.status)) return p.filter((x) => x.id !== r.id);
              return p.map((x) => x.id === r.id ? r : x);
            });
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hotelId]);

  const handleReassign = async (requestId: string) => {
    const staffId = newStaff[requestId];
    if (!staffId) return;
    await supabase.from("requests").update({
      assigned_to: staffId,
      status: "assigned",
      assigned_at: new Date().toISOString(),
    }).eq("id", requestId);
    setReassigning(null);
  };

  const handleEscalate = async (requestId: string) => {
    await supabase.from("requests").update({ priority: "high" }).eq("id", requestId);
    setRequests((p) => p.map((r) => r.id === requestId ? { ...r, priority: "high" } : r));
  };

  // Classify requests
  const now = new Date();
  const delayed = requests.filter((r) => {
    const mins = differenceInMinutes(now, new Date(r.created_at));
    if (r.status === "pending" && mins > 10) return true;
    if (r.status === "in_progress" && mins > 30) return true;
    return false;
  });
  const pending = requests.filter((r) => r.status === "pending");
  const assigned = requests.filter((r) => r.status === "assigned");
  const inProgress = requests.filter((r) => r.status === "in_progress");

  const staffOnly = staff.filter((s) => s.role === "staff");

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending", count: pending.length, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
          { label: "Assigned", count: assigned.length, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
          { label: "In Progress", count: inProgress.length, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
          { label: "SLA Breaches", count: delayed.length, color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
        ].map((s) => (
          <div key={s.label} className={`glass-card p-4 border ${s.bg}`}>
            <p className={`text-3xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* SLA Alerts */}
      {delayed.length > 0 && (
        <div className="glass-card border-red-500/30 bg-red-500/5 p-5">
          <h3 className="font-semibold text-red-400 flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4" />
            SLA Breaches ({delayed.length})
          </h3>
          <div className="space-y-3">
            {delayed.map((r) => {
              const mins = differenceInMinutes(now, new Date(r.created_at));
              return (
                <div key={r.id} className="flex items-center gap-3 bg-red-500/10 rounded-lg p-3">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Room {r.room_number} · {r.category}</p>
                    <p className="text-xs text-red-300/80">
                      {r.status === "pending" ? `Unassigned` : `In progress`} for {mins} minutes
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="text-xs h-8 bg-red-600 hover:bg-red-600/90 text-white"
                    onClick={() => handleEscalate(r.id)}
                  >
                    Escalate
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All active requests */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-semibold">All Active Requests</h3>
          <span className="text-sm text-muted-foreground">{requests.length} total</span>
        </div>
        <table className="w-full hotel-table">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              <th>Room</th>
              <th>Type</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Age</th>
              <th>Assigned To</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const mins = differenceInMinutes(now, new Date(r.created_at));
              const isDelayed = (r.status === "pending" && mins > 10) || (r.status === "in_progress" && mins > 30);
              const assignedStaff = staff.find((s) => s.id === r.assigned_to);
              return (
                <tr key={r.id} className={isDelayed ? "bg-red-500/5" : ""}>
                  <td className="font-bold text-foreground">
                    <span className="flex items-center gap-2">
                      {isDelayed && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
                      {r.room_number}
                    </span>
                  </td>
                  <td className="capitalize text-sm">{r.category}</td>
                  <td>
                    <span className={
                      r.status === "pending" ? "badge-pending" :
                      r.status === "assigned" ? "badge-assigned" :
                      "badge-in_progress"
                    }>
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>
                    <span className={
                      r.priority === "high" ? "badge-high" :
                      r.priority === "medium" ? "badge-medium" : "badge-low"
                    }>
                      {r.priority}
                    </span>
                  </td>
                  <td className="text-sm text-muted-foreground">{mins}m</td>
                  <td className="text-sm">
                    {assignedStaff ? assignedStaff.full_name : <span className="text-muted-foreground italic">Unassigned</span>}
                  </td>
                  <td>
                    {reassigning === r.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={newStaff[r.id] ?? ""}
                          onChange={(e) => setNewStaff((p) => ({ ...p, [r.id]: e.target.value }))}
                          className="text-xs h-7 rounded border border-border bg-input px-1.5 text-foreground"
                        >
                          <option value="">Staff...</option>
                          {staffOnly.map((s) => (
                            <option key={s.id} value={s.id}>{s.full_name}</option>
                          ))}
                        </select>
                        <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => handleReassign(r.id)} disabled={!newStaff[r.id]}>
                          Go
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setReassigning(null)}>✕</Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground hover:text-primary"
                        onClick={() => setReassigning(r.id)}
                      >
                        <Users className="h-3.5 w-3.5 mr-1" />
                        Reassign
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  <ShieldAlert className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  All clear — no active requests
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
