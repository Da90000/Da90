import type { InventoryItem, ShoppingListItem } from "./types";
import { convertQuantity } from "./unit-conversions";
import { supabase } from "@/lib/supabase";

/**
 * Fetch all inventory items from Supabase.
 * Returns InventoryItem[] (dates converted as Date).
 */
export async function fetchInventoryFromSupabase(): Promise<InventoryItem[]> {
  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping fetch.");
    return [];
  }

  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
    console.error("Supabase fetch error:", errorMsg);
    return [];
  }
  if (!data) return [];

  // Map snake_case columns to camelCase and convert dates
  return data.map((item: any) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    basePrice: parseFloat(item.base_price) || 0,
    unit: item.unit,
    lastPaidPrice: item.last_paid_price ? parseFloat(item.last_paid_price) : undefined,
    createdAt: new Date(item.created_at),
  })) as InventoryItem[];
}

/**
 * Add a new inventory item to the Supabase 'inventory' table.
 * Returns the created InventoryItem (dates as Date).
 * If id is provided, it will be used as the item's ID in Supabase.
 */
export async function addInventoryItemToSupabase(
  item: Omit<InventoryItem, "id" | "createdAt">,
  id?: string
): Promise<InventoryItem | null> {
  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping sync.");
    return null;
  }

  // Map camelCase to snake_case for Supabase schema
  const payload: any = {
    name: item.name,
    category: item.category,
    base_price: item.basePrice,
    unit: item.unit,
    created_at: new Date().toISOString(),
  };

  // Include ID if provided to keep local and Supabase IDs in sync
  if (id) {
    payload.id = id;
  }

  const { data, error } = await supabase
    .from("inventory")
    .insert(payload)
    .select()
    .single();

  if (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
    console.error("Supabase insert error:", errorMsg);
    return null;
  }

  if (!data) {
    console.error("Supabase insert returned no data");
    return null;
  }

  // Map snake_case back to camelCase
  return {
    id: data.id,
    name: data.name,
    category: data.category,
    basePrice: parseFloat(data.base_price) || 0,
    unit: data.unit,
    lastPaidPrice: data.last_paid_price ? parseFloat(data.last_paid_price) : undefined,
    createdAt: new Date(data.created_at),
  } as InventoryItem;
}

/**
 * Remove inventory item from the Supabase 'inventory' table.
 */
export async function deleteInventoryItemFromSupabase(id: string): Promise<boolean> {
  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping sync.");
    return false;
  }

  const { error } = await supabase.from("inventory").delete().eq("id", id);

  if (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
    console.error("Supabase delete error:", errorMsg);
    return false;
  }

  return true;
}

/**
 * Add purchased shopping items to the Supabase 'ledger' table.
 * Expects items to be ShoppingListItem[].
 * Returns array of inserted rows, or null if error.
 * You can modify this to set custom fields in your ledger schema.
 */
export async function addToLedger(
  items: ShoppingListItem[]
): Promise<any[] | null> {
  if (!items.length) return [];

  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping sync.");
    return null;
  }

  // Map ShoppingListItem to ledger schema: item_name, category, quantity, amount
  const payload = items.map((item) => {
    const price = item.manualPrice ?? item.basePrice;
    return {
      item_name: item.name,
      category: item.category,
      quantity: item.quantity,
      amount: price * item.quantity,
      created_at: new Date().toISOString(),
    };
  });

  const { data, error } = await supabase.from("ledger").insert(payload).select();

  if (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
    console.error("Supabase ledger insert error:", errorMsg);
    return null;
  }

  return data;
}

/**
 * The following INVENTORY operations use local storage for instant UI updates.
 * You can optionally sync these with Supabase using the async functions above.
 */

// --- Local State (to sync with UI instantly) ---
const INVENTORY_KEY = "shoplist-inventory";
const SHOPPING_LIST_KEY = "shoplist-shopping";

