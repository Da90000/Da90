"use client";

import { CheckCircle2, Circle, ShoppingBag } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";

interface ShoppingProgressProps {
  totalItems: number;
  purchasedItems: number;
  /** Sum of (item.basePrice * quantity) only. Does not change when user edits prices. */
  originalBudget: number;
  purchasedValue: number;
}

export function ShoppingProgress({
  totalItems,
  purchasedItems,
  originalBudget,
  purchasedValue,
}: ShoppingProgressProps) {
  const { formatPrice } = useCurrency();
  const progressPercent = totalItems > 0 ? (purchasedItems / totalItems) * 100 : 0;
  const isComplete = totalItems > 0 && purchasedItems === totalItems;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isComplete ? "bg-success text-success-foreground" : "bg-accent text-accent-foreground"
            }`}
          >
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Shopping Progress</h2>
            <p className="text-sm text-muted-foreground">
              {isComplete
                ? "All items purchased!"
                : `${totalItems - purchasedItems} items remaining`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{Math.round(progressPercent)}%</p>
          <p className="text-sm text-muted-foreground">complete</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isComplete ? "bg-success" : "bg-accent"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{purchasedItems}</span> purchased
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Circle className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{totalItems - purchasedItems}</span>{" "}
                remaining
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <div>
          <p className="text-sm text-muted-foreground">Original Budget</p>
          <p className="text-xl font-bold text-foreground">{formatPrice(originalBudget)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Purchased So Far</p>
          <p className="text-xl font-bold text-success">{formatPrice(purchasedValue)}</p>
        </div>
      </div>
    </div>
  );
}
