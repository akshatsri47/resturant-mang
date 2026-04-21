"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Clock,
  User,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Loader,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Request, RequestStatus } from "@/lib/types";

interface ReceptionQueueProps {
  hotelId: string;
  initialRequests: Request[];
  staff: { id: string; full_name: string | null; role: string }[];
}

const STATUS_ORDER: RequestStatus[] = ["pending", "assigned", "in_progress"];

const typeIcons: Record<string, string> = {
  order: "🍽️",
  service: "🛎️",
  complaint: "⚠️",
};

const priorityClass: Record<string, string> = {
  low: "badge-low",
  medium: "badge-medium",
  high: "badge-high",
};

const statusClass: Record<string, string> = {
  pending: "badge-pending",
  assigned: "badge-assigned",
  in_progress: "badge-in_progress",
  completed: "badge-completed",
  cancelled: "badge-cancelled",
};

export function ReceptionQueue({ hotelId, initialRequests, staff }: ReceptionQueueProps) {
  const [requests, setRequests] = useState<Request[]>(initialRequests);
  const [filter, setFilter] = useState<RequestStatus | "all">("all");
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const supabase = createClient();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`reception-${hotelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "requests",
          filter: `hotel_id=eq.${hotelId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newReq = payload.new as Request;
            if (!["completed", "cancelled"].includes(newReq.status)) {
              setRequests((prev) => [newReq, ...prev]);
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Request;
            setRequests((prev) => {
              if (["completed", "cancelled"].includes(updated.status)) {
                return prev.filter((r) => r.id !== updated.id);
              }
              return prev.map((r) => (r.id === updated.id ? updated : r));
            });
          } else if (payload.eventType === "DELETE") {
            setRequests((prev) => prev.filter((r) => r.id !== (payload.old as Request).id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [hotelId]);

  const handleAssign = async (requestId: string) => {
    const staffId = assignTo[requestId];
    if (!staffId) return;

    await supabase
      .from("requests")
      .update({
        assigned_to: staffId,
        status: "assigned",
        assigned_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    setAssigning(null);
  };

  const handleStatusUpdate = async (requestId: string, newStatus: RequestStatus) => {
    const updates: Partial<Request> = { status: newStatus };
    if (newStatus === "completed") updates.completed_at = new Date().toISOString();

    await supabase.from("requests").update(updates).eq("id", requestId);
  };

  const filteredRequests = filter === "all"
    ? requests
    : requests.filter((r) => r.status === filter);

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    assigned: requests.filter((r) => r.status === "assigned").length,
    in_progress: requests.filter((r) => r.status === "in_progress").length,
  };

  return (
    <div className="space-y-5">
      {/* Filter tabs + count badges */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 glass-card p-1.5 w-fit">
          {(["all", "pending", "assigned", "in_progress"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === status
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {status === "all" ? "All" : status.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                filter === status ? "bg-primary-foreground/20" : "bg-muted"
              }`}>
                {counts[status]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Live updates
        </div>
      </div>

      {/* Request cards */}
      <div className="space-y-3">
        {filteredRequests.map((req) => (
          <div
            key={req.id}
            className={`glass-card p-4 transition-all border ${
              req.priority === "high"
                ? "border-red-500/30 hover:border-red-500/50"
                : req.priority === "medium"
                ? "border-amber-500/20 hover:border-amber-500/40"
                : "border-border/50 hover:border-border"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Type icon */}
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                {typeIcons[req.request_type] ?? "📋"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground">Room {req.room_number}</span>
                  <span className="text-muted-foreground text-sm">·</span>
                  <span className="text-sm text-muted-foreground capitalize">
                    {req.category}
                  </span>
                  <span className={priorityClass[req.priority]}>{req.priority}</span>
                  <span className={statusClass[req.status]}>
                    {req.status.replace("_", " ")}
                  </span>
                </div>

                {req.guest_name && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <User className="h-3 w-3" /> {req.guest_name}
                  </p>
                )}

                {req.description && (
                  <p className="text-sm text-foreground/80 mt-1 line-clamp-1">
                    {req.description}
                  </p>
                )}

                {req.items && req.items.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {req.items.length} item{req.items.length > 1 ? "s" : ""} ordered
                  </p>
                )}
              </div>

              {/* Right side: time + actions */}
              <div className="shrink-0 text-right space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end">
                  {req.status === "pending" && (
                    <div className="flex items-center gap-2">
                      {assigning === req.id ? (
                        <>
                          <select
                            value={assignTo[req.id] ?? ""}
                            onChange={(e) =>
                              setAssignTo((p) => ({ ...p, [req.id]: e.target.value }))
                            }
                            className="text-xs h-8 rounded border border-border bg-input px-2 text-foreground"
                          >
                            <option value="">Staff...</option>
                            {staff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.full_name ?? s.id.slice(0, 6)}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => handleAssign(req.id)}
                            disabled={!assignTo[req.id]}
                          >
                            Assign
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() => setAssigning(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() => setAssigning(req.id)}
                        >
                          Assign Staff
                        </Button>
                      )}
                    </div>
                  )}

                  {req.status === "assigned" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-muted-foreground"
                      onClick={() => handleStatusUpdate(req.id, "in_progress")}
                    >
                      Mark In Progress
                    </Button>
                  )}

                  {req.status === "in_progress" && (
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-600/90 text-white gap-1"
                      onClick={() => handleStatusUpdate(req.id, "completed")}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredRequests.length === 0 && (
          <div className="text-center py-16 text-muted-foreground glass-card">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No {filter !== "all" ? filter.replace("_", " ") : ""} requests</p>
            <p className="text-sm mt-1 opacity-70">
              {filter === "pending" ? "All caught up! 🎉" : "Nothing here yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
