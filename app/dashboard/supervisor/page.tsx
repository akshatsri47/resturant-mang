import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { SupervisorMonitor } from "@/components/supervisor/supervisor-monitor";

export default async function SupervisorDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("role, hotel_id")
    .eq("id", user.id)
    .single();

  if (!profile?.hotel_id || !["supervisor", "admin", "super_admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const hotelId = profile.hotel_id;

  const [requestsRes, staffRes] = await Promise.all([
    supabase
      .from("requests")
      .select("*")
      .eq("hotel_id", hotelId)
      .not("status", "in", '("completed","cancelled")')
      .order("created_at", { ascending: false }),
    supabase
      .from("staff_profiles")
      .select("id, full_name, role")
      .eq("hotel_id", hotelId)
      .eq("is_active", true),
  ]);

  return (
    <div className="flex flex-col flex-1">
      <DashboardHeader title="Supervisor Monitor" subtitle="Real-time overview of all active requests" />
      <main className="flex-1 p-6">
        <SupervisorMonitor
          hotelId={hotelId}
          initialRequests={requestsRes.data ?? []}
          staff={staffRes.data ?? []}
        />
      </main>
    </div>
  );
}