export function getInventory(): InventoryItem[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(INVENTORY_KEY);
  if (!stored) return [];
  const parsed = JSON.parse(stored);
  // Convert date strings back to Date objects
  return parsed.map((item: any) => ({
    ...item,
    createdAt: new Date(item.createdAt),
  }));
}

export function saveInventory(items: InventoryItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
}

/**
 * Add inventory item locally (synchronous version for UI updates).
 * Also syncs to Supabase in the background.
 */
export function addInventoryItem(
  item: Omit<InventoryItem, "id" | "createdAt">
): InventoryItem {
  const inventory = getInventory();
  const newItem: InventoryItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  inventory.push(newItem);
  saveInventory(inventory);

  // Sync to Supabase in the background (using the same ID for consistency)
  addInventoryItemToSupabase(item, newItem.id).catch((error) => {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
    console.error("Failed to sync inventory item to Supabase:", errorMsg);
  });

  return newItem;
}

/**
 * Update inventory item in Supabase.
 * Updates name, category, and base_price (but NOT last_paid_price).
 */
export async function updateInventoryItemInSupabase(
  id: string,
  updates: { name: string; category: string; basePrice: number; unit?: string }
): Promise<InventoryItem | null> {
  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping sync.");
    return null;
  }

  const payload: any = {
    name: updates.name,
    category: updates.category,
    base_price: updates.basePrice,
    unit: updates.unit,
  };

  const { data, error } = await supabase
    .from("inventory")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
    console.error("Supabase update error:", errorMsg);
    return null;
  }

  if (!data) {
    console.error("Supabase update returned no data");
    return null;
  }

  // Map snake_case back to camelCase
  return {
    id: data.id,
    name: data.name,
    category: data.category,
    basePrice: parseFloat(data.base_price) || 0,
    unit: data.unit,
    lastPaidPrice: data.last_paid_price ? parseFloat(data.last_paid_price) : undefined,
    createdAt: new Date(data.created_at),
  } as InventoryItem;
}

/**
 * Update inventory item locally (synchronous version for UI updates).
 * Also syncs to Supabase in the background.
 * Only updates name, category, and basePrice - preserves lastPaidPrice.
 */
export function updateInventoryItem(
  id: string,
  updates: { name: string; category: string; basePrice: number; unit?: string }
): void {
  const inventory = getInventory();
  const item = inventory.find((item) => item.id === id);
  if (!item) return;

  // Update the item while preserving lastPaidPrice
  item.name = updates.name;
  item.category = updates.category;
  item.basePrice = updates.basePrice;
  if (updates.unit) item.unit = updates.unit;
  // lastPaidPrice is preserved automatically

  saveInventory(inventory);

  // Sync to Supabase in the background
  updateInventoryItemInSupabase(id, updates).catch((error) => {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
    console.error("Failed to sync inventory update to Supabase:", errorMsg);
  });
}

/**
 * Delete inventory item locally (synchronous version for UI updates).
 * Also syncs to Supabase in the background.
 */
export function deleteInventoryItem(id: string): void {
  const inventory = getInventory();
  const filtered = inventory.filter((item) => item.id !== id);
  saveInventory(filtered);

  // Sync to Supabase in the background
  deleteInventoryItemFromSupabase(id).catch((error) => {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
    console.error("Failed to sync inventory deletion to Supabase:", errorMsg);
  });
}

/**
 * The following SHOPPING LIST operations remain local by default (for UI/instant updates).
 * You can optionally also sync these with Supabase if you want a multi-device experience.
 */

