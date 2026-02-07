import { useMemo, useState } from "react";
import { Loader2, ShoppingCart, Trash2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { ShoppingListItemCard } from "@/components/shopping-list-item";
import { SortableShoppingListItem } from "@/components/sortable-shopping-item";
import { ShoppingProgress } from "@/components/shopping-progress";
import { useCurrency } from "@/contexts/currency-context";
import { toast } from "@/hooks/use-toast";
import { addToLedger, saveToLedger } from "@/lib/ledger-store";
import type { ShoppingListItem } from "@/lib/types";

interface MarketModeProps {
  shoppingList: ShoppingListItem[];
  onTogglePurchased: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdatePrice: (id: string, price: number | undefined) => void;
  onUpdateUnit: (id: string, unit: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onRemoveItem: (id: string) => void;
  onClearList: () => void;
  onGoToInventory: () => void;
  onReorder?: (items: ShoppingListItem[]) => void;
}

export function MarketMode({
  shoppingList,
  onTogglePurchased,
  onUpdateQuantity,
  onUpdatePrice,
  onUpdateUnit,
  onUpdateNote,
  onRemoveItem,
  onClearList,
  onGoToInventory,
  onReorder,
}: MarketModeProps) {
  const { formatPrice } = useCurrency();
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags on simple clicks
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Long press to drag on touch
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeItems = useMemo(() => shoppingList.filter((item) => !item.purchased), [shoppingList]);
  const purchasedItems = useMemo(() => shoppingList.filter((item) => item.purchased), [shoppingList]);

  const stats = useMemo(() => {
    // Use convertedQuantity for accurate pricing with unit conversions
    const budget = shoppingList.reduce((sum, item) => {
      const qty = item.convertedQuantity ?? item.quantity;
      return sum + item.basePrice * qty;
    }, 0);

    const estimatedTotal = shoppingList.reduce((sum, item) => {
      const qty = item.convertedQuantity ?? item.quantity;
      return sum + (item.manualPrice ?? item.basePrice) * qty;
    }, 0);

    const purchasedValue = purchasedItems.reduce((sum, item) => {
      const qty = item.convertedQuantity ?? item.quantity;
      return sum + (item.manualPrice ?? item.basePrice) * qty;
    }, 0);

    return {
      totalItems: shoppingList.length,
      purchasedItems: purchasedItems.length,
      budget,
      estimatedTotal,
      purchasedValue,
    };
  }, [shoppingList, purchasedItems]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id && onReorder) {
      const oldIndex = shoppingList.findIndex((item) => item.id === active.id);
      const newIndex = shoppingList.findIndex((item) => item.id === over?.id);

      onReorder(arrayMove(shoppingList, oldIndex, newIndex));
    }
  }

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
          <Button onClick={onGoToInventory} className="w-full gap-2 sm:w-auto">
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
        originalBudget={stats.budget}
        purchasedValue={stats.purchasedValue}
      />

      <div className="space-y-8">
        {/* Active Items (Sortable) */}
        {activeItems.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Active Items
              </h2>
              <SortableContext items={activeItems} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {activeItems.map((item) => (
                    <SortableShoppingListItem
                      key={item.id}
                      id={item.id}
                      item={item}
                      onTogglePurchased={onTogglePurchased}
                      onUpdateQuantity={onUpdateQuantity}
                      onUpdatePrice={onUpdatePrice}
                      onUpdateUnit={onUpdateUnit}
                      onUpdateNote={onUpdateNote}
                      onRemove={onRemoveItem}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          </DndContext>
        )}

        {/* Purchased Items (Fixed at bottom) */}
        {purchasedItems.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Completed
            </h2>
            <div className="space-y-2 opacity-80">
              {purchasedItems.map((item) => (
                <ShoppingListItemCard
                  key={item.id}
                  item={item}
                  onTogglePurchased={onTogglePurchased}
                  onUpdateQuantity={onUpdateQuantity}
                  onUpdatePrice={onUpdatePrice}
                  onUpdateUnit={onUpdateUnit}
                  onUpdateNote={onUpdateNote}
                  onRemove={onRemoveItem}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-20 rounded-lg border border-border bg-card/95 backdrop-blur p-4 shadow-lg md:bottom-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Est. Checkout</p>
            <p
              className={`text-2xl font-bold ${stats.estimatedTotal > stats.budget ? "text-destructive" : ""}`}
            >
              {formatPrice(stats.estimatedTotal)}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
            <Button onClick={onGoToInventory} variant="outline" className="w-full gap-2 bg-transparent sm:w-auto">
              Add More Items
            </Button>
            {purchasedItems.length > 0 && (
              <Button
                onClick={async () => {
                  setIsSaving(true);
                  const { success, error } = await saveToLedger(purchasedItems);
                  setIsSaving(false);

                  if (success) {
                    onClearList();
                    toast({ title: "Shopping trip saved to Ledger! 🎉" });
                    onGoToInventory();
                  } else {
                    const msg = error instanceof Error ? error.message : String(error);
                    const supabaseUnavailable = msg.includes("Supabase client not initialized");
                    if (supabaseUnavailable) {
                      addToLedger(purchasedItems);
                      onClearList();
                      toast({
                        title: "Saved to local Ledger",
                        description: "Connect Supabase to sync to the cloud.",
                      });
                      onGoToInventory();
                    } else {
                      toast({
                        title: "Failed to save to Ledger",
                        description: msg,
                        variant: "destructive",
                      });
                    }
                  }
                }}
                disabled={isSaving}
                className="w-full gap-2 bg-success text-white sm:w-auto"
                variant="outline"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Finish & Save to Ledger"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
