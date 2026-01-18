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
  
  const newEntries: LedgerEntry[] = items.map(item => ({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    itemName: item.name,
    category: item.category,
    amount: item.basePrice * item.quantity, // In Phase 2, we can add a 'actualPrice' field
    quantity: item.quantity
  }));

  localStorage.setItem(LEDGER_KEY, JSON.stringify([...currentLedger, ...newEntries]));
  console.log(`✅ Logged ${newEntries.length} items to Ledger`);
  
  // Sync to Supabase in the background
  syncLedgerToSupabase(items).catch((error) => {
    console.error("Failed to sync ledger to Supabase:", error);
  });
}

/**
 * Sync ledger entries to Supabase.
 * Maps ShoppingListItem to ledger schema: item_name, category, quantity, amount
 */
async function syncLedgerToSupabase(items: ShoppingListItem[]): Promise<void> {
  if (!items.length) return;
  
  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping ledger sync.");
    return;
  }
  
  // Map ShoppingListItem to ledger schema
  const payload = items.map((item) => ({
    item_name: item.name,
    category: item.category,
    quantity: item.quantity,
    amount: item.basePrice * item.quantity, // Total amount paid
    created_at: new Date().toISOString(),
  }));
  
  const { error } = await supabase.from("ledger").insert(payload).select();
  
  if (error) {
    throw new Error(`Supabase ledger sync failed: ${error.message}`);
  }
}