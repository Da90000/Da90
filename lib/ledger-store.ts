import { ShoppingListItem, InventoryItem } from "./types";
import { supabase } from "@/lib/supabase";

const LEDGER_KEY = "lifeos-central-ledger";
const INVENTORY_KEY = "shoplist-inventory";

export interface LedgerEntry {
  id: string;
  date: string;
  itemName: string;
  category: string;
  amount: number; // Final price paid
  quantity: number;
}

export function getLedger(): LedgerEntry[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LEDGER_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Updates local storage inventory lastPaidPrice based on purchased items.
 * Only updates prices that are greater than 0.
 * CRITICAL: Does NOT update base_price - keeps the standard price as is.
 */
function updateLocalInventoryPrices(items: ShoppingListItem[]): void {
  if (typeof window === "undefined") return;
  
  const stored = localStorage.getItem(INVENTORY_KEY);
  if (!stored) return;
  
  const inventory: InventoryItem[] = JSON.parse(stored);
  let updated = false;
  
  for (const item of items) {
    const price = item.manualPrice ?? item.basePrice;
    // Safety check: only update if price > 0
    if (price > 0) {
      const inventoryItem = inventory.find((inv) => inv.id === item.inventoryItemId);
      if (inventoryItem) {
        // Update lastPaidPrice, NOT basePrice
        inventoryItem.lastPaidPrice = price;
        updated = true;
      }
    }
  }
  
  if (updated) {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
    console.log(`✅ Updated ${items.length} inventory lastPaidPrice in local storage`);
  }
}

export function addToLedger(items: ShoppingListItem[]): void {
  const currentLedger = getLedger();
  
  const newEntries: LedgerEntry[] = items.map(item => {
    const price = item.manualPrice ?? item.basePrice;
    return {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      itemName: item.name,
      category: item.category,
      amount: price * item.quantity,
      quantity: item.quantity,
    };
  });

  localStorage.setItem(LEDGER_KEY, JSON.stringify([...currentLedger, ...newEntries]));
  console.log(`✅ Logged ${newEntries.length} items to Ledger`);
  
  // Update local inventory prices
  updateLocalInventoryPrices(items);
  
  // Sync to Supabase in the background
  saveToLedger(items).then(({ success, error }) => {
    if (!success) console.error("Failed to sync ledger to Supabase:", error);
  });
}

/**
 * Updates inventory last_paid_price in Supabase for purchased items.
 * Only updates prices that are greater than 0.
 * CRITICAL: Does NOT update base_price - keeps the standard price as is.
 */
async function updateInventoryPricesInSupabase(
  items: ShoppingListItem[]
): Promise<{ success: boolean; error: unknown }> {
  if (!supabase) {
    return { success: false, error: new Error("Supabase client not initialized") };
  }
  if (!items.length) {
    return { success: true, error: null };
  }

  // Group updates by inventory item ID to handle duplicates
  const priceUpdates = new Map<string, number>();
  
  for (const item of items) {
    const price = item.manualPrice ?? item.basePrice;
    // Safety check: only update if price > 0
    if (price > 0 && item.inventoryItemId) {
      // Use the most recent price if an item appears multiple times
      priceUpdates.set(item.inventoryItemId, price);
    }
  }

  // Perform bulk updates - update last_paid_price, NOT base_price
  const updatePromises = Array.from(priceUpdates.entries()).map(([id, price]) =>
    supabase
      .from("inventory")
      .update({ last_paid_price: price })
      .eq("id", id)
  );

  const results = await Promise.all(updatePromises);
  const errors = results.filter((result) => result.error);
  
  if (errors.length > 0) {
    return { success: false, error: errors[0].error };
  }
  
  console.log(`✅ Updated ${priceUpdates.size} inventory last_paid_price in Supabase`);
  return { success: true, error: null };
}

/**
 * Saves money data to the 'ledger' table in Supabase.
 * Maps items to: item_name, category, quantity, amount (price * quantity).
 * Uses a single batch insert.
 * After inserting into ledger, updates inventory last_paid_price for all purchased items.
 * CRITICAL: Does NOT update base_price - keeps the standard price as is.
 * @returns { success: true, error: null } on success, or { success: false, error } on failure.
 */
export async function saveToLedger(
  items: ShoppingListItem[]
): Promise<{ success: boolean; error: unknown }> {
  if (!supabase) {
    return { success: false, error: new Error("Supabase client not initialized") };
  }
  if (!items.length) {
    return { success: true, error: null };
  }

  const mappedItems = items.map((item) => {
    const price = item.manualPrice ?? item.basePrice;
    const amount = Number(price) * Number(item.quantity);
    return {
      item_name: item.name,
      category: item.category,
      quantity: item.quantity,
      amount: Number.isFinite(amount) ? amount : 0,
      created_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase.from("ledger").insert(mappedItems);

  if (error) {
    return { success: false, error };
  }

  // Update inventory prices after successful ledger insert
  const updateResult = await updateInventoryPricesInSupabase(items);
  if (!updateResult.success) {
    console.warn("Ledger saved but inventory price update failed:", updateResult.error);
    // Don't fail the whole operation if price update fails
  }

  // Also update local storage inventory prices
  updateLocalInventoryPrices(items);

  return { success: true, error: null };
}