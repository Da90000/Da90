"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import { BillTracker } from "@/components/bill-tracker";
import { BottomNav } from "@/components/bottom-nav";
import { DashboardView } from "@/components/dashboard-view";
import { Header } from "@/components/header";
import { LedgerHistory } from "@/components/ledger-history";
import { MaintenanceTracker } from "@/components/maintenance-tracker";
import { MasterInventory } from "@/components/master-inventory";
import { MarketMode } from "@/components/market-mode";
import { SettingsView } from "@/components/settings-view";
import { Spinner } from "@/components/ui/spinner";
import type { ViewMode, InventoryItem, ShoppingListItem } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import {
  getInventory,
  saveInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getShoppingList,
  addToShoppingList,
  removeFromShoppingList,
  togglePurchased,
  updateQuantity,
  updateItemPrice,
  clearShoppingList,
  fetchInventoryFromSupabase,
  addInventoryItemToSupabase,
} from "@/lib/shopping-store";

export default function ShopListApp() {
  const router = useRouter();
  const supabase = createClient();
  const [currentView, setCurrentView] = useState<ViewMode>("dashboard");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }
        setIsCheckingAuth(false);
      } catch (error) {
        console.error("Failed to check auth:", error);
        router.push("/login");
      }
    };

    checkAuth();
  }, [router, supabase.auth]);

  // Load data from database on mount (only after auth is confirmed)
  useEffect(() => {
    if (isCheckingAuth) return;

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
      } catch (error) {
        console.error("Failed to load inventory from database:", error);
        // Fallback to localStorage on error
        setInventory(getInventory());
      } finally {
        setIsLoaded(true);
      }

      // Always load shopping list from localStorage, regardless of database fetch success/failure
      // This ensures shopping list is restored even if database fetch fails
      setShoppingList(getShoppingList());
    };

    loadData();
  }, [isCheckingAuth]);

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

  const handleEditItem = useCallback(async (id: string, updates: { name: string; category: string; basePrice: number }) => {
    try {
      // Update locally first for instant UI feedback
      updateInventoryItem(id, updates);

      // Update the UI state
      setInventory((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, name: updates.name, category: updates.category, basePrice: updates.basePrice }
            : item
        )
      );
    } catch (error) {
      console.error("Failed to update item:", error);
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

  const handleUpdatePrice = useCallback((id: string, price: number | undefined) => {
    updateItemPrice(id, price);
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

  const handleNavigate = useCallback((mode: ViewMode) => {
    setCurrentView(mode);
  }, []);

  if (isCheckingAuth || !isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <p className="text-muted-foreground">
            {isCheckingAuth ? "Checking authentication..." : "Loading inventory..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hide old header on dashboard - new dashboard has its own */}
      {currentView !== "dashboard" && (
        <Header
          currentView={currentView}
          onViewChange={setCurrentView}
          shoppingListCount={shoppingList.length}
        />
      )}

      {/* Adjust padding for dashboard view */}
      <main className={currentView === "dashboard" ? "" : "mx-auto max-w-7xl px-4 pt-4 pb-24 sm:px-6 md:pb-8 lg:px-8"}>
        {currentView === "dashboard" && (
          <DashboardView onNavigate={handleNavigate} />
        )}
        {currentView === "inventory" && (
          <MasterInventory
            inventory={inventory}
            shoppingList={shoppingList}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onAddToCart={handleAddToCart}
          />
        )}
        {currentView === "market" && (
          <MarketMode
            shoppingList={shoppingList}
            onTogglePurchased={handleTogglePurchased}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdatePrice={handleUpdatePrice}
            onRemoveItem={handleRemoveItem}
            onClearList={handleClearList}
            onGoToInventory={handleGoToInventory}
          />
        )}
        {currentView === "expenses" && <LedgerHistory />}

        {currentView === "maintenance" && <MaintenanceTracker />}
        {currentView === "bills" && <BillTracker />}
        {currentView === "settings" && <SettingsView />}
      </main>

      <BottomNav
        currentView={currentView}
        onViewChange={setCurrentView}
        shoppingListCount={shoppingList.length}
      />
    </div>
  );
}
