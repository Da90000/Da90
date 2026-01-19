"use client";

import { useState } from "react";
import { CalendarClock, History, Home, LogOut, Package, PieChart, Search, Settings, ShoppingCart, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ViewMode } from "@/lib/types";
import { GlobalSearch } from "@/components/global-search";
import { createClient } from "@/lib/supabase/client";

interface MobileNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  shoppingListCount: number;
}

const TABS: { view: ViewMode; icon: typeof Home; label: string }[] = [
  { view: "dashboard", icon: Home, label: "Home" },
  { view: "inventory", icon: Package, label: "Inventory" },
  { view: "market", icon: ShoppingCart, label: "Shop" },
  { view: "expenses", icon: History, label: "Expenses" },
  { view: "analytics", icon: PieChart, label: "Analytics" },
  { view: "maintenance", icon: Wrench, label: "Maintenance" },
  { view: "bills", icon: CalendarClock, label: "Bills" },
  { view: "settings", icon: Settings, label: "Settings" },
];

export function MobileNav({
  currentView,
  onViewChange,
  shoppingListCount,
}: MobileNavProps) {
  const router = useRouter();
  const supabase = createClient();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <GlobalSearch
        isOpen={searchOpen}
        onOpenChange={setSearchOpen}
        onNavigate={onViewChange}
      />
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] supports-[backdrop-filter]:bg-background/80"
        role="navigation"
        aria-label="Main"
      >
      {TABS.map(({ view, icon: Icon, label }) => (
        <button
          key={view}
          type="button"
          onClick={() => onViewChange(view)}
          className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-2 py-2 text-xs font-medium transition-all active:scale-95 ${
            currentView === view
              ? "text-primary"
              : "text-muted-foreground"
          }`}
          aria-current={currentView === view ? "page" : undefined}
          aria-label={label}
        >
          <span className="relative inline-flex">
            <Icon className="h-5 w-5" aria-hidden />
            {view === "market" && shoppingListCount > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {shoppingListCount > 99 ? "99+" : shoppingListCount}
              </span>
            )}
          </span>
          <span>{label}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-2 py-2 text-xs font-medium transition-all active:scale-95 ${
          searchOpen
            ? "text-primary"
            : "text-muted-foreground"
        }`}
        aria-label="Search"
      >
        <Search className="h-5 w-5" aria-hidden />
        <span>Search</span>
      </button>
      <button
        type="button"
        onClick={handleLogout}
        className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-2 py-2 text-xs font-medium transition-all active:scale-95 text-muted-foreground"
        aria-label="Log out"
      >
        <LogOut className="h-5 w-5" aria-hidden />
        <span>Logout</span>
      </button>
    </nav>
    </>
  );
}