export function getShoppingList(): ShoppingListItem[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(SHOPPING_LIST_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveShoppingList(items: ShoppingListItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(items));
}

export function addToShoppingList(
  inventoryItem: InventoryItem,
  options?: { quantity?: number; unit?: string }
): ShoppingListItem {
  const shoppingList = getShoppingList();
  const existing = shoppingList.find(
    (item) => item.inventoryItemId === inventoryItem.id
  );

  const quantity = options?.quantity ?? 1;
  const selectedUnit = options?.unit ?? inventoryItem.unit ?? "pc";
  const baseUnit = inventoryItem.unit ?? "pc";

  // Calculate converted quantity for price calculation
  const convertedQty = selectedUnit === baseUnit
    ? quantity
    : (convertQuantity(quantity, selectedUnit, baseUnit) ?? quantity);

  if (existing) {
    existing.quantity += quantity;
    existing.unit = selectedUnit;
    existing.convertedQuantity = (existing.convertedQuantity ?? existing.quantity) + convertedQty;
    saveShoppingList(shoppingList);
    return existing;
  }

  const newItem: ShoppingListItem = {
    id: crypto.randomUUID(),
    inventoryItemId: inventoryItem.id,
    name: inventoryItem.name,
    category: inventoryItem.category,
    basePrice: inventoryItem.basePrice,
    lastPaidPrice: inventoryItem.lastPaidPrice,
    quantity,
    unit: selectedUnit,
    baseUnit,
    convertedQuantity: convertedQty,
    purchased: false,
  };
  shoppingList.push(newItem);
  saveShoppingList(shoppingList);
  return newItem;
}

export function removeFromShoppingList(id: string): void {
  const shoppingList = getShoppingList();
  const filtered = shoppingList.filter((item) => item.id !== id);
  saveShoppingList(filtered);
}

export function togglePurchased(id: string): void {
  const shoppingList = getShoppingList();
  const index = shoppingList.findIndex((item) => item.id === id);
  if (index !== -1) {
    const item = shoppingList[index];
    item.purchased = !item.purchased;

    // Remove item from current position
    shoppingList.splice(index, 1);

    if (item.purchased) {
      // Move to bottom if purchased
      shoppingList.push(item);
    } else {
      // Move to top if unpurchased
      shoppingList.unshift(item);
    }

    saveShoppingList(shoppingList);
  }
}

export function updateQuantity(id: string, quantity: number): void {
  const shoppingList = getShoppingList();
  const item = shoppingList.find((item) => item.id === id);
  if (item) {
    item.quantity = Math.max(1, quantity);

    // Recalculate converted quantity if units differ
    if (item.unit && item.baseUnit && item.unit !== item.baseUnit) {
      const converted = convertQuantity(item.quantity, item.unit, item.baseUnit);
      item.convertedQuantity = converted ?? item.quantity;
    } else {
      item.convertedQuantity = item.quantity;
    }

    saveShoppingList(shoppingList);
  }
}

/** Updates only manualPrice. Does not touch basePrice. Pass undefined to clear the override. */
export function updateItemPrice(id: string, price: number | undefined): void {
  const shoppingList = getShoppingList();
  const item = shoppingList.find((item) => item.id === id);
  if (!item) return;
  if (price === undefined) {
    delete item.manualPrice;
  } else if (Number.isFinite(price) && price >= 0) {
    item.manualPrice = price;
  }
  saveShoppingList(shoppingList);
}

export function updateItemUnit(id: string, unit: string): void {
  const shoppingList = getShoppingList();
  const item = shoppingList.find((item) => item.id === id);
  if (item) {
    item.unit = unit;

    // Recalculate converted quantity with new unit
    if (item.baseUnit && item.unit !== item.baseUnit) {
      const converted = convertQuantity(item.quantity, item.unit, item.baseUnit);
      item.convertedQuantity = converted ?? item.quantity;
    } else {
      item.convertedQuantity = item.quantity;
    }

    saveShoppingList(shoppingList);
  }
}

export function updateItemNote(id: string, note: string): void {
  const shoppingList = getShoppingList();
  const item = shoppingList.find((item) => item.id === id);
  if (item) {
    item.note = note;
    saveShoppingList(shoppingList);
  }
}

export function clearShoppingList(): void {
  saveShoppingList([]);
}
