import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { RoomsManager } from "@/components/admin/rooms-manager";

export default async function RoomsPage() {
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

  const hotelId = profile.hotel_id;

  const [roomTypesRes, floorsRes, roomsRes] = await Promise.all([
    supabase.from("room_types").select("*").eq("hotel_id", hotelId).order("name"),
    supabase.from("floors").select("*").eq("hotel_id", hotelId).order("floor_number"),
    supabase
      .from("rooms")
      .select("*, room_types(name, color), floors(floor_number, name)")
      .eq("hotel_id", hotelId)
      .order("room_number"),
  ]);

  return (
    <div className="flex flex-col flex-1">
      <DashboardHeader title="Rooms & Floors" subtitle="Manage your room inventory and QR codes" />
      <main className="flex-1 p-6">
        <RoomsManager
          hotelId={hotelId}
          roomTypes={roomTypesRes.data ?? []}
          floors={floorsRes.data ?? []}
          rooms={roomsRes.data ?? []}
        />
      </main>
    </div>
  );
}
