import { ShoppingListItem, InventoryItem } from "./types";
import { supabase } from "@/lib/supabase";
import { SyncService } from "@/lib/sync-service";

const LEDGER_KEY = "lifeos-central-ledger";
const INVENTORY_KEY = "shoplist-inventory";
const CACHE_LEDGER_KEY = "lifeos-ledger-cache";

function getCachedLedger(): LedgerEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CACHE_LEDGER_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveCachedLedger(entries: LedgerEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CACHE_LEDGER_KEY, JSON.stringify(entries));
}

function mergeQueueWithLedger(entries: LedgerEntry[]): LedgerEntry[] {
  if (typeof window === "undefined") return entries;
  const queue = SyncService.getInstance().getQueue();

  // 1. Handle Ledger Inserts
  const queuedInserts = queue
    .filter(action => action.table === "ledger" && action.type === "INSERT")
    .filter(action => !entries.some(e => e.id === action.id)) // Deduplication
    .map(action => {
      const p = action.payload;
      return {
        id: action.id, // Use queue ID or generated ID
        date: p.created_at || new Date().toISOString(),
        itemName: p.item_name,
        category: p.category,
        amount: Number(p.amount),
        quantity: Number(p.quantity) || 1,
        transaction_type: p.transaction_type,
        entity_name: p.entity_name,
        is_settled: p.is_settled,
        payments: []
      } as LedgerEntry;
    });

  let merged = [...queuedInserts, ...entries];

  // 2. Handle Debt Payment Inserts
  const queuedPayments = queue.filter(action => action.table === "debt_payments" && action.type === "INSERT");

  queuedPayments.forEach(action => {
    const p = action.payload;
    const ledgerId = p.ledger_id;

    // Find the entry (either existing or queued)
    const entry = merged.find(e => e.id === ledgerId);
    if (entry) {
      if (!entry.payments) entry.payments = [];

      // Avoid duplicates
      if (!entry.payments.find(pay => pay.id === action.id)) {
        entry.payments.push({
          id: action.id,
          ledger_id: ledgerId,
          amount: Number(p.amount),
          note: p.note,
          payment_date: p.payment_date || new Date().toISOString()
        });

        // Optimistic Settlement Check
        const totalPaid = entry.payments.reduce((sum, x) => sum + x.amount, 0);
        if (totalPaid >= entry.amount) {
          entry.is_settled = true;
        }
      }
    }
  });

  return merged;
}

export type TransactionType = "expense" | "income" | "debt_given" | "debt_taken";

export interface DebtPayment {
  id: string;
  ledger_id: string;
  amount: number;
  note?: string;
  payment_date: string;
}

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
  payments?: DebtPayment[]; // For debt: partial payments made
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
    const qty = item.convertedQuantity ?? item.quantity; // Use converted quantity
    return {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      itemName: item.name,
      category: item.category,
      amount: price * qty,
      quantity: qty,
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
    const qty = item.convertedQuantity ?? item.quantity; // Use converted quantity for accurate pricing
    const amount = Number(price) * Number(qty);
    return {
      item_name: item.name,
      category: item.category,
      quantity: qty, // Store converted quantity in ledger
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
}): Promise<{ success: boolean; error: unknown; offline?: boolean }> {
  const payload = {
    item_name: transaction.item_name,
    category: transaction.category,
    amount: transaction.amount,
    quantity: transaction.quantity ?? 1,
    transaction_type: transaction.transaction_type,
    entity_name: transaction.entity_name || null,
    is_settled: transaction.transaction_type.startsWith("debt_") ? false : null,
    created_at: transaction.created_at || new Date().toISOString(),
  };

  try {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { error } = await supabase.from("ledger").insert(payload);

    if (error) throw error;

    // Success: Update Cache (Optional but good for consistency before next fetch)
    // We can't easily append to cache without fetching or assuming cache state.
    // But we can try to prepend if cache exists.
    const cached = getCachedLedger();
    const newEntry: LedgerEntry = {
      id: crypto.randomUUID(), // Temp ID, will be replaced by real fetch
      date: payload.created_at,
      itemName: payload.item_name,
      category: payload.category,
      amount: payload.amount,
      quantity: payload.quantity,
      transaction_type: payload.transaction_type,
      entity_name: payload.entity_name || undefined,
      is_settled: payload.is_settled === false ? false : undefined,
    };
    saveCachedLedger([newEntry, ...cached]);

    return { success: true, error: null };
  } catch (error) {
    // Failure/Offline: Queue it
    console.error("addTransaction error, queuing:", error);

    const offlineId = crypto.randomUUID();
    SyncService.getInstance().addToQueue({
      type: "INSERT",
      table: "ledger",
      payload: { ...payload, id: offlineId } // Include ID for consistency
    });

    // Optimistic Update to Cache
    const cached = getCachedLedger();
    const newEntry: LedgerEntry = {
      id: offlineId,
      date: payload.created_at,
      itemName: payload.item_name,
      category: payload.category,
      amount: payload.amount,
      quantity: payload.quantity,
      transaction_type: payload.transaction_type,
      entity_name: payload.entity_name || undefined,
      is_settled: payload.is_settled === false ? false : undefined,
    };
    saveCachedLedger([newEntry, ...cached]);

    return { success: true, error: null, offline: true };
  }
}

