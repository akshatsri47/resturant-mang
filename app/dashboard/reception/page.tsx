import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { ReceptionQueue } from "@/components/reception/reception-queue";
import { RoomAssignment } from "@/components/reception/room-assignment";

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
      .in("role", ["staff", "supervisor"])
      .eq("is_active", true),
  ]);

  return (
    <div className="flex flex-col flex-1">
      <DashboardHeader title="Reception Dashboard" subtitle="Manage requests, assign rooms, and track occupancy" />
      <main className="flex-1 p-6 space-y-8">

        {/* Tabs between Queue and Room Assignment */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

          {/* Left: Request Queue */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wider">
              📋 Live Request Queue
            </h2>
            <ReceptionQueue
              hotelId={hotelId}
              initialRequests={requestsRes.data ?? []}
              staff={staffRes.data ?? []}
            />
          </div>

          {/* Right: Room Assignment */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wider">
              🛏️ Room Assignment
            </h2>
            <RoomAssignment hotelId={hotelId} userRole={profile.role} />
          </div>

        </div>
      </main>
    </div>
  );
}
