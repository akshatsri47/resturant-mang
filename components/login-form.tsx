"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2 } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Get role and redirect
      const { data: { user } } = await supabase.auth.getUser();
      let profile = null;

      if (user) {
        const { data } = await supabase
          .from("staff_profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        profile = data;
      }

      const roleRedirects: Record<string, string> = {
        super_admin: "/dashboard/super-admin",
        admin: "/dashboard/admin",
        supervisor: "/dashboard/supervisor",
        reception: "/dashboard/reception",
        staff: "/dashboard/staff",
      };

      const target = profile
        ? (roleRedirects[profile.role] ?? "/dashboard/admin")
        : "/dashboard/admin";

      router.push(target);
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 w-full", className)} {...props}>
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 border border-primary/30">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Sign in to the hotel management dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@hotel.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-input/50"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-input/50"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold mt-1"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </div>
            <div className="mt-5 text-center text-sm text-muted-foreground">
              New hotel?{" "}
              <Link
                href="/auth/sign-up"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Register your hotel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
