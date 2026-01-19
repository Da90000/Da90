"use client";

import { CalendarClock, History, Home, LogOut, Package, PieChart, ShoppingCart, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ViewMode } from "@/lib/types";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  shoppingListCount: number;
}

export function Header({ currentView, onViewChange, shoppingListCount }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 md:h-16 items-center justify-between">
            {/* Logo/Title — on mobile this is the only header content */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent">
                <ShoppingCart className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-foreground">
                ShopList Pro
              </span>
            </div>

            {/* Desktop nav — hidden on mobile (< md) */}
            <nav className="hidden md:flex items-center gap-1 rounded-lg bg-secondary p-1">
              <button
                type="button"
                onClick={() => onViewChange("dashboard")}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors active:scale-95 min-h-[44px] ${
                  currentView === "dashboard"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Home className="h-4 w-4" />
                Home
              </button>
              <button
                type="button"
                onClick={() => onViewChange("inventory")}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors active:scale-95 min-h-[44px] ${
                  currentView === "inventory"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Package className="h-4 w-4" />
                Master Inventory
              </button>
              <button
                type="button"
                onClick={() => onViewChange("market")}
                className={`relative flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors active:scale-95 min-h-[44px] ${
                  currentView === "market"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShoppingCart className="h-4 w-4" />
                Market Mode
                {shoppingListCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {shoppingListCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onViewChange("expenses")}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors active:scale-95 min-h-[44px] ${
                  currentView === "expenses"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="h-4 w-4" />
                Expenses
              </button>
              <button
                type="button"
                onClick={() => onViewChange("maintenance")}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors active:scale-95 min-h-[44px] ${
                  currentView === "maintenance"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Wrench className="h-4 w-4" />
                Maintenance
              </button>
              <button
                type="button"
                onClick={() => onViewChange("bills")}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors active:scale-95 min-h-[44px] ${
                  currentView === "bills"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarClock className="h-4 w-4" />
                Bills
              </button>
              <button
                type="button"
                onClick={() => onViewChange("analytics")}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors active:scale-95 min-h-[44px] ${
                  currentView === "analytics"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <PieChart className="h-4 w-4" />
                Analytics
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground min-h-[44px]"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <MobileNav
        currentView={currentView}
        onViewChange={onViewChange}
        shoppingListCount={shoppingListCount}
      />
    </>
  );
}

