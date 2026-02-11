"use client";

import { Link } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, ShoppingCart, Archive, LogOut } from "lucide-react";
import NextLink from "next/link";

export default function MorePage() {
    const menuItems = [
        {
            label: "Inventory",
            icon: Archive,
            href: "/inventory", // We'll need to handle this route or move Inventory logic
            description: "Manage your household items"
        },
        {
            label: "Market Mode",
            icon: ShoppingCart,
            href: "/market",
            description: "Shopping list and active runs"
        },
        {
            label: "Settings",
            icon: Settings,
            href: "/settings",
            description: "App preferences and profile"
        }
    ];

    return (
        <div className="bg-background min-h-screen pb-24">
            <div className="p-4 md:p-6 max-w-sm mx-auto space-y-6">
                <h1 className="text-2xl font-bold">More</h1>

                <div className="space-y-3">
                    {menuItems.map((item) => (
                        <NextLink href={item.href} key={item.label}>
                            <Card className="hover:bg-muted/50 transition-colors mb-3">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="p-2 bg-primary/10 rounded-full text-primary">
                                        <item.icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{item.label}</p>
                                        <p className="text-sm text-muted-foreground">{item.description}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </NextLink>
                    ))}
                </div>

                <div className="pt-6">
                    <button className="flex items-center gap-2 text-destructive font-medium hover:opacity-80">
                        <LogOut className="h-5 w-5" />
                        Sign Out
                    </button>
                </div>
            </div>
            <BottomNav />
        </div>
    );
}
