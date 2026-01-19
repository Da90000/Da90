import { ShoppingListItem, InventoryItem } from "./types";
import { supabase } from "@/lib/supabase";

const LEDGER_KEY = "lifeos-central-ledger";
const INVENTORY_KEY = "shoplist-inventory";

export type TransactionType = "expense" | "income" | "debt_given" | "debt_taken";

export interface LedgerEntry {
  id: string;
  date: string;
  itemName: string;
  category: string;
  amount: number; // Final price paid
  quantity: number;
  transaction_type?: TransactionType;
  entity_name?: string; // For debt: who gave/took the money
  is_settled?: boolean; // For debt: whether it's been settled
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
      transaction_type: "expense" as TransactionType,
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

/**
 * Adds a transaction to the ledger (expense, income, or debt).
 * @param transaction - Transaction data including type and optional entity_name
 * @returns { success: true, error: null } on success, or { success: false, error } on failure.
 */
export async function addTransaction(transaction: {
  item_name: string;
  category: string;
  amount: number;
  transaction_type: TransactionType;
  entity_name?: string;
  quantity?: number;
  created_at?: string; // Optional custom date in ISO format
}): Promise<{ success: boolean; error: unknown }> {
  if (!supabase) {
    return { success: false, error: new Error("Supabase client not initialized") };
  }

  const { error } = await supabase.from("ledger").insert({
    item_name: transaction.item_name,
    category: transaction.category,
    amount: transaction.amount,
    quantity: transaction.quantity ?? 1,
    transaction_type: transaction.transaction_type,
    entity_name: transaction.entity_name || null,
    is_settled: transaction.transaction_type.startsWith("debt_") ? false : null,
    created_at: transaction.created_at || new Date().toISOString(),
  });

  if (error) {
    return { success: false, error };
  }

  return { success: true, error: null };
}

/**
 * Fetches ledger entries from Supabase.
 * @param filters - Optional filters for transaction type and settled status
 * @returns Array of LedgerEntry objects
 */
export async function fetchLedger(filters?: {
  transaction_type?: TransactionType;
  is_settled?: boolean;
}): Promise<LedgerEntry[]> {
  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping fetch.");
    return [];
  }

  let query = supabase
    .from("ledger")
    .select("id, created_at, item_name, category, amount, quantity, transaction_type, entity_name, is_settled")
    .order("created_at", { ascending: false });

  if (filters?.transaction_type) {
    query = query.eq("transaction_type", filters.transaction_type);
  }

  if (filters?.is_settled !== undefined) {
    if (filters.is_settled) {
      query = query.eq("is_settled", true);
    } else {
      query = query.or("is_settled.is.null,is_settled.eq.false");
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("Ledger fetch error:", error);
    return [];
  }

  if (!data) return [];

  return data.map((row: any) => ({
    id: String(row.id ?? ""),
    date: String(row.created_at ?? ""),
    itemName: String(row.item_name ?? ""),
    category: String(row.category ?? ""),
    amount: Number(row.amount) || 0,
    quantity: Number(row.quantity) || 1,
    transaction_type: row.transaction_type as TransactionType | undefined,
    entity_name: row.entity_name ? String(row.entity_name) : undefined,
    is_settled: row.is_settled === true,
  }));
}

/**
 * Settles a debt by marking it as settled.
 * @param id - The ledger entry ID
 * @returns { success: true, error: null } on success, or { success: false, error } on failure.
 */
export async function settleDebt(id: string): Promise<{ success: boolean; error: unknown }> {
  if (!supabase) {
    return { success: false, error: new Error("Supabase client not initialized") };
  }

  const { error } = await supabase
    .from("ledger")
    .update({ is_settled: true })
    .eq("id", id);

  if (error) {
    return { success: false, error };
  }

  return { success: true, error: null };
}