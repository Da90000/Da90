"use client";

import { useState } from "react";
import { Minus, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ShoppingListItem } from "@/lib/types";

interface ShoppingListItemCardProps {
  item: ShoppingListItem;
  onTogglePurchased: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdatePrice: (id: string, price: number | undefined) => void;
  onRemove: (id: string) => void;
}

export function ShoppingListItemCard({
  item,
  onTogglePurchased,
  onUpdateQuantity,
  onUpdatePrice,
  onRemove,
}: ShoppingListItemCardProps) {
  const effectivePrice = item.manualPrice ?? item.basePrice;
  const [localPrice, setLocalPrice] = useState<number>(effectivePrice);

  const priceIncrease = item.basePrice ? ((localPrice - item.basePrice) / item.basePrice) * 100 : 0;
  const isHighIncrease = priceIncrease > 10;
  const itemTotal = localPrice * item.quantity;

  // On blur: update manualPrice (or clear it). Never touch basePrice.
  // manualPrice is only for the current shopping session, not for updating inventory.
  const handlePriceBlur = () => {
    const val = localPrice;
    if (!Number.isFinite(val) || val < 0) {
      setLocalPrice(item.basePrice);
      onUpdatePrice(item.id, undefined);
      return;
    }
    if (val === item.basePrice) {
      onUpdatePrice(item.id, undefined);
      return;
    }
    onUpdatePrice(item.id, val);
    // Note: We do NOT update inventory base_price here.
    // Base price should only be updated through the Edit Item dialog.
    // The last_paid_price will be updated when finishing shopping.
  };

  return (
    <div
      className={`group flex items-center gap-4 rounded-lg border p-4 transition-all ${
        item.purchased
          ? "border-success/30 bg-success/5"
          : isHighIncrease 
            ? "border-destructive/50 bg-destructive/5" // Highlight if price is too high
            : "border-border bg-card hover:border-accent/50"
      }`}
    >
      <Checkbox
        checked={item.purchased}
        onCheckedChange={() => onTogglePurchased(item.id)}
        className="h-6 w-6 shrink-0"
        aria-label={`Mark ${item.name} as purchased`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className={`font-medium truncate ${item.purchased ? "text-muted-foreground line-through" : "text-foreground"}`}>
              {item.name}
            </h3>
            
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {item.category}
              </span>
              
              {/* Actual price input — large enough for touch without zoom */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={localPrice}
                  onChange={(e) => setLocalPrice(Number(e.target.value))}
                  onBlur={handlePriceBlur}
                  className={`min-h-[44px] w-20 rounded border bg-transparent px-2 text-base tabular-nums focus:outline-none focus:ring-2 focus:ring-ring md:w-16 md:min-h-0 md:border-0 md:border-b md:border-dashed md:px-0 md:text-xs ${
                    isHighIncrease ? "text-destructive border-destructive font-bold md:border-destructive" : "border-input md:border-muted-foreground"
                  }`}
                />
                <span className="text-xs text-muted-foreground">each</span>
                
                {/* 4. THE ALERT ICON */}
                {isHighIncrease && !item.purchased && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-destructive animate-pulse">
                    <AlertTriangle className="h-3 w-3" />
                    {priceIncrease.toFixed(0)}% UP
                  </div>
                )}
              </div>
            </div>
          </div>

          <span className={`font-semibold whitespace-nowrap ${isHighIncrease && !item.purchased ? "text-destructive" : "text-foreground"}`}>
            ${itemTotal.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Quantity Controls */}
        <div className="flex items-center gap-1 rounded-md border border-border bg-secondary">
          <Button variant="ghost" size="icon" className="size-11 shrink-0" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="min-w-[2rem] py-2 text-center text-sm font-medium">{item.quantity}</span>
          <Button variant="ghost" size="icon" className="size-11 shrink-0" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <Button variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground hover:text-destructive opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100" onClick={() => onRemove(item.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}