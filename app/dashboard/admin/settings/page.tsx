import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { HotelSettings } from "@/components/admin/hotel-settings";

export default async function SettingsPage() {
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

  const [hotelRes, slaRes] = await Promise.all([
    supabase.from("hotels").select("*").eq("id", profile.hotel_id).single(),
    supabase.from("sla_rules").select("*").eq("hotel_id", profile.hotel_id),
  ]);

  return (
    <div className="flex flex-col flex-1">
      <DashboardHeader title="Hotel Settings" subtitle="Configure tax, SLA rules, and more" />
      <main className="flex-1 p-6">
        <HotelSettings
          hotel={hotelRes.data}
          slaRules={slaRes.data ?? []}
        />
      </main>
    </div>
  );
}
