export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  lastPaidPrice?: number; // Last price paid when purchased (optional)
  createdAt: Date;
}

export interface ShoppingListItem {
  id: string;
  inventoryItemId: string;
  name: string;
  category: string;
  /** Immutable original budget from inventory. Used for Budget. */
  basePrice: number;
  /** What the user types in the store; overrides basePrice for totals/ledger. */
  manualPrice?: number;
  quantity: number;
  purchased: boolean;
}

export type ViewMode = "inventory" | "market" | "expenses" | "maintenance" | "dashboard" | "bills" | "analytics" | "settings";

export const CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat & Seafood",
  "Bakery",
  "Frozen",
  "Pantry",
  "Beverages",
  "Snacks",
  "Household",
  "Personal Care",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
