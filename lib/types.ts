export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  createdAt: Date;
}

export interface ShoppingListItem {
  id: string;
  inventoryItemId: string;
  name: string;
  category: string;
  basePrice: number;
  quantity: number;
  purchased: boolean;
}

export type ViewMode = "inventory" | "market";

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
