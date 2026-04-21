import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const roleRedirects: Record<string, string> = {
    super_admin: "/dashboard/super-admin",
    admin: "/dashboard/admin",
    supervisor: "/dashboard/supervisor",
    reception: "/dashboard/reception",
    staff: "/dashboard/staff",
  };

  const target = profile ? (roleRedirects[profile.role] ?? "/dashboard/admin") : "/dashboard/admin";
  redirect(target);
}
