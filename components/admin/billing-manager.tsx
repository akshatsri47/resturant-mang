"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Plus, Receipt, CheckCircle, XCircle, FileText, Trash2 } from "lucide-react";
import {
  formatCurrency,
  calculateSubtotal,
  calculateTax,
  calculateTotal,
  decimalToCents,
} from "@/lib/utils/currency";
import type { BillTab, BillLineItem } from "@/lib/types";

interface BillingManagerProps {
  hotelId: string;
  tabs: (BillTab & { rooms?: { room_number: string }; bill_line_items: BillLineItem[] })[];
  taxRate: number;
  userRole: string;
}

export function BillingManager({ hotelId, tabs, taxRate, userRole }: BillingManagerProps) {
  const [localTabs, setLocalTabs] = useState(tabs);
  const [selectedTab, setSelectedTab] = useState<string | null>(tabs[0]?.id ?? null);
  const [activeFilter, setActiveFilter] = useState<"open" | "settled" | "voided">("open");
  const [addingItem, setAddingItem] = useState(false);
  const [itemDesc, setItemDesc] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("");
  const [addingTab, setAddingTab] = useState(false);
  const [tabRoomId, setTabRoomId] = useState("");
  const [tabGuestName, setTabGuestName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const canApplyDiscount = ["admin", "super_admin"].includes(userRole);
  const canVoidItem = ["admin", "super_admin"].includes(userRole);
  const canCloseTab = ["admin", "super_admin", "reception"].includes(userRole);

  const filteredTabs = localTabs.filter((t) => t.status === activeFilter);
  const currentTab = localTabs.find((t) => t.id === selectedTab);
  const lineItems = currentTab?.bill_line_items ?? [];
  const activeLineItems = lineItems.filter((li) => !li.is_voided);

  const subtotal = calculateSubtotal(lineItems);
  const taxAmount = calculateTax(subtotal, currentTab?.tax_rate ?? taxRate);
  const discount = currentTab?.discount_cents ?? 0;
  const total = calculateTotal(subtotal, taxAmount, discount);

  const handleAddLineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTab) return;
    setIsLoading(true);
    setError(null);
    try {
      const priceCents = decimalToCents(parseFloat(itemPrice));
      const qty = parseInt(itemQty);
      const { data, error } = await supabase
        .from("bill_line_items")
        .insert({
          tab_id: selectedTab,
          hotel_id: hotelId,
          description: itemDesc,
          quantity: qty,
          unit_price_cents: priceCents,
        })
        .select()
        .single();
      if (error) throw error;
      setLocalTabs((p) =>
        p.map((t) =>
          t.id === selectedTab
            ? { ...t, bill_line_items: [...t.bill_line_items, data] }
            : t
        )
      );
      setItemDesc(""); setItemQty("1"); setItemPrice(""); setAddingItem(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoidItem = async (lineItemId: string) => {
    const reason = prompt("Reason for voiding?");
    if (!reason) return;
    await supabase.from("bill_line_items").update({ is_voided: true, void_reason: reason }).eq("id", lineItemId);
    setLocalTabs((p) =>
      p.map((t) => ({
        ...t,
        bill_line_items: t.bill_line_items.map((li) =>
          li.id === lineItemId ? { ...li, is_voided: true, void_reason: reason } : li
        ),
      }))
    );
  };

  const handleCloseTab = async (tabId: string) => {
    if (!confirm("Close this tab and generate invoice?")) return;
    await supabase
      .from("bill_tabs")
      .update({ status: "settled", check_out_date: new Date().toISOString() })
      .eq("id", tabId);
    setLocalTabs((p) => p.map((t) => (t.id === tabId ? { ...t, status: "settled" } : t)));
    setSelectedTab(null);
  };

  const handlePrint = () => {
    if (!currentTab) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Invoice - Room ${currentTab.rooms?.room_number}</title>
      <style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;} td,th{padding:8px;border-bottom:1px solid #eee;text-align:left;} .right{text-align:right;} .total{font-weight:bold;font-size:1.2em;}</style>
      </head><body>
      <h1>INVOICE</h1>
      <p><strong>Room:</strong> ${currentTab.rooms?.room_number ?? ""}</p>
      <p><strong>Guest:</strong> ${currentTab.guest_name ?? "Guest"}</p>
      <p><strong>Check-in:</strong> ${new Date(currentTab.check_in_date).toLocaleDateString()}</p>
      <table>
        <thead><tr><th>Description</th><th>Qty</th><th class="right">Unit Price</th><th class="right">Total</th></tr></thead>
        <tbody>
        ${lineItems.filter((li) => !li.is_voided).map((li) => `
          <tr><td>${li.description}</td><td>${li.quantity}</td>
          <td class="right">${formatCurrency(li.unit_price_cents)}</td>
          <td class="right">${formatCurrency(li.unit_price_cents * li.quantity)}</td></tr>
        `).join("")}
        </tbody>
      </table>
      <br/>
      <p class="right">Subtotal: ${formatCurrency(subtotal)}</p>
      <p class="right">Tax (${taxRate}%): ${formatCurrency(taxAmount)}</p>
      ${discount > 0 ? `<p class="right">Discount: -${formatCurrency(discount)}</p>` : ""}
      <p class="right total">TOTAL: ${formatCurrency(total)}</p>
      </body></html>
    `);
    printWindow.print();
  };

  return (
    <div className="flex gap-5 h-full min-h-[60vh]">
      {/* Left: Tab list */}
      <div className="w-64 shrink-0 space-y-3">
        <div className="flex gap-1 glass-card p-1">
          {(["open", "settled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                activeFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filteredTabs.map((tab) => {
            const tabSubtotal = calculateSubtotal(tab.bill_line_items);
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedTab === tab.id
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/50 hover:border-border glass-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">
                    Room {tab.rooms?.room_number ?? "?"}
                  </span>
                  <span className={`text-xs ${tab.status === "open" ? "text-amber-400" : "text-emerald-400"}`}>
                    {tab.status}
                  </span>
                </div>
                {tab.guest_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">{tab.guest_name}</p>
                )}
                <p className="text-sm font-semibold text-primary mt-1.5">
                  {formatCurrency(tabSubtotal)} ({tab.bill_line_items.filter((li) => !li.is_voided).length} items)
                </p>
              </button>
            );
          })}

          {filteredTabs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-6 w-6 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No {activeFilter} tabs</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Tab detail */}
      <div className="flex-1 space-y-4">
        {currentTab ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Room {currentTab.rooms?.room_number ?? "?"}
                  {currentTab.guest_name && (
                    <span className="text-base font-normal text-muted-foreground ml-2">
                      · {currentTab.guest_name}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Check-in: {new Date(currentTab.check_in_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2 border-border/50" onClick={handlePrint}>
                  <FileText className="h-4 w-4" />
                  Invoice
                </Button>
                {canCloseTab && currentTab.status === "open" && (
                  <Button
                    size="sm"
                    className="gap-2 bg-emerald-600 hover:bg-emerald-600/90 text-white"
                    onClick={() => handleCloseTab(currentTab.id)}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Close & Checkout
                  </Button>
                )}
              </div>
            </div>

            {/* Add manual charge */}
            {currentTab.status === "open" && canCloseTab && (
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => setAddingItem(!addingItem)}
                >
                  <Plus className="h-4 w-4" /> Add Charge
                </Button>

                {addingItem && (
                  <div className="glass-card p-4 mt-3">
                    <form onSubmit={handleAddLineItem} className="flex flex-wrap gap-3 items-end">
                      <div className="grid gap-1.5 flex-1 min-w-40">
                        <Label className="text-xs">Description *</Label>
                        <Input placeholder="Mini-bar, newspaper..." value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} required className="h-9" />
                      </div>
                      <div className="grid gap-1.5 w-20">
                        <Label className="text-xs">Qty</Label>
                        <Input type="number" min="1" value={itemQty} onChange={(e) => setItemQty(e.target.value)} className="h-9" />
                      </div>
                      <div className="grid gap-1.5 w-32">
                        <Label className="text-xs">Price (₹)</Label>
                        <Input type="number" min="0" step="0.01" placeholder="0.00" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} required className="h-9" />
                      </div>
                      <Button type="submit" disabled={isLoading} size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90">
                        Add
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => setAddingItem(false)}>Cancel</Button>
                    </form>
                    {error && <p className="text-destructive text-xs mt-2">{error}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Line Items Table */}
            <div className="glass-card overflow-hidden">
              <table className="w-full hotel-table">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th>Description</th>
                    <th>Qty</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Total</th>
                    {canVoidItem && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li) => (
                    <tr key={li.id} className={li.is_voided ? "opacity-40 line-through" : ""}>
                      <td className="text-sm">{li.description}</td>
                      <td className="text-sm">{li.quantity}</td>
                      <td className="text-right text-sm">{formatCurrency(li.unit_price_cents)}</td>
                      <td className="text-right font-medium text-sm">
                        {li.is_voided ? (
                          <span className="text-destructive text-xs">VOIDED</span>
                        ) : (
                          formatCurrency(li.unit_price_cents * li.quantity)
                        )}
                      </td>
                      {canVoidItem && (
                        <td>
                          {!li.is_voided && currentTab.status === "open" && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => handleVoidItem(li.id)}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {lineItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                        No charges yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="glass-card p-5 ml-auto max-w-xs space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({currentTab.tax_rate ?? taxRate}%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span>Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t border-border/50 pt-3">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Receipt className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>Select a bill tab to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
