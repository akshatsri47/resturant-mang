"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Shield, Trash2, CheckCircle2 } from "lucide-react";
import type { StaffProfile, Role } from "@/lib/types";

interface StaffManagerProps {
  hotelId: string;
  currentUserId: string;
  staffList: StaffProfile[];
}

const ROLES: { value: Role; label: string; description: string; color: string }[] = [
  { value: "admin", label: "Admin", description: "Full hotel management access", color: "text-amber-400" },
  { value: "supervisor", label: "Supervisor", description: "Monitor requests and escalations", color: "text-blue-400" },
  { value: "reception", label: "Reception", description: "Manage requests and billing", color: "text-emerald-400" },
  { value: "staff", label: "Staff", description: "View and complete assigned tasks", color: "text-slate-400" },
];

export function StaffManager({ hotelId, currentUserId, staffList }: StaffManagerProps) {
  const [localStaff, setLocalStaff] = useState(staffList);
  const [isAdding, setIsAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create user account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role, hotel_id: hotelId },
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("Could not create user");

      // Update their profile with hotel_id (the trigger creates the profile)
      await supabase
        .from("staff_profiles")
        .update({ hotel_id: hotelId, role, full_name: fullName })
        .eq("id", data.user.id);

      setLocalStaff((p) => [
        ...p,
        {
          id: data.user!.id,
          hotel_id: hotelId,
          full_name: fullName,
          email,
          role,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      setSuccess(`${fullName} added as ${role}`);
      setEmail(""); setFullName(""); setPassword(""); setRole("staff"); setIsAdding(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add staff");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (staffId: string, newRole: Role) => {
    await supabase.from("staff_profiles").update({ role: newRole }).eq("id", staffId);
    setLocalStaff((p) => p.map((s) => (s.id === staffId ? { ...s, role: newRole } : s)));
  };

  const handleDeactivate = async (staffId: string) => {
    if (staffId === currentUserId) { setError("Cannot deactivate yourself"); return; }
    if (!confirm("Deactivate this staff member?")) return;
    await supabase.from("staff_profiles").update({ is_active: false }).eq("id", staffId);
    setLocalStaff((p) => p.map((s) => (s.id === staffId ? { ...s, is_active: false } : s)));
  };

  const roleColors: Record<string, string> = {
    super_admin: "text-purple-400",
    admin: "text-amber-400",
    supervisor: "text-blue-400",
    reception: "text-emerald-400",
    staff: "text-slate-400",
  };

  const roleBadge: Record<string, string> = {
    super_admin: "badge-in_progress",
    admin: "badge-medium",
    supervisor: "badge-assigned",
    reception: "badge-completed",
    staff: "badge-low",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Team Members</h2>
          <p className="text-sm text-muted-foreground">{localStaff.length} staff members</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Staff
        </Button>
      </div>

      {(error || success) && (
        <div className={`text-sm rounded-lg px-3 py-2 border ${error
          ? "text-destructive bg-destructive/10 border-destructive/20"
          : "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
        }`}>
          {error ?? success}
        </div>
      )}

      {isAdding && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Add New Staff Member
          </h3>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Full Name *</Label>
                <Input placeholder="Jane Smith" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="jane@hotel.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Temporary Password *</Label>
                <Input type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              </div>
              <div className="grid gap-2">
                <Label>Role *</Label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="h-10 rounded-md border border-border bg-input px-3 text-sm text-foreground"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role descriptions */}
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <div
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    role === r.value
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50 hover:border-border"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${r.color.replace("text-", "bg-")}`} />
                  <div>
                    <p className={`text-sm font-medium ${r.color}`}>{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isLoading ? "Creating..." : "Create Staff Account"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Staff table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full hotel-table">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {localStaff.map((staff) => (
              <tr key={staff.id} className={staff.id === currentUserId ? "bg-primary/5" : ""}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                      {(staff.full_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {staff.full_name ?? "Unnamed"}
                        {staff.id === currentUserId && (
                          <span className="ml-2 text-xs text-primary">(you)</span>
                        )}
                      </p>
                    </div>
                  </div>
                </td>
                <td>
                  {staff.id === currentUserId ? (
                    <span className={roleBadge[staff.role]}>{staff.role}</span>
                  ) : (
                    <select
                      value={staff.role}
                      onChange={(e) => handleUpdateRole(staff.id, e.target.value as Role)}
                      className="text-xs rounded border border-border bg-input px-2 py-1 text-foreground"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td>
                  {staff.is_active ? (
                    <span className="badge-completed">Active</span>
                  ) : (
                    <span className="badge-cancelled">Inactive</span>
                  )}
                </td>
                <td>
                  {staff.id !== currentUserId && staff.is_active && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive text-xs"
                      onClick={() => handleDeactivate(staff.id)}
                    >
                      Deactivate
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {localStaff.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p>No staff members yet</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
