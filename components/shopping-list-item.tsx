"use client";

import { useState, useEffect } from "react";
import { Minus, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ShoppingListItem } from "@/lib/types";
import { useCurrency } from "@/contexts/currency-context";

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
  const { formatPrice, currencySymbol } = useCurrency();
  const effectivePrice = item.manualPrice ?? item.basePrice;
  const [localPrice, setLocalPrice] = useState<number>(effectivePrice);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Sync localPrice with item.manualPrice when the item prop changes
  // This ensures the input reflects the persisted value after remounts or external updates
  // Only sync if the input is not currently focused (to avoid interrupting user typing)
  useEffect(() => {
    if (!isInputFocused) {
      const currentEffectivePrice = item.manualPrice ?? item.basePrice;
      setLocalPrice(currentEffectivePrice);
    }
  }, [item.manualPrice, item.basePrice, item.id, isInputFocused]);

  // Use persisted value for calculations to ensure consistency with stored data
  const calculatedPrice = item.manualPrice ?? item.basePrice;
  const percentChange = item.basePrice ? ((calculatedPrice - item.basePrice) / item.basePrice) * 100 : 0;
  const isPriceIncrease = percentChange > 0;
  const isPriceDecrease = percentChange < 0;
  const isSignificantIncrease = percentChange > 10;
  const isSignificantDecrease = percentChange < -10;
  const hasPriceChange = Math.abs(percentChange) > 0.01; // Account for floating point precision
  const itemTotal = calculatedPrice * item.quantity;

  // On blur: update manualPrice (or clear it). Never touch basePrice.
  // manualPrice is only for the current shopping session, not for updating inventory.
  const handlePriceBlur = () => {
    setIsInputFocused(false);
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
    // Persist the price change immediately
    onUpdatePrice(item.id, val);
    // Note: We do NOT update inventory base_price here.
    // Base price should only be updated through the Edit Item dialog.
    // The last_paid_price will be updated when finishing shopping.
  };

  const handlePriceFocus = () => {
    setIsInputFocused(true);
  };

  return (
    <div
      className={`group flex items-center gap-4 rounded-lg border p-4 transition-all ${
        item.purchased
          ? "border-success/30 bg-success/5"
          : isSignificantIncrease 
            ? "border-destructive/50 bg-destructive/10" // Highlight if price increased significantly
          : isSignificantDecrease
            ? "border-green-500/50 bg-green-500/10" // Highlight if price decreased significantly
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
            <p className="text-xs text-muted-foreground mt-0.5">
              Base Price: {formatPrice(item.basePrice)}
            </p>
            
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {item.category}
              </span>
              
              {/* Actual price input — large enough for touch without zoom */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">{currencySymbol}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={localPrice}
                  onChange={(e) => setLocalPrice(Number(e.target.value))}
                  onFocus={handlePriceFocus}
                  onBlur={handlePriceBlur}
                  className={`min-h-[44px] w-20 rounded border bg-transparent px-2 text-base tabular-nums focus:outline-none focus:ring-2 focus:ring-ring md:w-16 md:min-h-0 md:border-0 md:border-b md:border-dashed md:px-0 md:text-xs ${
                    isPriceIncrease && !item.purchased
                      ? "text-destructive border-destructive font-bold md:border-destructive"
                      : isPriceDecrease && !item.purchased
                      ? "text-green-600 dark:text-green-500 border-green-500 font-bold md:border-green-500"
                      : "border-input md:border-muted-foreground"
                  }`}
                />
                <span className="text-xs text-muted-foreground">each</span>
                
                {/* Price Change Badge */}
                {hasPriceChange && !item.purchased && (
                  <div
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isPriceIncrease
                        ? "bg-destructive/10 text-destructive"
                        : "bg-green-500/10 text-green-600 dark:text-green-500"
                    }`}
                  >
                    {isPriceIncrease ? (
                      <>
                        <TrendingUp className="h-3 w-3" />
                        +{percentChange.toFixed(0)}%
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3" />
                        {percentChange.toFixed(0)}%
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <span
            className={`font-semibold whitespace-nowrap ${
              isPriceIncrease && !item.purchased
                ? "text-destructive"
                : isPriceDecrease && !item.purchased
                ? "text-green-600 dark:text-green-500"
                : "text-foreground"
            }`}
          >
            {formatPrice(itemTotal)}
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