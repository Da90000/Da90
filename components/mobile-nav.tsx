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
      
      {/* Bottom Navigation Bar - Primary Items + Menu */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] supports-[backdrop-filter]:bg-background/80"
        role="navigation"
        aria-label="Main"
      >
        {/* Primary tabs */}
        {PRIMARY_TABS.map(({ view, icon: Icon, label }) => (
          <button
            key={view}
            type="button"
            onClick={() => onViewChange(view)}
            className={`flex flex-1 min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-2 py-2 text-xs font-medium transition-all active:scale-95 ${
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

        {/* Menu button - Opens the "More" sheet */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-1 min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-2 py-2 text-xs font-medium transition-all active:scale-95 ${
            moreOpen || SECONDARY_TABS.some(tab => tab.view === currentView)
              ? "text-primary"
              : "text-muted-foreground"
          }`}
          aria-label="More options"
        >
          <Grid3x3 className="h-5 w-5" aria-hidden />
          <span>Menu</span>
        </button>
      </nav>

      {/* "More" Sheet - Secondary Items */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] pb-[env(safe-area-inset-bottom)]">
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
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg transition-all active:scale-95 ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={label}
                >
                  <Icon className="h-7 w-7" aria-hidden />
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
