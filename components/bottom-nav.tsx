"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
    Home,
    Package,
    ShoppingBag,
    BookOpen,
    Menu,
    CalendarClock,
    PieChart,
    Settings,
    Wrench,
    LogOut,
    TrendingDown
} from "lucide-react";
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

export function BottomNav({ currentView, onViewChange, shoppingListCount }: BottomNavProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleNavigation = (view: string) => {
        onViewChange(view as ViewMode);
        setMenuOpen(false);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    // Menu Groups Definition
    const MENU_GROUPS = [
        {
            title: "Financial Tools",
            items: [
                { id: "analytics", label: "Analytics", icon: PieChart },
                { id: "expenses", label: "Ledger", icon: BookOpen },
                { id: "bills", label: "Bills", icon: CalendarClock },
            ]
        },
        {
            title: "Asset Management",
            items: [
                { id: "maintenance", label: "Maintenance", icon: Wrench },
                { id: "inventory", label: "Inventory", icon: Package },
            ]
        },
        {
            title: "System & Account",
            items: [
                { id: "settings", label: "Settings", icon: Settings },
                { id: "logout", label: "Log Out", icon: LogOut, isAction: true, onClick: handleSignOut },
            ]
        }
    ];

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
                            menuOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Menu className="h-6 w-6" />
                        <span className="text-[10px] font-medium">Menu</span>
                    </button>
                </nav>
            </div>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetContent side="bottom" className="bg-card w-full rounded-t-[1.5rem] border-t border-border/50 max-h-[85vh] overflow-y-auto px-4 pb-8 pt-6">
                    <SheetHeader className="mb-4 px-2 text-left border-none">
                        <SheetTitle className="text-xl font-bold text-foreground">Menu</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-6 px-1">
                        {MENU_GROUPS.map((group, groupIndex) => (
                            <div key={groupIndex}>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 pl-2 opacity-70">
                                    {group.title}
                                </p>
                                <ul className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = currentView === item.id;
                                        const isLogout = item.id === "logout";

                                        return (
                                            <li key={item.id}>
                                                <button
                                                    onClick={() => {
                                                        // @ts-ignore - Dynamic item handling
                                                        item.isAction ? item.onClick?.() : handleNavigation(item.id);
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center gap-3.5 p-3 rounded-xl transition-all duration-200 text-left",
                                                        isActive && !isLogout && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium",
                                                        !isActive && !isLogout && "hover:bg-muted/50 text-foreground/90 hover:text-foreground",
                                                        isLogout && "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
                                                        isActive && !isLogout ? "bg-emerald-500/20" : "bg-muted/30",
                                                        isLogout && "bg-red-500/10"
                                                    )}>
                                                        <item.icon className={cn(
                                                            "w-5 h-5",
                                                            isActive && !isLogout ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                                                            isLogout && "text-current"
                                                        )} strokeWidth={2} />
                                                    </div>
                                                    <span className={cn(
                                                        "text-sm tracking-tight",
                                                        isActive ? "font-bold" : "font-medium"
                                                    )}>
                                                        {item.label}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
