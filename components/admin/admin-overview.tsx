"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2,
  BedDouble,
  Users,
  ClipboardList,
  CreditCard,
  Plus,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import type { Hotel } from "@/lib/types";

interface AdminOverviewProps {
  hotel: Hotel | null;
  stats: {
    rooms: number;
    staff: number;
    pendingRequests: number;
    openTabs: number;
  };
  userId: string;
}

export function AdminOverview({ hotel, stats, userId }: AdminOverviewProps) {
  const [isCreatingHotel, setIsCreatingHotel] = useState(false);
  const [hotelName, setHotelName] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Create hotel
      const { data: newHotel, error: hotelError } = await supabase
        .from("hotels")
        .insert({
          name: hotelName,
          address: hotelAddress,
          created_by: userId,
        })
        .select()
        .single();

      if (hotelError) throw hotelError;

      // Link admin to hotel
      await supabase
        .from("staff_profiles")
        .update({ hotel_id: newHotel.id })
        .eq("id", userId);

      // Refresh page to show hotel data
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create hotel");
    } finally {
      setIsLoading(false);
    }
  };

  // No hotel yet — show setup wizard
  if (!hotel) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md">
          {!isCreatingHotel ? (
            <div className="glass-card p-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Welcome to HotelOS!</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Let's set up your hotel. You'll be able to add rooms, menu
                  items, staff, and start managing service requests in minutes.
                </p>
              </div>
              <Button
                onClick={() => setIsCreatingHotel(true)}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2"
                size="lg"
              >
                <Plus className="h-4 w-4" />
                Create Your Hotel
              </Button>
            </div>
          ) : (
            <div className="glass-card p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Hotel Details</h2>
                  <p className="text-xs text-muted-foreground">Step 1 of 1</p>
                </div>
              </div>
              <form onSubmit={handleCreateHotel} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="hotelName">Hotel Name *</Label>
                  <Input
                    id="hotelName"
                    placeholder="e.g. The Grand Royale"
                    required
                    value={hotelName}
                    onChange={(e) => setHotelName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hotelAddress">Address</Label>
                  <Input
                    id="hotelAddress"
                    placeholder="123 Hotel Street, Mumbai"
                    value={hotelAddress}
                    onChange={(e) => setHotelAddress(e.target.value)}
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCreatingHotel(false)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating..." : "Create Hotel"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Hotel exists — show dashboard
  const statCards = [
    {
      label: "Total Rooms",
      value: stats.rooms,
      icon: BedDouble,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      border: "border-blue-400/20",
    },
    {
      label: "Staff Members",
      value: stats.staff,
      icon: Users,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/20",
    },
    {
      label: "Pending Requests",
      value: stats.pendingRequests,
      icon: ClipboardList,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/20",
    },
    {
      label: "Open Bill Tabs",
      value: stats.openTabs,
      icon: CreditCard,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
      border: "border-purple-400/20",
    },
  ];

  const quickActions = [
    { label: "Add Rooms", href: "/dashboard/admin/rooms", icon: BedDouble },
    { label: "Manage Menu", href: "/dashboard/admin/menu", icon: ClipboardList },
    { label: "Add Staff", href: "/dashboard/admin/staff", icon: Users },
    { label: "View Billing", href: "/dashboard/admin/billing", icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      {/* Hotel header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{hotel.name}</h2>
            {hotel.address && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {hotel.address}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">
                Active
              </span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Tax Rate</p>
              <p className="font-semibold text-foreground">{hotel.tax_rate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`glass-card p-5 border ${stat.border}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center`}
                >
                  <Icon className={`h-4.5 w-4.5 ${stat.color}`} size={18} />
                </div>
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className={`text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <a
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {action.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {/* Setup checklist */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Setup Checklist
        </h3>
        <div className="space-y-3">
          {[
            { label: "Hotel created", done: true },
            { label: "Room types configured", done: stats.rooms > 0 },
            { label: "Rooms added", done: stats.rooms > 0 },
            { label: "Menu items added", done: false },
            { label: "Staff added", done: stats.staff > 1 },
            { label: "QR codes generated", done: stats.rooms > 0 },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                  item.done
                    ? "bg-emerald-500/20 border border-emerald-500/40"
                    : "bg-muted border border-border"
                }`}
              >
                {item.done && (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                )}
              </div>
              <span
                className={`text-sm ${
                  item.done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
