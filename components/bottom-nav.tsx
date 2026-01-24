"use client";

import { useState } from "react";
import { Home, Package, ShoppingBag, BookOpen, Menu, CalendarClock, PieChart, Settings, Wrench } from "lucide-react";
import type { ViewMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

interface BottomNavProps {
    currentView: ViewMode;
    onViewChange: (view: ViewMode) => void;
    shoppingListCount: number;
}

const PRIMARY_TABS = [
    { id: "dashboard", label: "Home", icon: Home },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "market", label: "Shop", icon: ShoppingBag },
    { id: "expenses", label: "Ledger", icon: BookOpen },
];

const SECONDARY_TABS = [

    { id: "maintenance", label: "Maintenance", icon: Wrench },
    { id: "bills", label: "Bills", icon: CalendarClock },
    { id: "settings", label: "Settings", icon: Settings },
];

export function BottomNav({ currentView, onViewChange, shoppingListCount }: BottomNavProps) {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleSecondaryClick = (view: string) => {
        onViewChange(view as ViewMode);
        setMenuOpen(false);
    };

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
                <nav className="flex items-center justify-around h-16">
                    {PRIMARY_TABS.map((tab) => {
                        const isActive = currentView === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onViewChange(tab.id as ViewMode)}
                                className={cn(
                                    "flex flex-col items-center justify-center w-full h-full gap-1",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <div className="relative">
                                    <tab.icon className={cn("h-6 w-6")} />
                                    {tab.id === "market" && shoppingListCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                                            {shoppingListCount}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-medium">{tab.label}</span>
                            </button>
                        );
                    })}

                    <button
                        onClick={() => setMenuOpen(true)}
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-full gap-1",
                            menuOpen || SECONDARY_TABS.some(t => t.id === currentView) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Menu className="h-6 w-6" />
                        <span className="text-[10px] font-medium">Menu</span>
                    </button>
                </nav>
            </div>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetContent side="bottom" className="pb-8">
                    <SheetHeader>
                        <SheetTitle>Menu</SheetTitle>
                    </SheetHeader>
                    <div className="grid grid-cols-4 gap-4 py-6">
                        {SECONDARY_TABS.map((tab) => {
                            const isActive = currentView === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleSecondaryClick(tab.id)}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-2 rounded-lg p-4 transition-colors",
                                        isActive ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                    )}
                                >
                                    <tab.icon className="h-6 w-6" />
                                    <span className="text-xs font-medium">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
