import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GuestInterface } from "@/components/guest/guest-interface";

interface GuestPageProps {
  params: Promise<{ token: string }>;
}

export default async function GuestPage({ params }: GuestPageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // Lookup room by QR token
  const { data: room } = await supabase
    .from("rooms")
    .select("*, room_types(id, name), hotels(name, tax_rate)")
    .eq("qr_token", token)
    .eq("is_active", true)
    .single();

  if (!room) {
    notFound();
  }

  const roomTypeId = (room.room_types as any)?.id;

  // Load menu categories & items visible to this room type
  const [categoriesRes, itemsRes] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .eq("hotel_id", room.hotel_id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select("*, menu_categories(name, icon)")
      .eq("hotel_id", room.hotel_id)
      .eq("is_available", true)
      .order("sort_order"),
  ]);

  // Filter items by room type visibility
  const visibleItems = (itemsRes.data ?? []).filter((item) => {
    if (!item.visible_to_room_types || item.visible_to_room_types.length === 0) return true;
    return item.visible_to_room_types.includes(roomTypeId);
  });

  return (
    <GuestInterface
      room={room}
      hotelName={(room.hotels as any)?.name ?? "Hotel"}
      roomTypeName={(room.room_types as any)?.name ?? "Standard"}
      categories={categoriesRes.data ?? []}
      menuItems={visibleItems}
    />
  );
}

export async function generateMetadata({ params }: GuestPageProps) {
  const { token } = await params;
  return {
    title: `Room Service — HotelOS`,
    description: "Scan to order food, request services, or raise a complaint",
  };
}
