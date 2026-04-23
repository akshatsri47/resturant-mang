import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { MenuManager } from "@/components/admin/menu-manager";
import { connection } from "next/server";

export default async function MenuPage() {
  await connection();
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

  const [categoriesRes, itemsRes, roomTypesRes] = await Promise.all([
    supabase.from("menu_categories").select("*").eq("hotel_id", hotelId).order("sort_order"),
    supabase.from("menu_items").select("*, menu_categories(name)").eq("hotel_id", hotelId).order("sort_order"),
    supabase.from("room_types").select("*").eq("hotel_id", hotelId).order("name"),
  ]);

  return (
    <div className="flex flex-col flex-1">
      <DashboardHeader title="Menu & Services" subtitle="Manage food menu, services, and availability" />
      <main className="flex-1 p-6">
        <MenuManager
          hotelId={hotelId}
          categories={categoriesRes.data ?? []}
          items={itemsRes.data ?? []}
          roomTypes={roomTypesRes.data ?? []}
        />
      </main>
    </div>
  );
}
