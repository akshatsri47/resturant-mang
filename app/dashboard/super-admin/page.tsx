import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { Building2, Users, BedDouble } from "lucide-react";

export default async function SuperAdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") redirect("/dashboard");

  const [hotelsRes, staffRes, roomsRes] = await Promise.all([
    supabase.from("hotels").select("*, staff_profiles(count)"),
    supabase.from("staff_profiles").select("id", { count: "exact" }),
    supabase.from("rooms").select("id", { count: "exact" }),
  ]);

  const hotels = hotelsRes.data ?? [];

  return (
    <div className="flex flex-col flex-1">
      <DashboardHeader title="Platform Overview" subtitle="All hotels and system statistics" />
      <main className="flex-1 p-6 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Hotels", value: hotels.length, icon: Building2, color: "text-primary" },
            { label: "Total Staff", value: staffRes.count ?? 0, icon: Users, color: "text-emerald-400" },
            { label: "Total Rooms", value: roomsRes.count ?? 0, icon: BedDouble, color: "text-blue-400" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="glass-card p-5">
                <Icon className={`h-5 w-5 ${s.color} mb-3`} />
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Hotels list */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h3 className="font-semibold">All Hotels</h3>
          </div>
          <table className="w-full hotel-table">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th>Hotel Name</th>
                <th>Address</th>
                <th>Tax Rate</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {hotels.map((hotel) => (
                <tr key={hotel.id}>
                  <td className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      {hotel.name}
                    </div>
                  </td>
                  <td className="text-muted-foreground">{hotel.address ?? "—"}</td>
                  <td>{hotel.tax_rate}%</td>
                  <td className="text-muted-foreground text-sm">
                    {new Date(hotel.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {hotels.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground">No hotels registered</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
