import { ShoppingListItem } from "./types";
import { supabase } from "@/lib/supabase";

const LEDGER_KEY = "lifeos-central-ledger";

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
  
  // Sync to Supabase in the background
  saveToLedger(items).then(({ success, error }) => {
    if (!success) console.error("Failed to sync ledger to Supabase:", error);
  });
}

/**
 * Saves money data to the 'ledger' table in Supabase.
 * Maps items to: item_name, category, quantity, amount (price * quantity).
 * Uses a single batch insert.
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
  return { success: true, error: null };
}