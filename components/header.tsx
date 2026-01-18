"use client";

import { Package, ShoppingCart } from "lucide-react";
import type { ViewMode } from "@/lib/types";

interface HeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  shoppingListCount: number;
}

export function Header({ currentView, onViewChange, shoppingListCount }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
              <ShoppingCart className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">
              ShopList Pro
            </span>
          </div>

          <nav className="flex items-center gap-1 rounded-lg bg-secondary p-1">
            <button
              type="button"
              onClick={() => onViewChange("inventory")}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                currentView === "inventory"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Master Inventory</span>
              <span className="sm:hidden">Inventory</span>
            </button>
            <button
              type="button"
              onClick={() => onViewChange("market")}
              className={`relative flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                currentView === "market"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Market Mode</span>
              <span className="sm:hidden">Market</span>
              {shoppingListCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  {shoppingListCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
