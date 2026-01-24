"use client";

import { useState } from "react";
import { CalendarClock, Grid3x3, BookOpen, Home, LogOut, Package, PieChart, Search, Settings, ShoppingCart, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ViewMode } from "@/lib/types";
import { GlobalSearch } from "@/components/global-search";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  shoppingListCount: number;
}

// Primary tabs (always visible in bottom bar)
const PRIMARY_TABS: { view: ViewMode; icon: typeof Home; label: string }[] = [
  { view: "dashboard", icon: Home, label: "Home" },
  { view: "inventory", icon: Package, label: "Inventory" },
  { view: "market", icon: ShoppingCart, label: "Shop" },
  { view: "expenses", icon: BookOpen, label: "Ledger" },
];

// Secondary tabs (shown in the "More" sheet)
const SECONDARY_TABS: { view: ViewMode; icon: typeof Home; label: string }[] = [

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
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleSecondaryItemClick = (view: ViewMode) => {
    onViewChange(view);
    setMoreOpen(false); // Auto-close the sheet when item is selected
  };

  return (
    <>
      <GlobalSearch
        isOpen={searchOpen}
        onOpenChange={setSearchOpen}
        onNavigate={onViewChange}
      />

      {/* Bottom Navigation Bar - Pailo Floating Island */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t border-border bg-background/80 px-2 py-2 backdrop-blur-lg"
        role="navigation"
        aria-label="Main"
      >
        {/* Primary tabs */}
        {PRIMARY_TABS.map(({ view, icon: Icon, label }) => {
          const isActive = currentView === view;
          return (
            <button
              key={view}
              type="button"
              onClick={() => onViewChange(view)}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 p-2 transition-colors"
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
            >
              <div className={`relative ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className="h-6 w-6" aria-hidden />
                {view === "market" && shoppingListCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive border-[1.5px] border-background px-1 text-[10px] font-medium text-destructive-foreground">
                    {shoppingListCount > 99 ? "99+" : shoppingListCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </button>
          );
        })}

        {/* Menu button */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="relative flex flex-1 flex-col items-center justify-center gap-1 p-2 transition-colors"
          aria-label="More options"
        >
          <div className={`relative ${moreOpen || SECONDARY_TABS.some(tab => tab.view === currentView)
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
            }`}>
            <Grid3x3 className="h-6 w-6" aria-hidden />
          </div>
          <span className={`text-[10px] font-medium ${moreOpen || SECONDARY_TABS.some(tab => tab.view === currentView) ? "text-foreground" : "text-muted-foreground"}`}>
            More
          </span>
        </button>
      </nav>

      {/* "More" Sheet - Secondary Items */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-auto pb-8">
          <SheetHeader>
            <SheetTitle>More Options</SheetTitle>
          </SheetHeader>

          <div className="grid grid-cols-4 gap-4 py-6">
            {SECONDARY_TABS.map(({ view, icon: Icon, label }) => {
              const isActive = currentView === view;
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => handleSecondaryItemClick(view)}
                  className={`flex flex-col items-center justify-center gap-2 rounded-lg p-4 transition-colors ${isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "hover:bg-secondary/50 text-foreground"
                    }`}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={label}
                >
                  <Icon className="h-6 w-6" aria-hidden />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
