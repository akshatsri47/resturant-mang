"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, CheckCircle, Play, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Request, RequestStatus } from "@/lib/types";

interface StaffTaskListProps {
  userId: string;
  initialTasks: Request[];
}

const typeIcons: Record<string, string> = {
  order: "🍽️",
  service: "🛎️",
  complaint: "⚠️",
};

const priorityColors: Record<string, string> = {
  low: "border-l-slate-500",
  medium: "border-l-amber-500",
  high: "border-l-red-500",
};

export function StaffTaskList({ userId, initialTasks }: StaffTaskListProps) {
  const [tasks, setTasks] = useState<Request[]>(initialTasks);
  const [updating, setUpdating] = useState<string | null>(null);

  const supabase = createClient();

  // Real-time: listen for new assignments
  useEffect(() => {
    const channel = supabase
      .channel(`staff-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "requests",
          filter: `assigned_to=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks((prev) => [payload.new as Request, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Request;
            if (["completed", "cancelled"].includes(updated.status)) {
              setTasks((prev) => prev.filter((t) => t.id !== updated.id));
            } else {
              setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const handleStatusUpdate = async (taskId: string, newStatus: RequestStatus) => {
    setUpdating(taskId);
    try {
      const updates: Partial<Request> = { status: newStatus };
      if (newStatus === "completed") updates.completed_at = new Date().toISOString();

      const { error } = await supabase
        .from("requests")
        .update(updates)
        .eq("id", taskId)
        .eq("assigned_to", userId); // Extra safety

      if (!error && newStatus === "completed") {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } else if (!error) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      }
    } finally {
      setUpdating(null);
    }
  };

  const high = tasks.filter((t) => t.priority === "high");
  const medium = tasks.filter((t) => t.priority === "medium");
  const low = tasks.filter((t) => t.priority === "low");

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold">All done!</h2>
          <p className="text-muted-foreground mt-2">No pending tasks assigned to you.</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-muted-foreground">Waiting for new assignments...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "High Priority", count: high.length, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
          { label: "Medium", count: medium.length, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
          { label: "Low Priority", count: low.length, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20" },
        ].map((s) => (
          <div key={s.label} className={`glass-card p-4 border ${s.border}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`glass-card p-4 border-l-4 ${priorityColors[task.priority]} transition-all`}
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                {typeIcons[task.request_type] ?? "📋"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground">Room {task.room_number}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground capitalize">{task.category}</span>
                  <span className={`text-xs font-medium capitalize ${
                    task.status === "in_progress" ? "text-emerald-400" : "text-blue-400"
                  }`}>
                    {task.status.replace("_", " ")}
                  </span>
                </div>

                {task.guest_name && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <User className="h-3 w-3" /> {task.guest_name}
                  </p>
                )}

                {task.description && (
                  <p className="text-sm text-foreground/80 mt-1">{task.description}</p>
                )}

                {task.items && task.items.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {task.items.map((item, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground">
                        {item.quantity}× {item.name}
                      </p>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                </p>
              </div>

              {/* Action buttons */}
              <div className="shrink-0 flex flex-col gap-2">
                {task.status === "assigned" && (
                  <Button
                    size="sm"
                    className="gap-1.5 bg-blue-600 hover:bg-blue-600/90 text-white text-xs"
                    disabled={updating === task.id}
                    onClick={() => handleStatusUpdate(task.id, "in_progress")}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Start Task
                  </Button>
                )}
                {task.status === "in_progress" && (
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-600/90 text-white text-xs"
                    disabled={updating === task.id}
                    onClick={() => handleStatusUpdate(task.id, "completed")}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {updating === task.id ? "Completing..." : "Mark Done"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
