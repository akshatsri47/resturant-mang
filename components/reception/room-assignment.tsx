"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BedDouble, User, CheckCircle2, XCircle, LogOut } from "lucide-react";

interface RoomAssignmentProps {
  hotelId: string;
  userRole: string;
}

export function RoomAssignment({ hotelId, userRole }: RoomAssignmentProps) {
  const supabase = createClient();
  const [rooms, setRooms] = useState<any[]>([]);
  const [openTabs, setOpenTabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "occupied">("all");
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // Realtime: watch bill_tabs for changes
    const channel = supabase
      .channel(`rooms-occupancy-${hotelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bill_tabs", filter: `hotel_id=eq.${hotelId}` },
        () => loadData()
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hotelId]);

  const loadData = async () => {
    try {
      const [roomsRes, tabsRes] = await Promise.all([
        supabase.from("rooms")
          .select("*, room_type:room_types(name, price_tier), floor:floors(floor_number, name)")
          .eq("hotel_id", hotelId).eq("is_active", true).order("room_number"),
        supabase.from("bill_tabs")
          .select("*, rooms(room_number)")
          .eq("hotel_id", hotelId).eq("status", "open"),
      ]);
      setRooms(roomsRes.data || []);
      setOpenTabs(tabsRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const occupiedRoomIds = new Set(openTabs.map((t) => t.room_id));
  const getTab = (roomId: string) => openTabs.find((t) => t.room_id === roomId);

  const filteredRooms = rooms.filter((r) => {
    if (filterStatus === "available") return !occupiedRoomIds.has(r.id);
    if (filterStatus === "occupied") return occupiedRoomIds.has(r.id);
    return true;
  });

  const stats = {
    total: rooms.length,
    occupied: rooms.filter((r) => occupiedRoomIds.has(r.id)).length,
    available: rooms.filter((r) => !occupiedRoomIds.has(r.id)).length,
  };
  const pct = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;

  const handleCheckIn = async (roomId: string) => {
    if (!guestName.trim()) { setError("Guest name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const { error: e } = await supabase.from("bill_tabs").insert({
        hotel_id: hotelId, room_id: roomId,
        guest_name: guestName.trim(),
        check_in_date: new Date().toISOString(),
        status: "open", tax_rate: 10, discount_cents: 0,
      });
      if (e) throw e;
      setGuestName("");
      setCheckingIn(null);
      await loadData();
    } catch (e: any) {
      setError(e.message || "Check-in failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCheckOut = async (tabId: string) => {
    if (!confirm("Check out this guest and settle the bill?")) return;
    await supabase.from("bill_tabs").update({
      status: "settled", check_out_date: new Date().toISOString(),
    }).eq("id", tabId);
    await loadData();
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading rooms...</p>;

  return (
    <div className="space-y-6">
      {/* Occupancy summary */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Room Occupancy</h2>
          <span className="text-sm text-muted-foreground">{pct}% occupied</span>
        </div>
        <div className="w-full bg-muted/30 rounded-full h-2 mb-4">
          <div
            className="bg-primary rounded-full h-2 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-6 text-sm">
          <span className="flex items-center gap-2 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />{stats.occupied} Occupied
          </span>
          <span className="flex items-center gap-2 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />{stats.available} Available
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" />{stats.total} Total
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "available", "occupied"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              filterStatus === f
                ? "bg-primary text-primary-foreground"
                : "glass-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "🏠 All Rooms" : f === "available" ? "✅ Available" : "🔴 Occupied"}
          </button>
        ))}
      </div>

      {/* Room cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((room) => {
          const isOccupied = occupiedRoomIds.has(room.id);
          const tab = getTab(room.id);
          return (
            <div
              key={room.id}
              className={`glass-card p-4 border-l-4 ${isOccupied ? "border-l-red-500/70" : "border-l-emerald-500/70"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-foreground">Room {room.room_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isOccupied ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                    }`}>
                      {isOccupied ? "Occupied" : "Available"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{room.room_type?.name || "Standard"}</p>
                  {room.floor && (
                    <p className="text-xs text-muted-foreground">Floor {room.floor.floor_number}</p>
                  )}
                </div>
                <BedDouble className={`h-6 w-6 ${isOccupied ? "text-red-400" : "text-emerald-400"}`} />
              </div>

              {isOccupied && tab && (
                <div className="bg-muted/20 rounded-lg p-3 mb-3 space-y-1">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {tab.guest_name || "Guest"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Checked in: {new Date(tab.check_in_date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              )}

              {!isOccupied ? (
                checkingIn === room.id ? (
                  <div className="space-y-2">
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <Input
                      placeholder="Guest name *"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="h-9 text-sm bg-input/50"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-600/90 text-white gap-1"
                        disabled={saving} onClick={() => handleCheckIn(room.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {saving ? "Checking in..." : "Check In"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setCheckingIn(null); setError(null); setGuestName(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm" variant="outline"
                    className="w-full gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => { setCheckingIn(room.id); setError(null); }}
                  >
                    + Check In Guest
                  </Button>
                )
              ) : (
                <Button
                  size="sm" variant="outline"
                  className="w-full gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => tab && handleCheckOut(tab.id)}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Check Out
                </Button>
              )}
            </div>
          );
        })}
        {filteredRooms.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground glass-card">
            <BedDouble className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>No {filterStatus !== "all" ? filterStatus : ""} rooms found</p>
          </div>
        )}
      </div>
    </div>
  );
}
