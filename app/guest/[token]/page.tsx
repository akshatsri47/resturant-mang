import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GuestInterface } from "@/components/guest/guest-interface";

import { Suspense } from "react";

interface GuestPageProps {
  params: Promise<{ token: string }>;
}

async function GuestData({ token }: { token: string }) {
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

export default async function GuestPage({ params }: GuestPageProps) {
  const { token } = await params;

  return (
    <Suspense 
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium">Loading room details...</p>
          </div>
        </div>
      }
    >
      <GuestData token={token} />
    </Suspense>
  );
}

export async function generateMetadata({ params }: GuestPageProps) {
  const { token } = await params;
  return {
    title: `Room Service — HotelOS`,
    description: "Scan to order food, request services, or raise a complaint",
  };
}
