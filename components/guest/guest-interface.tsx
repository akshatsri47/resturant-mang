"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BedDouble,
  ShoppingCart,
  Plus,
  Minus,
  Send,
  CheckCircle,
  X,
  ChevronRight,
  AlertCircle,
  Wrench,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import type { MenuCategory, MenuItem } from "@/lib/types";

interface GuestInterfaceProps {
  room: {
    id: string;
    hotel_id: string;
    room_number: string;
    qr_token: string;
  };
  hotelName: string;
  roomTypeName: string;
  categories: MenuCategory[];
  menuItems: (MenuItem & { menu_categories?: { name: string; icon: string } })[];
}

type View = "home" | "order" | "service" | "complaint";
type CartItem = { menuItem: MenuItem; quantity: number };

const SERVICE_TYPES = [
  { id: "housekeeping", label: "Housekeeping", icon: "🧹", desc: "Room cleaning, linen change, etc." },
  { id: "laundry", label: "Laundry", icon: "👕", desc: "Clothing pickup & delivery" },
  { id: "spa", label: "Spa / Wellness", icon: "💆", desc: "Massage, treatments" },
  { id: "maintenance", label: "Maintenance", icon: "🔧", desc: "AC, TV, plumbing issues" },
  { id: "extra_amenities", label: "Extra Amenities", icon: "🛁", desc: "Towels, toiletries, pillows" },
  { id: "other", label: "Other", icon: "📞", desc: "Any other request" },
];

