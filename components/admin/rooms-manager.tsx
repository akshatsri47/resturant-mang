"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BedDouble,
  Plus,
  QrCode,
  Layers,
  Tag,
  Trash2,
  Download,
  CheckCircle2,
} from "lucide-react";
import type { Room, RoomType, Floor } from "@/lib/types";


interface RoomsManagerProps {
  hotelId: string;
  roomTypes: RoomType[];
  floors: Floor[];
  rooms: (Room & { room_types?: { name: string; color: string }; floors?: { floor_number: number; name: string | null } })[];
}

type ActiveTab = "rooms" | "room-types" | "floors";

export function RoomsManager({ hotelId, roomTypes, floors, rooms }: RoomsManagerProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("rooms");

  // Room Type Form
  const [rtName, setRtName] = useState("");
  const [rtDescription, setRtDescription] = useState("");
  const [rtColor, setRtColor] = useState("#6366f1");
  const [addingRt, setAddingRt] = useState(false);
  const [rtLoading, setRtLoading] = useState(false);

  // Floor Form
  const [floorNumber, setFloorNumber] = useState("");
  const [floorName, setFloorName] = useState("");
  const [addingFloor, setAddingFloor] = useState(false);
  const [floorLoading, setFloorLoading] = useState(false);

  // Room Form
  const [roomNumber, setRoomNumber] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedRoomType, setSelectedRoomType] = useState("");
  const [addingRoom, setAddingRoom] = useState(false);
  const [roomLoading, setRoomLoading] = useState(false);
  const [downloadingQRs, setDownloadingQRs] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [localRoomTypes, setLocalRoomTypes] = useState<RoomType[]>(roomTypes);
  const [localFloors, setLocalFloors] = useState<Floor[]>(floors);
  const [localRooms, setLocalRooms] = useState(rooms);

  const supabase = createClient();

  const handleAddRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    setRtLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("room_types")
        .insert({ hotel_id: hotelId, name: rtName, description: rtDescription, color: rtColor })
        .select()
        .single();
      if (error) throw error;
      setLocalRoomTypes((prev) => [...prev, data]);
      setRtName(""); setRtDescription(""); setAddingRt(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setRtLoading(false);
    }
  };

  const handleAddFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFloorLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("floors")
        .insert({ hotel_id: hotelId, floor_number: parseInt(floorNumber), name: floorName || null })
        .select()
        .single();
      if (error) throw error;
      setLocalFloors((prev) => [...prev, data].sort((a, b) => a.floor_number - b.floor_number));
      setFloorNumber(""); setFloorName(""); setAddingFloor(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setFloorLoading(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomType) { setError("Select a room type"); return; }
    setRoomLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("rooms")
        .insert({
          hotel_id: hotelId,
          room_number: roomNumber,
          room_type_id: selectedRoomType,
          floor_id: selectedFloor || null,
        })
        .select("*, room_types(name, color), floors(floor_number, name)")
        .single();
      if (error) throw error;
      setLocalRooms((prev) => [...prev, data]);
      setRoomNumber(""); setSelectedFloor(""); setSelectedRoomType(""); setAddingRoom(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setRoomLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Delete this room? Its QR code will be invalidated.")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", roomId);
    if (!error) setLocalRooms((prev) => prev.filter((r) => r.id !== roomId));
  };

  const generateQrUrl = (token: string) =>
    `${window.location.origin}/guest/${token}`;

  const handleDownloadAllQRs = async () => {
    if (localRooms.length === 0) {
      alert("No rooms available to generate QRs.");
      return;
    }
    setDownloadingQRs(true);
    try {
      // Fetch hotel name for the header
      let hotelName = "Grand Hotel";
      try {
        const { data: h } = await supabase.from("hotels").select("name").eq("id", hotelId).single();
        if (h?.name) hotelName = h.name;
      } catch (_) {}

      const qrPages = localRooms.map((room, idx) => {
        const url = generateQrUrl(room.qr_token);
        const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&color=2d0a0a&bgcolor=fdf8ee&data=${encodeURIComponent(url)}`;
        const isLast = idx === localRooms.length - 1;
        const roomTypeName = (room.room_types as any)?.name ?? "";
        const floorInfo = (room.floors as any)
          ? `Floor ${(room.floors as any).floor_number}${(room.floors as any).name ? " · " + (room.floors as any).name : ""}`
          : "";

        return `
          <div class="page" style="${isLast ? "" : "page-break-after: always;"}">
            <div class="outer-frame">
              <div class="corner tl">✦</div>
              <div class="corner tr">✦</div>
              <div class="corner bl">✦</div>
              <div class="corner br">✦</div>
              <div class="rule-row"><div class="rule-line"></div><div class="rule-diamond">◆</div><div class="rule-line"></div></div>
              <div class="crown">♛</div>
              <div class="hotel-name">${hotelName.toUpperCase()}</div>
              <div class="divider">— ✦ —</div>
              <div class="room-label">ROOM</div>
              <div class="room-number">${room.room_number}</div>
              ${roomTypeName || floorInfo ? `<div class="room-type">${[roomTypeName, floorInfo].filter(Boolean).join("  ·  ")}</div>` : ""}
              <div class="rule-row" style="margin: 18px 0;"><div class="rule-line"></div><div class="rule-diamond">◆</div><div class="rule-line"></div></div>
              <div class="qr-wrap"><img src="${qrImgSrc}" class="qr-img" /></div>
              <div class="scan-text">Scan to access in-room services</div>
              <div class="scan-sub">Point your phone camera at the code above</div>
              <div class="rule-row" style="margin-top: 22px;"><div class="rule-line"></div><div class="rule-diamond">◆</div><div class="rule-line"></div></div>
              <div class="footer-text">~ Exclusively for our esteemed guests ~</div>
            </div>
          </div>
        `;
      }).join("");

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #1a0a02; font-family: 'Crimson Text', 'Georgia', serif; }
    .page {
      width: 210mm; min-height: 297mm;
      display: flex; align-items: center; justify-content: center; padding: 18mm;
      background: radial-gradient(ellipse at top, #2d1100 0%, #0d0400 60%),
        repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(180,130,40,0.03) 40px, rgba(180,130,40,0.03) 41px);
    }
    .outer-frame {
      width: 100%; min-height: 245mm;
      border: 3px solid #b8860b;
      box-shadow: 0 0 0 1px #6b3a10, inset 0 0 0 2px #6b3a10, inset 0 0 0 4px rgba(184,134,11,0.3), 0 0 60px rgba(184,134,11,0.15);
      background: linear-gradient(160deg, #1c0c02 0%, #2a1005 40%, #1c0c02 100%);
      display: flex; flex-direction: column; align-items: center;
      padding: 32px 40px 28px; position: relative;
    }
    .corner { position: absolute; font-size: 18px; color: #b8860b; line-height: 1; }
    .tl { top: 10px; left: 14px; } .tr { top: 10px; right: 14px; }
    .bl { bottom: 10px; left: 14px; } .br { bottom: 10px; right: 14px; }
    .rule-row { display: flex; align-items: center; width: 100%; gap: 10px; margin: 4px 0; }
    .rule-line { flex: 1; height: 1px; background: linear-gradient(to right, transparent, #b8860b, transparent); }
    .rule-diamond { color: #b8860b; font-size: 10px; }
    .crown { font-size: 54px; margin: 8px 0 4px; color: #d4a017; filter: drop-shadow(0 0 12px rgba(184,134,11,0.6)); }
    .hotel-name { font-family: 'Cinzel','Georgia',serif; font-size: 18px; font-weight: 900; color: #d4a017; letter-spacing: 0.35em; text-align: center; text-shadow: 0 0 20px rgba(212,160,23,0.4); margin-bottom: 4px; }
    .divider { color: #8b6914; font-size: 12px; letter-spacing: 0.2em; margin: 6px 0 10px; }
    .room-label { font-family: 'Cinzel','Georgia',serif; font-size: 11px; letter-spacing: 0.5em; color: #8b6914; margin-bottom: 4px; }
    .room-number { font-family: 'Cinzel','Georgia',serif; font-size: 64px; font-weight: 900; color: #f5deb3; line-height: 1; letter-spacing: 0.05em; text-shadow: 0 0 30px rgba(212,160,23,0.5), 2px 2px 0 rgba(0,0,0,0.5); margin-bottom: 6px; }
    .room-type { font-family: 'Crimson Text','Georgia',serif; font-size: 13px; font-style: italic; color: #b8860b; letter-spacing: 0.1em; margin-bottom: 2px; }
    .qr-wrap { background: #fdf8ee; padding: 14px; border: 2px solid #b8860b; box-shadow: 0 0 0 1px #6b3a10, 0 0 25px rgba(184,134,11,0.3); margin: 4px 0 12px; }
    .qr-img { width: 280px; height: 280px; display: block; }
    .scan-text { font-family: 'Cinzel','Georgia',serif; font-size: 12px; font-weight: 600; color: #d4a017; letter-spacing: 0.2em; text-align: center; }
    .scan-sub { font-family: 'Crimson Text','Georgia',serif; font-size: 12px; font-style: italic; color: #7a5c20; text-align: center; margin-top: 3px; }
    .footer-text { font-family: 'Crimson Text','Georgia',serif; font-size: 12px; font-style: italic; color: #7a5c20; text-align: center; letter-spacing: 0.05em; margin-top: 8px; }
  </style>
</head>
<body>${qrPages}</body>
</html>`;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 1200);
      } else {
        alert("Popup blocked. Please allow popups for this site to print QRs.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF. Check console for details.");
    } finally {
      setDownloadingQRs(false);
    }
  };


  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: "rooms", label: `Rooms (${localRooms.length})`, icon: BedDouble },
    { id: "room-types", label: `Room Types (${localRoomTypes.length})`, icon: Tag },
    { id: "floors", label: `Floors (${localFloors.length})`, icon: Layers },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 glass-card p-1.5 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* ── ROOM TYPES TAB ── */}
      {activeTab === "room-types" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Room Types</h2>
            <Button size="sm" onClick={() => setAddingRt(!addingRt)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Type
            </Button>
          </div>

          {addingRt && (
            <div className="glass-card p-5">
              <form onSubmit={handleAddRoomType} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Type Name *</Label>
                    <Input placeholder="e.g. Deluxe" value={rtName} onChange={(e) => setRtName(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label>Accent Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={rtColor} onChange={(e) => setRtColor(e.target.value)} className="w-14 h-10 p-1 cursor-pointer" />
                      <Input value={rtColor} onChange={(e) => setRtColor(e.target.value)} className="font-mono" />
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input placeholder="e.g. Full amenities with pool access" value={rtDescription} onChange={(e) => setRtDescription(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="ghost" onClick={() => setAddingRt(false)}>Cancel</Button>
                  <Button type="submit" disabled={rtLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {rtLoading ? "Saving..." : "Save Room Type"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {localRoomTypes.map((rt) => (
              <div key={rt.id} className="glass-card p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: rt.color ?? "#6366f1" }}
                  >
                    {rt.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{rt.name}</p>
                    {rt.description && (
                      <p className="text-xs text-muted-foreground">{rt.description}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {localRooms.filter((r) => r.room_type_id === rt.id).length} rooms
                  </span>
                </div>
              </div>
            ))}
            {localRoomTypes.length === 0 && (
              <div className="col-span-3 text-center py-12 text-muted-foreground">
                <Tag className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>No room types yet. Add one to get started.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FLOORS TAB ── */}
      {activeTab === "floors" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Floors</h2>
            <Button size="sm" onClick={() => setAddingFloor(!addingFloor)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Floor
            </Button>
          </div>

          {addingFloor && (
            <div className="glass-card p-5">
              <form onSubmit={handleAddFloor} className="flex flex-wrap gap-4 items-end">
                <div className="grid gap-2">
                  <Label>Floor Number *</Label>
                  <Input type="number" placeholder="1" min="0" value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} required className="w-28" />
                </div>
                <div className="grid gap-2">
                  <Label>Floor Name</Label>
                  <Input placeholder="e.g. Ground Floor" value={floorName} onChange={(e) => setFloorName(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setAddingFloor(false)}>Cancel</Button>
                  <Button type="submit" disabled={floorLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {floorLoading ? "Saving..." : "Add Floor"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <table className="w-full hotel-table">
              <thead>
                <tr className="border-b border-border/50">
                  <th>Floor #</th>
                  <th>Name</th>
                  <th>Rooms</th>
                </tr>
              </thead>
              <tbody>
                {localFloors.map((floor) => (
                  <tr key={floor.id}>
                    <td className="font-bold text-foreground">{floor.floor_number}</td>
                    <td>{floor.name ?? <span className="text-muted-foreground italic">—</span>}</td>
                    <td>{localRooms.filter((r) => r.floor_id === floor.id).length}</td>
                  </tr>
                ))}
                {localFloors.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-muted-foreground">
                      No floors added yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ROOMS TAB ── */}
      {activeTab === "rooms" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Rooms</h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadAllQRs}
                disabled={downloadingQRs || localRooms.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {downloadingQRs ? "Generating..." : "Download QRs"}
              </Button>
              <Button
                size="sm"
                onClick={() => setAddingRoom(!addingRoom)}
                disabled={localRoomTypes.length === 0}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Add Room
              </Button>
            </div>
          </div>

          {localRoomTypes.length === 0 && (
            <div className="glass-card p-4 border-amber-500/30 bg-amber-500/5">
              <p className="text-sm text-amber-400">
                ⚠️ You need at least one Room Type before adding rooms.
                Switch to the "Room Types" tab first.
              </p>
            </div>
          )}

          {addingRoom && (
            <div className="glass-card p-5">
              <form onSubmit={handleAddRoom} className="flex flex-wrap gap-4 items-end">
                <div className="grid gap-2">
                  <Label>Room Number *</Label>
                  <Input placeholder="101" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} required className="w-28" />
                </div>
                <div className="grid gap-2">
                  <Label>Room Type *</Label>
                  <select
                    value={selectedRoomType}
                    onChange={(e) => setSelectedRoomType(e.target.value)}
                    required
                    className="h-10 rounded-md border border-border bg-input px-3 text-sm text-foreground min-w-40"
                  >
                    <option value="">Select...</option>
                    {localRoomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>{rt.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Floor</Label>
                  <select
                    value={selectedFloor}
                    onChange={(e) => setSelectedFloor(e.target.value)}
                    className="h-10 rounded-md border border-border bg-input px-3 text-sm text-foreground min-w-40"
                  >
                    <option value="">No floor</option>
                    {localFloors.map((f) => (
                      <option key={f.id} value={f.id}>
                        Floor {f.floor_number}{f.name ? ` — ${f.name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setAddingRoom(false)}>Cancel</Button>
                  <Button type="submit" disabled={roomLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {roomLoading ? "Adding..." : "Add Room"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <table className="w-full hotel-table">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th>Room</th>
                  <th>Type</th>
                  <th>Floor</th>
                  <th>QR Code</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {localRooms.map((room) => (
                  <tr key={room.id}>
                    <td>
                      <span className="font-bold text-foreground text-base">
                        {room.room_number}
                      </span>
                    </td>
                    <td>
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{
                          backgroundColor: `${(room.room_types as any)?.color ?? "#6366f1"}20`,
                          color: (room.room_types as any)?.color ?? "#6366f1",
                          border: `1px solid ${(room.room_types as any)?.color ?? "#6366f1"}40`,
                        }}
                      >
                        {(room.room_types as any)?.name ?? "—"}
                      </span>
                    </td>
                    <td className="text-muted-foreground text-sm">
                      {room.floors
                        ? `Floor ${(room.floors as any).floor_number}`
                        : "—"}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-xs text-muted-foreground hover:text-primary"
                        onClick={() => {
                          const url = generateQrUrl(room.qr_token);
                          navigator.clipboard.writeText(url);
                          alert("QR Link copied: " + url);
                        }}
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        Copy Link
                      </Button>
                    </td>
                    <td>
                      {room.is_active ? (
                        <span className="badge-completed">Active</span>
                      ) : (
                        <span className="badge-cancelled">Inactive</span>
                      )}
                    </td>
                    <td>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteRoom(room.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {localRooms.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <BedDouble className="h-8 w-8 mx-auto mb-3 opacity-30" />
                      <p>No rooms added yet</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
