import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { type Role } from "@/lib/types";
import { connection } from "next/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch profile + hotel name
  let { data: profile } = await supabase
    .from("staff_profiles")
    .select("role, full_name, hotel_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Attempt auto-recovery for missing profiles (can happen if trigger fails)
    const { data: newProfile, error } = await supabase
      .from("staff_profiles")
      .insert({
        id: user.id,
        role: "admin", // Default to admin for recovery
        full_name: user.email?.split("@")[0] || "Unknown",
      })
      .select("role, full_name, hotel_id")
      .single();

    if (error || !newProfile) {
      redirect("/auth/login?error=profile_missing");
    }
    profile = newProfile;
  }

  let hotelName: string | undefined;
  if (profile.hotel_id) {
    const { data: hotel } = await supabase
      .from("hotels")
      .select("name")
      .eq("id", profile.hotel_id)
      .single();
    hotelName = hotel?.name;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        role={profile.role as Role}
        hotelName={hotelName}
        userName={profile.full_name ?? user.email?.split("@")[0]}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
