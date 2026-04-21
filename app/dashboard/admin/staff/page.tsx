import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { StaffManager } from "@/components/admin/staff-manager";

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("role, hotel_id")
    .eq("id", user.id)
    .single();

  if (!profile?.hotel_id || !["admin", "super_admin"].includes(profile.role)) {
    redirect("/dashboard/admin");
  }

  const { data: staffList } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("hotel_id", profile.hotel_id)
    .order("created_at");

  // Get emails from auth.users view (admin only possible via service role or RPC)
  // We'll show what we have from staff_profiles

  return (
    <div className="flex flex-col flex-1">
      <DashboardHeader title="Staff Management" subtitle="Manage your hotel team and roles" />
      <main className="flex-1 p-6">
        <StaffManager
          hotelId={profile.hotel_id}
          currentUserId={user.id}
          staffList={staffList ?? []}
        />
      </main>
    </div>
  );
}
