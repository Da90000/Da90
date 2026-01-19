"use client";

import { useState, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddItemDialog } from "@/components/add-item-dialog";
import { InventoryItemCard } from "@/components/inventory-item-card";
import type { InventoryItem, ShoppingListItem } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

interface MasterInventoryProps {
  inventory: InventoryItem[];
  shoppingList: ShoppingListItem[];
  onAddItem: (item: { name: string; category: string; basePrice: number }) => void;
  onDeleteItem: (id: string) => void;
  onAddToCart: (item: InventoryItem) => void;
}

export function MasterInventory({
  inventory,
  shoppingList,
  onAddItem,
  onDeleteItem,
  onAddToCart,
}: MasterInventoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const cartItemIds = useMemo(
    () => new Set(shoppingList.map((item) => item.inventoryItemId)),
    [shoppingList]
  );

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, selectedCategory]);

  const groupedInventory = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    for (const item of filteredInventory) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredInventory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Master Inventory</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <AddItemDialog onAddItem={onAddItem} />
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px] bg-input">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredInventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-muted-foreground">No items found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedInventory)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, items]) => (
              <div key={category}>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {category}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((item) => (
                    <InventoryItemCard
                      key={item.id}
                      item={item}
                      onAddToCart={onAddToCart}
                      onDelete={onDeleteItem}
                      isInCart={cartItemIds.has(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{filteredInventory.length}</span> items in inventory
          {selectedCategory !== "all" && (
            <span> • Filtered by <span className="font-medium text-foreground">{selectedCategory}</span></span>
          )}
        </p>
      </div>
    </div>
  );
}
