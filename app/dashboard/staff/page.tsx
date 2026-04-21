import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { StaffTaskList } from "@/components/staff/staff-task-list";

export default async function StaffDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("role, hotel_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login");

  const { data: tasks } = await supabase
    .from("requests")
    .select("*")
    .eq("assigned_to", user.id)
    .not("status", "in", '("completed","cancelled")')
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col flex-1">
      <DashboardHeader
        title={`Welcome, ${profile.full_name ?? "Staff"}!`}
        subtitle="Your assigned tasks for today"
      />
      <main className="flex-1 p-6">
        <StaffTaskList
          userId={user.id}
          initialTasks={tasks ?? []}
        />
      </main>
    </div>
  );
}
