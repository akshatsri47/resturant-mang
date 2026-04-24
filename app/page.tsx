import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowRight, Bed, Coffee, ConciergeBell, ShieldCheck } from "lucide-react";
import { Suspense } from "react";

const YEAR = new Date().getFullYear();


async function AuthRedirect() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  // Stale/invalid refresh token — sign out silently and show landing page
  if (error?.code === 'refresh_token_not_found' || error?.status === 400) {
    await supabase.auth.signOut();
    return null;
  }

  if (user) {
    const { data: profile } = await supabase
      .from("staff_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile) {
      const roleRedirects: Record<string, string> = {
        super_admin: "/dashboard/super-admin",
        admin: "/dashboard/admin",
        supervisor: "/dashboard/supervisor",
        reception: "/dashboard/reception",
        staff: "/dashboard/staff",
      };

      redirect(roleRedirects[profile.role] ?? "/dashboard/admin");
    }
  }
  
  return null;
}


export default function Home() {

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Suspense fallback={null}>
        <AuthRedirect />
      </Suspense>
      {/* Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <ConciergeBell className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
            Lumiere
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/login"
            className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20 text-center relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-30 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur-3xl opacity-20 animate-pulse" />
        </div>

        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-medium border border-indigo-100 dark:border-indigo-500/20 mb-4">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
            Next-Gen Hotel Operations
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            Elevate Your Guest Experience <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              Seamlessly.
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            The all-in-one platform for modern hotels to manage in-room dining, guest requests, staff operations, and analytics in real-time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/auth/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
            >
              Access Dashboard <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-24 relative z-10">
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow text-left">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
              <Coffee className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Smart In-Room Dining</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">QR-based digital menus with instant order routing to the kitchen and real-time status updates.</p>
          </div>

          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow text-left">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
              <Bed className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Service Operations</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Automated task assignment, SLA tracking, and staff coordination for housekeeping and maintenance.</p>
          </div>

          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow text-left">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Role-Based Access</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Secure dashboards tailored for Super Admins, Managers, Receptionists, and Floor Staff.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm border-t border-slate-200 dark:border-slate-800">
        <p>© {YEAR} Lumiere Hotel Operations. All rights reserved.</p>
      </footer>
    </div>
  );
}
