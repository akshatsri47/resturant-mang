"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UtensilsCrossed,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Tag,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatCurrency, decimalToCents, centsToDecimal } from "@/lib/utils/currency";
import type { MenuCategory, MenuItem, RoomType } from "@/lib/types";

interface MenuManagerProps {
  hotelId: string;
  categories: MenuCategory[];
  items: (MenuItem & { menu_categories?: { name: string } })[];
  roomTypes: RoomType[];
}

export function MenuManager({ hotelId, categories, items, roomTypes }: MenuManagerProps) {
  const [localCategories, setLocalCategories] = useState(categories);
  const [localItems, setLocalItems] = useState(items);
  const [activeCategory, setActiveCategory] = useState<string | null>(
    categories[0]?.id ?? null
  );
  const [error, setError] = useState<string | null>(null);

  // Category form
  const [addingCategory, setAddingCategory] = useState(false);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("🍽️");
  const [catLoading, setCatLoading] = useState(false);

  // Item form
  const [addingItem, setAddingItem] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemChargeable, setItemChargeable] = useState(true);
  const [itemVisibleTo, setItemVisibleTo] = useState<string[]>(roomTypes.map((rt) => rt.id));
  const [itemLoading, setItemLoading] = useState(false);

  const supabase = createClient();

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("menu_categories")
        .insert({ hotel_id: hotelId, name: catName, icon: catIcon, sort_order: localCategories.length })
        .select()
        .single();
      if (error) throw error;
      setLocalCategories((p) => [...p, data]);
      setActiveCategory(data.id);
      setCatName(""); setCatIcon("🍽️"); setAddingCategory(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setCatLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory) { setError("Select a category first"); return; }
    setItemLoading(true);
    setError(null);
    try {
      const priceCents = decimalToCents(parseFloat(itemPrice) || 0);
      const { data, error } = await supabase
        .from("menu_items")
        .insert({
          hotel_id: hotelId,
          category_id: activeCategory,
          name: itemName,
          description: itemDesc || null,
          price_cents: priceCents,
          is_chargeable: itemChargeable,
          visible_to_room_types: itemVisibleTo,
          sort_order: localItems.filter((i) => i.category_id === activeCategory).length,
        })
        .select("*, menu_categories(name)")
        .single();
      if (error) throw error;
      setLocalItems((p) => [...p, data]);
      setItemName(""); setItemDesc(""); setItemPrice(""); setAddingItem(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setItemLoading(false);
    }
  };

  const toggleItemAvailability = async (itemId: string, current: boolean) => {
    await supabase.from("menu_items").update({ is_available: !current }).eq("id", itemId);
    setLocalItems((p) => p.map((i) => (i.id === itemId ? { ...i, is_available: !current } : i)));
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm("Delete this item?")) return;
    await supabase.from("menu_items").delete().eq("id", itemId);
    setLocalItems((p) => p.filter((i) => i.id !== itemId));
  };

  const deleteCategory = async (catId: string) => {
    if (!confirm("Delete category and all its items?")) return;
    await supabase.from("menu_categories").delete().eq("id", catId);
    setLocalCategories((p) => p.filter((c) => c.id !== catId));
    setLocalItems((p) => p.filter((i) => i.category_id !== catId));
    setActiveCategory(localCategories.find((c) => c.id !== catId)?.id ?? null);
  };

  const activeItems = localItems.filter((i) => i.category_id === activeCategory);

  const commonIcons = ["🍽️", "🍔", "🍕", "☕", "🍹", "🛏️", "🧹", "💆", "👕", "🔧", "🍰"];

  return (
    <div className="flex gap-5 h-full">
      {/* Sidebar: Categories */}
      <div className="w-56 shrink-0 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Categories
          </h3>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAddingCategory(!addingCategory)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {addingCategory && (
          <div className="glass-card p-3 space-y-3">
            <form onSubmit={handleAddCategory} className="space-y-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Icon</Label>
                <div className="flex flex-wrap gap-1">
                  {commonIcons.map((ico) => (
                    <button
                      key={ico}
                      type="button"
                      onClick={() => setCatIcon(ico)}
                      className={`text-base p-1 rounded transition-all ${catIcon === ico ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-muted"}`}
                    >
                      {ico}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Name *</Label>
                <Input className="h-8 text-sm" placeholder="e.g. Beverages" value={catName} onChange={(e) => setCatName(e.target.value)} required />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setAddingCategory(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={catLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1">
                  {catLoading ? "..." : "Add"}
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-1">
          {localCategories.map((cat) => (
            <div key={cat.id} className="group relative">
              <button
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span className="flex-1 truncate">{cat.name}</span>
                <span className="text-xs bg-muted rounded-full px-1.5 py-0.5">
                  {localItems.filter((i) => i.category_id === cat.id).length}
                </span>
              </button>
              <button
                onClick={() => deleteCategory(cat.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {localCategories.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <UtensilsCrossed className="h-6 w-6 mx-auto mb-2 opacity-30" />
              No categories
            </div>
          )}
        </div>
      </div>

      {/* Main: Items */}
      <div className="flex-1 space-y-4">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {localCategories.find((c) => c.id === activeCategory)?.name ?? "Items"}
            {" "}
            <span className="text-muted-foreground text-sm font-normal">
              ({activeItems.length} items)
            </span>
          </h2>
          <Button
            size="sm"
            onClick={() => setAddingItem(!addingItem)}
            disabled={!activeCategory}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>

        {addingItem && (
          <div className="glass-card p-5">
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Item Name *</Label>
                  <Input placeholder="e.g. Masala Chai" value={itemName} onChange={(e) => setItemName(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label>Price (₹)</Label>
                  <Input type="number" placeholder="0.00" min="0" step="0.01" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input placeholder="Short description..." value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Visible to Room Types</Label>
                <div className="flex flex-wrap gap-2">
                  {roomTypes.map((rt) => (
                    <label key={rt.id} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={itemVisibleTo.includes(rt.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setItemVisibleTo((p) => [...p, rt.id]);
                          } else {
                            setItemVisibleTo((p) => p.filter((id) => id !== rt.id));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{rt.name}</span>
                    </label>
                  ))}
                  {roomTypes.length === 0 && (
                    <span className="text-xs text-muted-foreground">No room types configured</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chargeable"
                  checked={itemChargeable}
                  onChange={(e) => setItemChargeable(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="chargeable" className="cursor-pointer font-normal">
                  Chargeable (adds to room bill)
                </Label>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => setAddingItem(false)}>Cancel</Button>
                <Button type="submit" disabled={itemLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {itemLoading ? "Saving..." : "Save Item"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Items grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {activeItems.map((item) => (
            <div key={item.id} className={`glass-card p-4 transition-all ${!item.is_available ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
                {item.is_chargeable && (
                  <p className="text-primary font-bold text-sm shrink-0">
                    {formatCurrency(item.price_cents)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => toggleItemAvailability(item.id, item.is_available)}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    item.is_available ? "text-emerald-400" : "text-muted-foreground"
                  }`}
                >
                  {item.is_available ? (
                    <><Eye className="h-3.5 w-3.5" /> Available</>
                  ) : (
                    <><EyeOff className="h-3.5 w-3.5" /> Unavailable</>
                  )}
                </button>
                <div className="flex-1" />
                {!item.is_chargeable && (
                  <span className="text-xs text-muted-foreground border border-border/50 rounded px-1.5 py-0.5">
                    Free
                  </span>
                )}
                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-1 hover:text-destructive text-muted-foreground transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {activeItems.length === 0 && activeCategory && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <UtensilsCrossed className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No items in this category</p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 text-primary"
                onClick={() => setAddingItem(true)}
              >
                Add first item
              </Button>
            </div>
          )}

          {!activeCategory && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select or create a category to manage items</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
