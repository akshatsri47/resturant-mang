import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { BillingManager } from "@/components/admin/billing-manager";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("role, hotel_id")
    .eq("id", user.id)
    .single();

  if (!profile?.hotel_id || !["admin", "super_admin", "reception"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const hotelId = profile.hotel_id;

  // Fetch open bill tabs with line items
  const { data: tabs } = await supabase
    .from("bill_tabs")
    .select("*, rooms(room_number, room_type_id), bill_line_items(*)")
    .eq("hotel_id", hotelId)
    .order("created_at", { ascending: false });

  const { data: hotel } = await supabase
    .from("hotels")
    .select("tax_rate")
    .eq("id", hotelId)
    .single();

  return (
    <div className="flex flex-col flex-1">
      <DashboardHeader
        title="Billing"
        subtitle="Room tabs, line items, and invoices"
      />
      <main className="flex-1 p-6">
        <BillingManager
          hotelId={hotelId}
          tabs={tabs ?? []}
          taxRate={hotel?.tax_rate ?? 10}
          userRole={profile.role}
        />
      </main>
    </div>
  );
}
