"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Clock, Percent, Save } from "lucide-react";
import type { Hotel, SlaRule } from "@/lib/types";

interface HotelSettingsProps {
  hotel: Hotel | null;
  slaRules: SlaRule[];
}

export function HotelSettings({ hotel, slaRules }: HotelSettingsProps) {
  const [hotelName, setHotelName] = useState(hotel?.name ?? "");
  const [hotelAddress, setHotelAddress] = useState(hotel?.address ?? "");
  const [taxRate, setTaxRate] = useState(String(hotel?.tax_rate ?? 10));
  const [maxRequests, setMaxRequests] = useState(String(hotel?.max_requests_per_hour ?? 20));
  const [localSlaRules, setLocalSlaRules] = useState(slaRules);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleSaveHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel) return;
    setIsSaving(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("hotels")
        .update({
          name: hotelName,
          address: hotelAddress,
          tax_rate: parseFloat(taxRate),
          max_requests_per_hour: parseInt(maxRequests),
        })
        .eq("id", hotel.id);
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSla = async (ruleId: string, updates: Partial<SlaRule>) => {
    await supabase.from("sla_rules").update(updates).eq("id", ruleId);
    setLocalSlaRules((p) => p.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)));
  };

  const handleCreateDefaultSla = async () => {
    if (!hotel) return;
    const defaults = [
      { hotel_id: hotel.id, request_type: "order", unassigned_threshold_minutes: 5, in_progress_threshold_minutes: 20 },
      { hotel_id: hotel.id, request_type: "service", unassigned_threshold_minutes: 10, in_progress_threshold_minutes: 40 },
      { hotel_id: hotel.id, request_type: "complaint", unassigned_threshold_minutes: 5, in_progress_threshold_minutes: 30 },
    ];
    const { data } = await supabase.from("sla_rules").insert(defaults).select();
    if (data) setLocalSlaRules((p) => [...p, ...data]);
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Hotel Info */}
      <div className="glass-card p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-5">
          <Settings className="h-4 w-4 text-primary" />
          Hotel Information
        </h3>
        <form onSubmit={handleSaveHotel} className="space-y-4">
          <div className="grid gap-2">
            <Label>Hotel Name *</Label>
            <Input value={hotelName} onChange={(e) => setHotelName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Address</Label>
            <Input value={hotelAddress} onChange={(e) => setHotelAddress(e.target.value)} placeholder="123 Hotel Street, City" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5" /> Tax Rate (%)
              </Label>
              <Input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Max Guest Requests / Hour</Label>
              <Input type="number" min="1" value={maxRequests} onChange={(e) => setMaxRequests(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
          {saved && <p className="text-emerald-400 text-sm">✓ Settings saved</p>}

          <Button type="submit" disabled={isSaving} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </div>

      {/* SLA Rules */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            SLA Rules
          </h3>
          {localSlaRules.length === 0 && (
            <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={handleCreateDefaultSla}>
              Create Defaults
            </Button>
          )}
        </div>

        {localSlaRules.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-6 w-6 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No SLA rules configured</p>
          </div>
        ) : (
          <div className="space-y-4">
            {localSlaRules.map((rule) => (
              <div key={rule.id} className="p-4 rounded-xl border border-border/50 bg-muted/20">
                <p className="font-semibold capitalize text-sm mb-3">
                  {rule.request_type ?? "All Types"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Unassigned alert (minutes)</Label>
                    <Input
                      type="number"
                      min="1"
                      className="h-8 text-sm"
                      defaultValue={rule.unassigned_threshold_minutes}
                      onBlur={(e) => handleSaveSla(rule.id, { unassigned_threshold_minutes: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">In-progress alert (minutes)</Label>
                    <Input
                      type="number"
                      min="1"
                      className="h-8 text-sm"
                      defaultValue={rule.in_progress_threshold_minutes}
                      onBlur={(e) => handleSaveSla(rule.id, { in_progress_threshold_minutes: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
