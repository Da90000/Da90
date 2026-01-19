"use client";

import { Plus, Trash2, Clock, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InventoryItem } from "@/lib/types";

interface InventoryItemCardProps {
  item: InventoryItem;
  onAddToCart: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onEdit: (item: InventoryItem) => void;
  isInCart: boolean;
}

export function InventoryItemCard({ item, onAddToCart, onDelete, onEdit, isInCart }: InventoryItemCardProps) {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 transition-all hover:border-accent/50 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-foreground">{item.name}</h3>
          <span className="mt-1 inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            {item.category}
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all"
            onClick={() => onEdit(item)}
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit item</span>
          </Button>
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
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          {/* Base Price - Standard Price */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground">Std:</span>
            <span className="text-lg font-bold text-foreground">
              {item.basePrice.toFixed(2)} BDT
            </span>
          </div>
          {/* Last Paid Price - with color coding */}
          {item.lastPaidPrice !== undefined && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Last:</span>
              <span
                className={`text-sm font-medium ${
                  item.lastPaidPrice > item.basePrice
                    ? "text-destructive" // Red for trend up
                    : item.lastPaidPrice < item.basePrice
                    ? "text-green-600 dark:text-green-500" // Green for trend down
                    : "text-muted-foreground" // Neutral if equal
                }`}
              >
                {item.lastPaidPrice.toFixed(2)} BDT
              </span>
            </div>
          )}
        </div>
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
