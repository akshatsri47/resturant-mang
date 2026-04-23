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
  Image as ImageIcon,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [itemImage, setItemImage] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemLoading, setItemLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);

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

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory) { setError("Select a category first"); return; }
    setItemLoading(true);
    setError(null);
    try {
      let imageUrl = existingImageUrl;

      // Upload image if selected
      if (itemImage) {
        const fileExt = itemImage.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("menu_images")
          .upload(fileName, itemImage);

        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from("menu_images")
            .getPublicUrl(fileName);
          imageUrl = publicUrl;
        }
      }

      const priceCents = decimalToCents(parseFloat(itemPrice) || 0);
      
      const payload = {
        hotel_id: hotelId,
        category_id: activeCategory,
        name: itemName,
        description: itemDesc || null,
        price_cents: priceCents,
        is_chargeable: itemChargeable,
        visible_to_room_types: itemVisibleTo,
        image_url: imageUrl,
      };

      let data, error;

      if (editingItemId) {
        const res = await supabase
          .from("menu_items")
          .update(payload)
          .eq("id", editingItemId)
          .select("*, menu_categories(name)")
          .single();
        data = res.data;
        error = res.error;
      } else {
        const res = await supabase
          .from("menu_items")
          .insert({
            ...payload,
            sort_order: localItems.filter((i) => i.category_id === activeCategory).length,
          })
          .select("*, menu_categories(name)")
          .single();
        data = res.data;
        error = res.error;
      }

      if (error) throw error;
      
      if (editingItemId) {
        setLocalItems((p) => p.map((i) => i.id === editingItemId ? data : i));
      } else {
        setLocalItems((p) => [...p, data]);
      }

      resetItemForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setItemLoading(false);
    }
  };

  const resetItemForm = () => {
    setItemName(""); 
    setItemDesc(""); 
    setItemPrice(""); 
    setItemImage(null); 
    setExistingImageUrl(null);
    setEditingItemId(null);
    setAddingItem(false);
  };

  const startEditing = (item: MenuItem) => {
    setActiveCategory(item.category_id);
    setEditingItemId(item.id);
    setItemName(item.name);
    setItemDesc(item.description || "");
    setItemPrice(centsToDecimal(item.price_cents).toString());
    setItemChargeable(item.is_chargeable);
    setItemVisibleTo(item.visible_to_room_types);
    setExistingImageUrl(item.image_url || null);
    setItemImage(null);
    setAddingItem(true);
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

  const loadTemplate = async (type: "indian" | "indo_chinese" | "indo_italian") => {
    if (!confirm(`This will load the ${type.replace('_', '-')} template. Continue?`)) return;
    setTemplateLoading(true);
    setError(null);
    try {
      let templateCategories: { name: string, icon: string }[] = [];
      let templateItemsFactory: (cats: Record<string, string>) => any[] = () => [];

      if (type === "indian") {
        templateCategories = [
          { name: "Indian Starters", icon: "🥟" },
          { name: "Indian Mains", icon: "🍛" },
          { name: "Breads & Rice", icon: "🥖" },
          { name: "Desserts & Drinks", icon: "☕" },
        ];
        templateItemsFactory = (cats) => [
          { category_id: cats["Indian Starters"], name: "Paneer Tikka", description: "Grilled cottage cheese marinated in spices", price_cents: 35000, image_url: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&q=80" },
          { category_id: cats["Indian Starters"], name: "Punjabi Samosa", description: "Crispy pastry filled with spiced potatoes", price_cents: 15000, image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80" },
          { category_id: cats["Indian Mains"], name: "Butter Chicken", description: "Classic creamy tomato curry with tender chicken", price_cents: 45000, image_url: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&q=80" },
          { category_id: cats["Indian Mains"], name: "Dal Makhani", description: "Slow-cooked black lentils in creamy butter sauce", price_cents: 30000, image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80" },
          { category_id: cats["Breads & Rice"], name: "Garlic Naan", description: "Soft bread cooked in tandoor with garlic butter", price_cents: 8000, image_url: "https://images.unsplash.com/photo-1626082895617-2c6ab34758ce?w=500&q=80" },
          { category_id: cats["Breads & Rice"], name: "Chicken Biryani", description: "Aromatic basmati rice cooked with spiced chicken", price_cents: 40000, image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80" },
          { category_id: cats["Desserts & Drinks"], name: "Masala Chai", description: "Indian spiced tea with milk", price_cents: 10000, image_url: "https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=500&q=80" },
          { category_id: cats["Desserts & Drinks"], name: "Mango Lassi", description: "Sweet yogurt drink blended with mangoes", price_cents: 18000, image_url: "https://images.unsplash.com/photo-1628103510526-9a2f7c00609f?w=500&q=80" },
        ];
      } else if (type === "indo_chinese") {
        templateCategories = [
          { name: "Indo-Chinese Starters", icon: "🥟" },
          { name: "Noodles & Rice", icon: "🍜" },
          { name: "Indo-Chinese Mains", icon: "🍛" },
        ];
        templateItemsFactory = (cats) => [
          { category_id: cats["Indo-Chinese Starters"], name: "Chilli Paneer", description: "Crispy paneer tossed in spicy soy sauce", price_cents: 32000, image_url: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&q=80" },
          { category_id: cats["Noodles & Rice"], name: "Hakka Noodles", description: "Wok-tossed noodles with veggies", price_cents: 25000, image_url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&q=80" },
          { category_id: cats["Indo-Chinese Mains"], name: "Veg Manchurian", description: "Vegetable dumplings in dark soy gravy", price_cents: 28000, image_url: "https://images.unsplash.com/photo-1626804475297-41609ea004eb?w=500&q=80" },
        ];
      } else if (type === "indo_italian") {
        templateCategories = [
          { name: "Pizzas", icon: "🍕" },
          { name: "Pastas", icon: "🍝" },
          { name: "Italian Starters", icon: "🧄" },
        ];
        templateItemsFactory = (cats) => [
          { category_id: cats["Pizzas"], name: "Paneer Tikka Pizza", description: "Fusion pizza with paneer tikka topping", price_cents: 45000, image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80" },
          { category_id: cats["Pastas"], name: "Makhani Pasta", description: "Penne tossed in creamy makhani sauce", price_cents: 35000, image_url: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=500&q=80" },
          { category_id: cats["Italian Starters"], name: "Garlic Bread with Cheese", description: "Toasted bread with garlic butter and mozzarella", price_cents: 18000, image_url: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=500&q=80" },
        ];
      }

      const catMap: Record<string, string> = {};
      let orderOffset = localCategories.length;
      
      for (const cat of templateCategories) {
        // Handle duplicate categories by using existing ones
        const existing = localCategories.find(c => c.name.toLowerCase() === cat.name.toLowerCase());
        if (existing) {
          catMap[cat.name] = existing.id;
        } else {
          const { data, error } = await supabase.from("menu_categories").insert({ 
            hotel_id: hotelId, 
            name: cat.name, 
            icon: cat.icon, 
            sort_order: orderOffset++ 
          }).select().single();
          
          if (error) throw error;
          catMap[cat.name] = data.id;
          setLocalCategories(p => [...p, data]);
        }
      }

      const newItemsData = templateItemsFactory(catMap);
      
      const { data: insertedItems, error: itemsErr } = await supabase.from("menu_items").insert(
        newItemsData.map((item, idx) => ({
          ...item,
          hotel_id: hotelId,
          is_chargeable: true,
          visible_to_room_types: roomTypes.map(rt => rt.id),
          sort_order: idx
        }))
      ).select("*, menu_categories(name)");

      if (itemsErr) throw itemsErr;

      if (insertedItems) setLocalItems((p) => [...p, ...insertedItems]);
      setActiveCategory(catMap[templateCategories[0].name]);
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading template");
    } finally {
      setTemplateLoading(false);
    }
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
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={templateLoading} className="gap-2">
                  {templateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UtensilsCrossed className="h-4 w-4" />}
                  Templates <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => loadTemplate("indian")}>
                  Indian Cuisine
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => loadTemplate("indo_chinese")}>
                  Indo-Chinese Cuisine
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => loadTemplate("indo_italian")}>
                  Indo-Italian Cuisine
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              onClick={() => {
                resetItemForm();
                setAddingItem(true);
              }}
              disabled={!activeCategory}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>
        </div>

        {addingItem && (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{editingItemId ? "Edit Item" : "Add New Item"}</h3>
            </div>
            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-start">
                {/* Image Upload Area */}
                <div className="shrink-0 w-full md:w-32">
                  <Label className="block mb-2 text-sm">Image (Optional)</Label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden relative group bg-card">
                    {itemImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={URL.createObjectURL(itemImage)} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : existingImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={existingImageUrl} 
                        alt="Existing" 
                        className="w-full h-full object-cover group-hover:opacity-50 transition-opacity"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                        <ImageIcon className="h-6 w-6 mb-2" />
                        <span className="text-xs font-medium">Upload</span>
                      </div>
                    )}
                    {(existingImageUrl && !itemImage) && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                        <ImageIcon className="h-5 w-5 mb-1" />
                        <span className="text-[10px] font-medium uppercase tracking-wider">Change</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => setItemImage(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <div className="flex-1 space-y-4 w-full">
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
                </div>
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
                <Button type="button" variant="ghost" onClick={resetItemForm}>Cancel</Button>
                <Button type="submit" disabled={itemLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {itemLoading ? "Saving..." : editingItemId ? "Update Item" : "Save Item"}
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {activeItems.map((item) => (
            <div key={item.id} className={`glass-card p-4 transition-all ${!item.is_available ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-3">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-lg object-cover shrink-0 shadow-sm" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 border border-border/50">
                    <UtensilsCrossed className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground truncate">{item.name}</p>
                    {item.is_chargeable && (
                      <p className="text-primary font-bold text-sm shrink-0">
                        {formatCurrency(item.price_cents)}
                      </p>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 pr-2">
                      {item.description}
                    </p>
                  )}
                </div>
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
                  onClick={() => startEditing(item)}
                  className="p-1 hover:text-primary text-muted-foreground transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
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
