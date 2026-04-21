import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { BillingManager } from "@/components/admin/billing-manager";

export default async function ReceptionBillsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("role, hotel_id")
    .eq("id", user.id)
    .single();

  if (!profile?.hotel_id || !["reception", "admin", "super_admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const hotelId = profile.hotel_id;

  const [tabsRes, hotelRes] = await Promise.all([
    supabase.from("bill_tabs").select("*, rooms(room_number), bill_line_items(*)").eq("hotel_id", hotelId).order("created_at", { ascending: false }),
    supabase.from("hotels").select("tax_rate").eq("id", hotelId).single(),
  ]);

  return (
    <div className="flex flex-col flex-1">
      <DashboardHeader title="Room Bills" subtitle="View and manage room billing tabs" />
      <main className="flex-1 p-6">
        <BillingManager
          hotelId={hotelId}
          tabs={tabsRes.data ?? []}
          taxRate={hotelRes.data?.tax_rate ?? 10}
          userRole={profile.role}
        />
      </main>
    </div>
  );
}
