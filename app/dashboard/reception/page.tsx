import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { ReceptionQueue } from "@/components/reception/reception-queue";

export default async function ReceptionDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("role, hotel_id")
    .eq("id", user.id)
    .single();

  if (!profile?.hotel_id || !["reception", "admin", "super_admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const hotelId = profile.hotel_id;

  // Load all non-completed requests + available staff
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
      .eq("role", "staff")
      .eq("is_active", true),
  ]);

  return (
    <div className="flex flex-col flex-1">
      <DashboardHeader title="Requests Queue" subtitle="Manage and assign incoming service requests" />
      <main className="flex-1 p-6">
        <ReceptionQueue
          hotelId={hotelId}
          initialRequests={requestsRes.data ?? []}
          staff={staffRes.data ?? []}
        />
      </main>
    </div>
  );
}
