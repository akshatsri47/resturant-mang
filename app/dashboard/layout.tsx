import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { type Role } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch profile + hotel name
  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("role, full_name, hotel_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/login");
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
