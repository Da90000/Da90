"use client";
import { BottomNav } from "@/components/bottom-nav";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MarketPage() {
    return (
        <div className="bg-background min-h-screen pb-24 flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-2xl font-bold mb-2">Market Mode</h1>
            <p className="text-muted-foreground mb-6">This view is currently under migration.</p>
            <Link href="/">
                <Button>Go Home</Button>
            </Link>
            <BottomNav />
        </div>
    );
}