/**
 * Fetches ledger entries from Supabase, including debt payments.
 * @param filters - Optional filters for transaction type and settled status
 * @returns Array of LedgerEntry objects with payments for debt items
 */
export async function fetchLedger(filters?: {
  transaction_type?: TransactionType;
  is_settled?: boolean;
}): Promise<LedgerEntry[]> {
  // 1. Load from Cache immediately
  const cachedData = getCachedLedger(); // This is the fast path

  if (!supabase) {
    console.warn("Supabase client not initialized. Returning cache.");
    return mergeQueueWithLedger(cachedData);
  }

  // 2. Try Fetching from Supabase
  try {
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

    if (error) throw error;

    // Process Supabase Data
    const serverEntries = await Promise.all(
      (data || []).map(async (row: any) => {
        const entry: LedgerEntry = {
          id: String(row.id ?? ""),
          date: String(row.created_at ?? ""),
          itemName: String(row.item_name ?? ""),
          category: String(row.category ?? ""),
          amount: Number(row.amount) || 0,
          quantity: Number(row.quantity) || 1,
          transaction_type: row.transaction_type as TransactionType | undefined,
          entity_name: row.entity_name ? String(row.entity_name) : undefined,
          is_settled: row.is_settled === true,
        };

        // Fetch payments for debt items
        if (entry.transaction_type?.startsWith("debt_")) {
          try {
            const { data: payments, error: paymentsError } = await supabase
              .from("debt_payments")
              .select("id, ledger_id, amount, note, payment_date")
              .eq("ledger_id", entry.id)
              .order("payment_date", { ascending: true });

            if (!paymentsError && payments) {
              entry.payments = payments.map((p: any) => ({
                id: String(p.id ?? ""),
                ledger_id: String(p.ledger_id ?? ""),
                amount: Number(p.amount) || 0,
                note: p.note ? String(p.note) : undefined,
                payment_date: String(p.payment_date ?? ""),
              }));
            }
          } catch (err) {
            console.warn("Could not fetch debt payments:", err);
          }
        }
        return entry;
      })
    );

    // 3. Success: Update Cache and Return Merged Data
    // We only update cache with server data, not queued items (queue is applied on read)
    // Actually, saving just server entries to cache is safer.
    saveCachedLedger(serverEntries);

    return mergeQueueWithLedger(serverEntries);

  } catch (error) {
    // 4. Failure: Return Cached Data (with queue merged)
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
    console.warn("Ledger fetch failed, falling back to cache:", errorMsg);

    if (cachedData.length > 0) {
      return mergeQueueWithLedger(cachedData);
    }

    // If no cache and no network, return empty but try to show queue
    return mergeQueueWithLedger([]);
  }
}

/**
 * Adds a partial payment to a debt.
 * @param ledgerId - The ledger entry ID (debt)
 * @param amount - The payment amount
 * @param note - Optional note about the payment
 * @param paymentDate - Optional payment date (defaults to now)
 * @returns { success: true, error: null } on success, or { success: false, error } on failure.
 */
export async function addDebtPayment(
  ledgerId: string,
  amount: number,
  note?: string,
  paymentDate?: string
): Promise<{ success: boolean; error: unknown; offline?: boolean }> {
  if (!supabase) {
    return { success: false, error: new Error("Supabase client not initialized") };
  }

  // Validate amount
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: new Error("Invalid payment amount") };
  }

  try {
    // 1. Fetch debt entry (try cache if offline, but we need to trust server state for payments... tricky)
    // For now, let's try standard fetch.
    const { data: debtEntry, error: fetchError } = await supabase
      .from("ledger")
      .select("amount, transaction_type, is_settled")
      .eq("id", ledgerId)
      .single();

    if (fetchError || !debtEntry) throw fetchError || new Error("Debt entry not found");

    if (!debtEntry.transaction_type?.startsWith("debt_")) {
      throw new Error("Entry is not a debt");
    }

    // Attempt Insert
    const payload = {
      ledger_id: ledgerId,
      amount: amount,
      note: note || null,
      payment_date: paymentDate || new Date().toISOString(),
    };

    // We also need to check settlement status, which requires history. 
    // This logic is hard to replicate offline without full history.
    // For specific "Offline Payment", we might just queue the INSERT and let server handle settlement logic later.

    const { error: insertError } = await supabase.from("debt_payments").insert(payload);

    if (insertError) throw insertError;

    // Server-side logic for settlement (fetching history) calls Supabase again.
    // If online, we do it.

    // Check total paid logic...
    const { data: existingPayments } = await supabase
      .from("debt_payments")
      .select("amount")
      .eq("ledger_id", ledgerId);

    const totalPaid = (existingPayments?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0);

    // If total paid >= original amount, mark as settled
    if (totalPaid >= Number(debtEntry.amount || 0) && !debtEntry.is_settled) {
      await supabase.from("ledger").update({ is_settled: true }).eq("id", ledgerId);
    }

    return { success: true, error: null };

  } catch (error) {
    // Failure/Offline: Queue the payment
    console.warn("addDebtPayment failed, queuing:", error);

    const offlineId = crypto.randomUUID();
    const payload = {
      ledger_id: ledgerId,
      amount: amount,
      note: note || null,
      payment_date: paymentDate || new Date().toISOString(),
    };

    SyncService.getInstance().addToQueue({
      type: "INSERT",
      table: "debt_payments",
      payload: { ...payload, id: offlineId }
    });

    // We don't easily support optimistic updates for nested payments in CACHE_LEDGER 
    // without fetching the whole ledger, finding the item, and appending payment.
    // But we can try:
    const cached = getCachedLedger();
    const entryIndex = cached.findIndex(e => e.id === ledgerId);
    if (entryIndex !== -1) {
      const entry = cached[entryIndex];
      if (!entry.payments) entry.payments = [];
      entry.payments.push({
        id: offlineId,
        ledger_id: ledgerId,
        amount: amount,
        note: note,
        payment_date: payload.payment_date
      });
      // Check settlement optimistically?
      const totalPaid = (entry.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);
      if (totalPaid >= entry.amount) {
        entry.is_settled = true;
        // Note: We should queue the UPDATE for ledger is_settled too if we were thorough,
        // but the server will handle it eventually when the payment syncs.
      }
      saveCachedLedger(cached);
    }

    return { success: true, error: null, offline: true };
  }
}

