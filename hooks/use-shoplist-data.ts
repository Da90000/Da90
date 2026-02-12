"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { InventoryItem, ShoppingListItem } from "@/lib/types";
import {
    getInventory,
    saveInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    getShoppingList,
    saveShoppingList,
    addToShoppingList,
    removeFromShoppingList,
    togglePurchased,
    updateQuantity,
    updateItemPrice,
    updateItemUnit,
    updateItemNote,
    clearShoppingList,
    fetchInventoryFromSupabase,
    addInventoryItemToSupabase,
} from "@/lib/shopping-store";

export function useShopListData() {
    const router = useRouter();
    const supabase = createClient();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Check authentication state on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    if (window.location.search.includes('code=')) {
                        window.history.replaceState({}, '', window.location.pathname);
                    }
                    setIsCheckingAuth(false);
                    return;
                }

                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');

                if (code) {
                    const next = params.get('next') || '/';
                    router.push(`/auth/callback?code=${code}&next=${next}`);
                    return;
                } else {
                    router.push("/login");
                }
            } catch (error) {
                console.error("Failed to check auth:", error);
                router.push("/login");
            }
        };

        checkAuth();
    }, [router, supabase]);

    // Load data
    useEffect(() => {
        if (isCheckingAuth) return;

        const loadData = async () => {
            try {
                const dbInventory = await fetchInventoryFromSupabase();
                if (dbInventory.length > 0) {
                    setInventory(dbInventory);
                    saveInventory(dbInventory);
                } else {
                    setInventory(getInventory());
                }
            } catch (error) {
                console.error("Failed to load inventory:", error);
                setInventory(getInventory());
            } finally {
                setIsLoaded(true);
            }

            setShoppingList(getShoppingList());
        };

        loadData();
    }, [isCheckingAuth]);

    // Handlers
    const handleAddItem = useCallback(async (item: { name: string; category: string; basePrice: number; unit?: string }) => {
        try {
            const id = crypto.randomUUID();
            const dbItem = await addInventoryItemToSupabase(item, id);

            if (dbItem) {
                const currentInv = getInventory();
                currentInv.push(dbItem);
                saveInventory(currentInv);
                setInventory([...currentInv]);
            } else {
                const newItem = addInventoryItem(item);
                setInventory((prev) => [...prev, newItem]);
            }
        } catch (error) {
            const newItem = addInventoryItem(item);
            setInventory((prev) => [...prev, newItem]);
        }
    }, []);

    const handleEditItem = useCallback(async (id: string, updates: { name: string; category: string; basePrice: number; unit?: string }) => {
        try {
            updateInventoryItem(id, updates);
            setInventory((prev) =>
                prev.map((item) =>
                    item.id === id
                        ? { ...item, name: updates.name, category: updates.category, basePrice: updates.basePrice, unit: updates.unit }
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

        // Sync shopping list removal
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

    const handleUpdateUnit = useCallback((id: string, unit: string) => {
        updateItemUnit(id, unit);
        setShoppingList(getShoppingList());
    }, []);

    const handleUpdateNote = useCallback((id: string, note: string) => {
        updateItemNote(id, note);
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

    const handleReorder = useCallback((items: ShoppingListItem[]) => {
        saveShoppingList(items);
        setShoppingList(items);
    }, []);

    const handleRefreshInventory = async () => {
        try {
            const dbInventory = await fetchInventoryFromSupabase();
            if (dbInventory.length > 0) {
                setInventory(dbInventory);
                saveInventory(dbInventory);
            }
        } catch (error) {
            console.error("Failed to refresh inventory:", error);
        }
    };

    return {
        inventory,
        shoppingList,
        isLoaded,
        isCheckingAuth,
        handlers: {
            handleAddItem,
            handleEditItem,
            handleDeleteItem,
            handleAddToCart,
            handleTogglePurchased,
            handleUpdateQuantity,
            handleUpdatePrice,
            handleUpdateUnit,
            handleUpdateNote,
            handleRemoveItem,
            handleClearList,
            handleReorder,
            handleRefreshInventory
        }
    };
}
