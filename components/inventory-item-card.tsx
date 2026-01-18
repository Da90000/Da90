"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InventoryItem } from "@/lib/types";

interface InventoryItemCardProps {
  item: InventoryItem;
  onAddToCart: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  isInCart: boolean;
}

export function InventoryItemCard({ item, onAddToCart, onDelete, isInCart }: InventoryItemCardProps) {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 transition-all hover:border-accent/50 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-foreground">{item.name}</h3>
          <span className="mt-1 inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            {item.category}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete item</span>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-foreground">
          ${item.basePrice.toFixed(2)}
        </span>
        <Button
          size="sm"
          onClick={() => onAddToCart(item)}
          className={`gap-1.5 ${isInCart ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}`}
        >
          <Plus className="h-4 w-4" />
          {isInCart ? "Add More" : "Add to List"}
        </Button>
      </div>
    </div>
  );
}
