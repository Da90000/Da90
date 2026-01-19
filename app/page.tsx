"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { MasterInventory } from "@/components/master-inventory";
import { MarketMode } from "@/components/market-mode";
import { Spinner } from "@/components/ui/spinner";
import type { ViewMode, InventoryItem, ShoppingListItem } from "@/lib/types";
import {
  getInventory,
  saveInventory,
  addInventoryItem,
  deleteInventoryItem,
  getShoppingList,
  addToShoppingList,
  removeFromShoppingList,
  togglePurchased,
  updateQuantity,
  clearShoppingList,
  fetchInventoryFromSupabase,
  addInventoryItemToSupabase,
} from "@/lib/shopping-store";

export default function ShopListApp() {
  const [currentView, setCurrentView] = useState<ViewMode>("inventory");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from database on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const dbInventory = await fetchInventoryFromSupabase();
        if (dbInventory.length > 0) {
          // If we have data from database, use it and sync to localStorage
          setInventory(dbInventory);
          saveInventory(dbInventory);
        } else {
          // Fallback to localStorage if database is empty
          setInventory(getInventory());
        }
        setShoppingList(getShoppingList());
      } catch (error) {
        console.error("Failed to load inventory from database:", error);
        // Fallback to localStorage on error
        setInventory(getInventory());
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadData();
  }, []);

  // Inventory handlers
  const handleAddItem = useCallback(async (item: { name: string; category: string; basePrice: number }) => {
    try {
      // Generate ID for the item
      const id = crypto.randomUUID();
      
      // Insert into database first
      const dbItem = await addInventoryItemToSupabase(item, id);
      
      if (dbItem) {
        // Database insertion successful - update local storage and UI
        const inventory = getInventory();
        inventory.push(dbItem);
        saveInventory(inventory);
        setInventory([...inventory]);
      } else {
        // Database insertion failed - fallback to local storage only
        console.warn("Database insertion failed, using local storage only");
        const newItem = addInventoryItem(item);
        setInventory((prev) => [...prev, newItem]);
      }
    } catch (error) {
      console.error("Failed to add item to database:", error);
      // Fallback to local storage on error
      const newItem = addInventoryItem(item);
      setInventory((prev) => [...prev, newItem]);
    }
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    deleteInventoryItem(id);
    setInventory((prev) => prev.filter((item) => item.id !== id));
    // Also remove from shopping list if present
    const shoppingItems = getShoppingList();
    const updated = shoppingItems.filter((item) => item.inventoryItemId !== id);
    if (updated.length !== shoppingItems.length) {
      clearShoppingList();
      for (const item of updated) {
        addToShoppingList({
          id: item.inventoryItemId,
          name: item.name,
          category: item.category,
          basePrice: item.basePrice,
          createdAt: new Date(),
        });
      }
      setShoppingList(getShoppingList());
    }
  }, []);

  // Shopping list handlers
  const handleAddToCart = useCallback((item: InventoryItem) => {
    addToShoppingList(item);
    setShoppingList(getShoppingList());
  }, []);

  const handleTogglePurchased = useCallback((id: string) => {
    togglePurchased(id);
    setShoppingList(getShoppingList());
  }, []);

  const handleUpdateQuantity = useCallback((id: string, qty: number) => {
    updateQuantity(id, qty);
    setShoppingList(getShoppingList());
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    removeFromShoppingList(id);
    setShoppingList(getShoppingList());
  }, []);

  const handleClearList = useCallback(() => {
    clearShoppingList();
    setShoppingList([]);
  }, []);

  const handleGoToInventory = useCallback(() => {
    setCurrentView("inventory");
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        shoppingListCount={shoppingList.length}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {currentView === "inventory" ? (
          <MasterInventory
            inventory={inventory}
            shoppingList={shoppingList}
            onAddItem={handleAddItem}
            onDeleteItem={handleDeleteItem}
            onAddToCart={handleAddToCart}
          />
        ) : (
          <MarketMode
            shoppingList={shoppingList}
            onTogglePurchased={handleTogglePurchased}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearList={handleClearList}
            onGoToInventory={handleGoToInventory}
          />
        )}
      </main>
    </div>
  );
}