/**
 * Settles a debt by marking it as settled (legacy function, kept for compatibility).
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

/**
 * Calculates the total amount paid for a debt entry.
 * @param entry - The ledger entry (debt)
 * @returns Total amount paid
 */
export function getTotalPaid(entry: LedgerEntry): number {
  if (!entry.payments || entry.payments.length === 0) {
    return 0;
  }
  return entry.payments.reduce((sum: number, payment: DebtPayment) => sum + payment.amount, 0);
}

/**
 * Calculates the remaining amount for a debt entry.
 * @param entry - The ledger entry (debt)
 * @returns Remaining amount to be paid
 */
export function getRemainingAmount(entry: LedgerEntry): number {
  const totalPaid = getTotalPaid(entry);
  return Math.max(0, entry.amount - totalPaid);
}

/**
 * Deletes a transaction from the ledger.
 * If it's a debt, Supabase ON DELETE CASCADE will handle associated debt_payments.
 * @param id - The ledger entry ID to delete
 * @returns { success: true, error: null } on success, or { success: false, error } on failure.
 */
export async function deleteTransaction(id: string): Promise<{ success: boolean; error: unknown }> {
  if (!supabase) {
    return { success: false, error: new Error("Supabase client not initialized") };
  }

  if (!id) {
    return { success: false, error: new Error("Transaction ID is required") };
  }

  try {
    // First check if the entry exists
    const { data: existing, error: fetchError } = await supabase
      .from("ledger")
      .select("id, transaction_type")
      .eq("id", id)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError };
    }

    if (!existing) {
      return { success: false, error: new Error("Transaction not found") };
    }

    // Delete the transaction (CASCADE will handle debt_payments if it's a debt)
    const { error: deleteError } = await supabase
      .from("ledger")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return { success: false, error: deleteError };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Updates a transaction in the ledger.
 * Allows updating item_name, category, amount, and created_at (date).
 * NOTE: For debts, changing the amount won't affect payments already recorded.
 * @param id - The ledger entry ID to update
 * @param updates - Partial updates to apply
 * @returns { success: true, error: null } on success, or { success: false, error } on failure.
 */
export async function updateTransaction(
  id: string,
  updates: {
    item_name?: string;
    category?: string;
    amount?: number;
    created_at?: string;
    entity_name?: string;
  }
): Promise<{ success: boolean; error: unknown }> {
  if (!supabase) {
    return { success: false, error: new Error("Supabase client not initialized") };
  }

  if (!id) {
    return { success: false, error: new Error("Transaction ID is required") };
  }

  if (!updates || Object.keys(updates).length === 0) {
    return { success: false, error: new Error("No updates provided") };
  }

  try {
    // First check if the entry exists
    const { data: existing, error: fetchError } = await supabase
      .from("ledger")
      .select("id, transaction_type")
      .eq("id", id)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError };
    }

    if (!existing) {
      return { success: false, error: new Error("Transaction not found") };
    }

    // Build the update object with only provided fields
    const updateData: any = {};

    if (updates.item_name !== undefined) {
      updateData.item_name = updates.item_name;
    }
    if (updates.category !== undefined) {
      updateData.category = updates.category;
    }
    if (updates.amount !== undefined) {
      updateData.amount = updates.amount;
    }
    if (updates.created_at !== undefined) {
      updateData.created_at = updates.created_at;
    }
    if (updates.entity_name !== undefined) {
      updateData.entity_name = updates.entity_name;
    }

    // Perform the update
    const { error: updateError } = await supabase
      .from("ledger")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      return { success: false, error: updateError };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
}
