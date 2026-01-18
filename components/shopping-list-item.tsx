"use client";

import { useState } from "react"; // Added for handling the actual price input
import { Minus, Plus, Trash2, AlertTriangle } from "lucide-react"; // Added AlertTriangle
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input"; // Ensure you have this shadcn component
import type { ShoppingListItem } from "@/lib/types";

interface ShoppingListItemCardProps {
  item: ShoppingListItem;
  onTogglePurchased: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function ShoppingListItemCard({
  item,
  onTogglePurchased,
  onUpdateQuantity,
  onRemove,
}: ShoppingListItemCardProps) {
  // 1. STATE FOR ACTUAL PRICE
  const [actualPrice, setActualPrice] = useState<number>(item.basePrice);

  // 2. LOGIC: CHECK FOR >10% INCREASE
  const priceIncrease = ((actualPrice - item.basePrice) / item.basePrice) * 100;
  const isHighIncrease = priceIncrease > 10;

  const itemTotal = actualPrice * item.quantity;

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
        className="h-5 w-5"
        aria-label={`Mark ${item.name}`}
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
              
              {/* 3. ACTUAL PRICE INPUT FIELD */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">$</span>
                <input
                  type="number"
                  value={actualPrice}
                  onChange={(e) => setActualPrice(Number(e.target.value))}
                  className={`w-16 bg-transparent border-b border-dashed text-xs focus:outline-none ${
                    isHighIncrease ? "text-destructive border-destructive font-bold" : "border-muted-foreground"
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onRemove(item.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}