export function GuestInterface({
  room,
  hotelName,
  roomTypeName,
  categories,
  menuItems,
}: GuestInterfaceProps) {
  const [view, setView] = useState<View>("home");
  const [activeCategory, setActiveCategory] = useState<string | null>(categories[0]?.id ?? null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [complaintDesc, setComplaintDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ type: string; id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) => c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter((c) => c.menuItem.id !== itemId);
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.menuItem.price_cents * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const items = cart.map((c) => ({
        menu_item_id: c.menuItem.id,
        name: c.menuItem.name,
        quantity: c.quantity,
        unit_price_cents: c.menuItem.price_cents,
        total_price_cents: c.menuItem.price_cents * c.quantity,
      }));

      const { data, error } = await supabase
        .from("requests")
        .insert({
          hotel_id: room.hotel_id,
          room_id: room.id,
          room_number: room.room_number,
          room_type: roomTypeName,
          guest_name: guestName || null,
          request_type: "order",
          category: "food",
          items,
          description: `Order of ${cartCount} item${cartCount !== 1 ? "s" : ""}`,
          status: "pending",
          priority: "medium",
        })
        .select()
        .single();

      if (error) throw error;
      setSubmitted({ type: "order", id: data.id });
      setCart([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitService = async () => {
    if (!selectedService) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("requests")
        .insert({
          hotel_id: room.hotel_id,
          room_id: room.id,
          room_number: room.room_number,
          room_type: roomTypeName,
          guest_name: guestName || null,
          request_type: "service",
          category: selectedService,
          description: serviceDesc || SERVICE_TYPES.find((s) => s.id === selectedService)?.desc,
          status: "pending",
          priority: "medium",
        })
        .select()
        .single();

      if (error) throw error;
      setSubmitted({ type: "service", id: data.id });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitComplaint = async () => {
    if (!complaintDesc.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("requests")
        .insert({
          hotel_id: room.hotel_id,
          room_id: room.id,
          room_number: room.room_number,
          room_type: roomTypeName,
          guest_name: guestName || null,
          request_type: "complaint",
          category: "general",
          description: complaintDesc,
          status: "pending",
          priority: "high",
        })
        .select()
        .single();

      if (error) throw error;
      setSubmitted({ type: "complaint", id: data.id });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Submitted State ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Request Received!</h2>
            <p className="text-muted-foreground mt-2">
              {submitted.type === "order"
                ? "Your order has been placed. Our team will deliver it shortly."
                : submitted.type === "service"
                ? "Your service request has been logged. Staff will attend to it soon."
                : "Your complaint has been raised with high priority."}
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Reference: <span className="font-mono text-primary">{submitted.id.slice(0, 8).toUpperCase()}</span>
            </p>
          </div>
          <Button
            onClick={() => { setSubmitted(null); setView("home"); }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full"
          >
            Back to Room Service
          </Button>
        </div>
      </div>
    );
  }

  // ── Home View ──
  if (view === "home") {
    return (
      <div className="min-h-screen bg-background">
        {/* Hotel header */}
        <div className="px-4 pt-8 pb-6 text-center border-b border-border/50"
          style={{ background: "linear-gradient(135deg, hsl(222,47%,10%) 0%, hsl(222,47%,8%) 100%)" }}
        >
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{hotelName}</p>
          <div className="flex items-center justify-center gap-2 mb-1">
            <BedDouble className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold text-primary">Room {room.room_number}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{roomTypeName}</p>
        </div>

        {/* Guest name input */}
        <div className="px-4 py-5 border-b border-border/30">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
            Your Name (optional)
          </Label>
          <Input
            placeholder="Enter your name..."
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="bg-input/50"
          />
        </div>

        {/* Main options */}
        <div className="px-4 py-5 space-y-3">
          <button
            onClick={() => setView("order")}
            className="w-full flex items-center gap-4 p-5 glass-card hover:border-primary/30 hover:bg-primary/5 transition-all group text-left"
          >
            <span className="text-3xl">🍽️</span>
            <div className="flex-1">
              <p className="font-bold text-foreground text-lg">Order Food</p>
              <p className="text-sm text-muted-foreground">Browse menu and place an order</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>

          <button
            onClick={() => setView("service")}
            className="w-full flex items-center gap-4 p-5 glass-card hover:border-primary/30 hover:bg-primary/5 transition-all group text-left"
          >
            <span className="text-3xl">🛎️</span>
            <div className="flex-1">
              <p className="font-bold text-foreground text-lg">Request Service</p>
              <p className="text-sm text-muted-foreground">Housekeeping, laundry, amenities</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>

          <button
            onClick={() => setView("complaint")}
            className="w-full flex items-center gap-4 p-5 glass-card hover:border-red-400/30 hover:bg-red-400/5 transition-all group text-left"
          >
            <span className="text-3xl">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-foreground text-lg">Raise Complaint</p>
              <p className="text-sm text-muted-foreground">Report an issue or concern</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-red-400 transition-colors" />
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-8">
          Powered by HotelOS
        </p>
      </div>
    );
  }

  // ── Order View ──
  if (view === "order") {
    const categoryItems = menuItems.filter((i) => i.category_id === activeCategory);
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-card/90 backdrop-blur-sm border-b border-border/50">
          <button onClick={() => setView("home")} className="p-2 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
          <h2 className="font-bold text-lg flex-1">Food & Beverages</h2>
          {cartCount > 0 && (
            <button
              onClick={() => setShowCart(!showCart)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-semibold"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartCount} · {formatCurrency(cartTotal)}
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-border/30">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Cart summary (collapsible) */}
        {showCart && cart.length > 0 && (
          <div className="mx-4 mt-4 glass-card p-4 border-primary/30">
            <h3 className="font-semibold text-sm mb-3">Your Order</h3>
            <div className="space-y-2">
              {cart.map((c) => (
                <div key={c.menuItem.id} className="flex items-center gap-3">
                  <span className="text-sm flex-1">{c.menuItem.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeFromCart(c.menuItem.id)}
                      className="h-7 w-7 rounded-full border border-border flex items-center justify-center"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-sm">{c.quantity}</span>
                    <button
                      onClick={() => addToCart(c.menuItem)}
                      className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-primary font-semibold text-sm shrink-0">
                    {formatCurrency(c.menuItem.price_cents * c.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border/50 mt-3 pt-3 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-primary">{formatCurrency(cartTotal)}</span>
            </div>
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
            <Button
              onClick={submitOrder}
              disabled={isSubmitting}
              className="w-full mt-3 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Placing order..." : "Place Order"}
            </Button>
          </div>
        )}

        {/* Menu items grid */}
        <div className="flex-1 px-4 py-4 space-y-3">
          {categoryItems.map((item) => {
            const cartItem = cart.find((c) => c.menuItem.id === item.id);
            return (
              <div key={item.id} className="glass-card p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                  {item.is_chargeable && item.price_cents > 0 && (
                    <p className="text-primary font-bold text-sm mt-1">
                      {formatCurrency(item.price_cents)}
                    </p>
                  )}
                </div>

                {cartItem ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center font-bold">{cartItem.quantity}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(item)}
                    className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          {categoryItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No items available in this category</p>
            </div>
          )}
        </div>

        {/* Sticky bottom order button */}
        {cartCount > 0 && !showCart && (
          <div className="sticky bottom-0 p-4 bg-card/90 backdrop-blur-sm border-t border-border/50">
            <Button
              onClick={() => setShowCart(true)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2"
              size="lg"
            >
              <ShoppingCart className="h-5 w-5" />
              View Cart · {cartCount} item{cartCount !== 1 ? "s" : ""} · {formatCurrency(cartTotal)}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── Service View ──
  if (view === "service") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-card/90 backdrop-blur-sm border-b border-border/50">
          <button onClick={() => setView("home")} className="p-2 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
          <h2 className="font-bold text-lg">Request Service</h2>
        </div>

        <div className="flex-1 px-4 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {SERVICE_TYPES.map((svc) => (
              <button
                key={svc.id}
                onClick={() => setSelectedService(svc.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedService === svc.id
                    ? "border-primary/60 bg-primary/10"
                    : "border-border/50 hover:border-border"
                }`}
              >
                <span className="text-2xl">{svc.icon}</span>
                <p className="font-semibold text-sm mt-2">{svc.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{svc.desc}</p>
              </button>
            ))}
          </div>

          {selectedService && (
            <div className="grid gap-2">
              <Label>Additional details (optional)</Label>
              <textarea
                placeholder="Any specific instructions..."
                value={serviceDesc}
                onChange={(e) => setServiceDesc(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground resize-none"
              />
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button
            onClick={submitService}
            disabled={!selectedService || isSubmitting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            size="lg"
          >
            <Send className="h-5 w-5" />
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Complaint View ──
  if (view === "complaint") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-card/90 backdrop-blur-sm border-b border-border/50">
          <button onClick={() => setView("home")} className="p-2 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
          <h2 className="font-bold text-lg">Raise a Complaint</h2>
        </div>

        <div className="flex-1 px-4 py-5 space-y-4">
          <div className="glass-card p-4 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-200">
                Your complaint will be treated as high priority and escalated to our supervisor immediately.
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Describe your issue *</Label>
            <textarea
              placeholder="e.g. Air conditioning is not working, TV remote is missing..."
              value={complaintDesc}
              onChange={(e) => setComplaintDesc(e.target.value)}
              rows={5}
              required
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground resize-none"
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button
            onClick={submitComplaint}
            disabled={!complaintDesc.trim() || isSubmitting}
            className="w-full bg-red-600 hover:bg-red-600/90 text-white gap-2"
            size="lg"
          >
            <Send className="h-5 w-5" />
            {isSubmitting ? "Submitting..." : "Submit Complaint"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
