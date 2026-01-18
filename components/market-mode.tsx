"use client";

import { useMemo } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShoppingListItemCard } from "@/components/shopping-list-item";
import { ShoppingProgress } from "@/components/shopping-progress";
import type { ShoppingListItem } from "@/lib/types";

interface MarketModeProps {
  shoppingList: ShoppingListItem[];
  onTogglePurchased: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onClearList: () => void;
  onGoToInventory: () => void;
}

export function MarketMode({
  shoppingList,
  onTogglePurchased,
  onUpdateQuantity,
  onRemoveItem,
  onClearList,
  onGoToInventory,
}: MarketModeProps) {
  const stats = useMemo(() => {
    const purchased = shoppingList.filter((item) => item.purchased);
    const totalValue = shoppingList.reduce((sum, item) => sum + item.basePrice * item.quantity, 0);
    const purchasedValue = purchased.reduce(
      (sum, item) => sum + item.basePrice * item.quantity,
      0
    );

    return {
      totalItems: shoppingList.length,
      purchasedItems: purchased.length,
      totalValue,
      purchasedValue,
    };
  }, [shoppingList]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, ShoppingListItem[]> = {};
    for (const item of shoppingList) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    }
    return groups;
  }, [shoppingList]);

  if (shoppingList.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Market Mode</h1>
          <p className="text-muted-foreground">Your active shopping list</p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Your shopping list is empty</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-sm">
            Start adding items from your Master Inventory to create your shopping list
          </p>
          <Button onClick={onGoToInventory} className="gap-2">
            Browse Inventory
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Market Mode</h1>
          <p className="text-muted-foreground">Your active shopping list</p>
        </div>
        <Button variant="outline" onClick={onClearList} className="gap-2 text-destructive hover:text-destructive bg-transparent">
          <Trash2 className="h-4 w-4" />
          Clear List
        </Button>
      </div>

      <ShoppingProgress
        totalItems={stats.totalItems}
        purchasedItems={stats.purchasedItems}
        totalValue={stats.totalValue}
        purchasedValue={stats.purchasedValue}
      />

      <div className="space-y-6">
        {Object.entries(groupedByCategory)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, items]) => (
            <div key={category}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {category}
              </h2>
              <div className="space-y-2">
                {items.map((item) => (
                  <ShoppingListItemCard
                    key={item.id}
                    item={item}
                    onTogglePurchased={onTogglePurchased}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemove={onRemoveItem}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>

      <div className="sticky bottom-4 rounded-lg border border-border bg-card/95 backdrop-blur p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total ({shoppingList.length} items)</p>
            <p className="text-2xl font-bold text-foreground">${stats.totalValue.toFixed(2)}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={onGoToInventory} variant="outline" className="gap-2 bg-transparent">
              Add More Items
            </Button>
            {shoppingList.some(item => item.purchased) && (
              <Button
                onClick={async () => {
                  // Dynamically import addToLedger for client-side usage
                  const { addToLedger } = await import("@/lib/ledger-store");
                  const purchasedItems = shoppingList.filter(item => item.purchased);
                  addToLedger(purchasedItems);

                  onClearList();

                  // Show a toast if you have a system, otherwise use alert as fallback
                  if (typeof window !== "undefined" && "toast" in window) {
                    // @ts-ignore
                    window.toast.success("Shopping trip saved to Ledger! 🎉");
                  } else {
                    alert("Shopping trip saved to Ledger! 🎉");
                  }
                }}
                className="gap-2 bg-success text-white"
                variant="outline"
              >
                Finish &amp; Save to Ledger
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
