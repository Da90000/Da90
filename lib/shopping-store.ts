import type { InventoryItem, ShoppingListItem } from "./types";
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
    console.error("Supabase fetch error:", error);
    return [];
  }
  if (!data) return [];

  // Map snake_case columns to camelCase and convert dates
  return data.map((item: any) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    basePrice: parseFloat(item.base_price) || 0,
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
    console.error("Supabase insert error:", error);
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
    console.error("Supabase delete error:", error);
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
  const payload = items.map((item) => ({
    item_name: item.name,
    category: item.category,
    quantity: item.quantity,
    amount: item.basePrice * item.quantity, // Total amount paid
    created_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase.from("ledger").insert(payload).select();

  if (error) {
    console.error("Supabase ledger insert error:", error);
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
    console.error("Failed to sync inventory item to Supabase:", error);
  });
  
  return newItem;
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
    console.error("Failed to sync inventory deletion to Supabase:", error);
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
  inventoryItem: InventoryItem
): ShoppingListItem {
  const shoppingList = getShoppingList();
  const existing = shoppingList.find(
    (item) => item.inventoryItemId === inventoryItem.id
  );

  if (existing) {
    existing.quantity += 1;
    saveShoppingList(shoppingList);
    return existing;
  }

  const newItem: ShoppingListItem = {
    id: crypto.randomUUID(),
    inventoryItemId: inventoryItem.id,
    name: inventoryItem.name,
    category: inventoryItem.category,
    basePrice: inventoryItem.basePrice,
    quantity: 1,
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
  const item = shoppingList.find((item) => item.id === id);
  if (item) {
    item.purchased = !item.purchased;
    saveShoppingList(shoppingList);
  }
}

export function updateQuantity(id: string, quantity: number): void {
  const shoppingList = getShoppingList();
  const item = shoppingList.find((item) => item.id === id);
  if (item) {
    item.quantity = Math.max(1, quantity);
    saveShoppingList(shoppingList);
  }
}

export function clearShoppingList(): void {
  saveShoppingList([]);
}
