import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { AdminOverview } from "@/components/admin/admin-overview";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  let { data: profile } = await supabase
    .from("staff_profiles")
    .select("role, full_name, hotel_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // If layout is auto-recovering, wait for it, or just use default admin fallback here temporarily
    profile = { role: "admin", full_name: user.email?.split("@")[0] || "Unknown", hotel_id: null };
  }

  if (!["admin", "super_admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // If no hotel yet, show setup prompt
  let hotel = null;
  let stats = { rooms: 0, staff: 0, pendingRequests: 0, openTabs: 0 };

  if (profile.hotel_id) {
    const [hotelRes, roomsRes, staffRes, requestsRes, tabsRes] = await Promise.all([
      supabase.from("hotels").select("*").eq("id", profile.hotel_id).single(),
      supabase.from("rooms").select("id", { count: "exact" }).eq("hotel_id", profile.hotel_id),
      supabase.from("staff_profiles").select("id", { count: "exact" }).eq("hotel_id", profile.hotel_id),
      supabase.from("requests").select("id", { count: "exact" }).eq("hotel_id", profile.hotel_id).eq("status", "pending"),
      supabase.from("bill_tabs").select("id", { count: "exact" }).eq("hotel_id", profile.hotel_id).eq("status", "open"),
    ]);

    hotel = hotelRes.data;
    stats = {
      rooms: roomsRes.count ?? 0,
      staff: staffRes.count ?? 0,
      pendingRequests: requestsRes.count ?? 0,
      openTabs: tabsRes.count ?? 0,
    };
  }

  return (
    <div className="flex flex-col flex-1">
      <DashboardHeader
        title="Admin Dashboard"
        subtitle={hotel?.name ?? "Setup your hotel to get started"}
      />
      <main className="flex-1 p-6">
        <AdminOverview hotel={hotel} stats={stats} userId={user.id} />
      </main>
    </div>
  );
}
