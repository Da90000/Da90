"use client";

import { LedgerHistory } from "@/components/ledger-history";
import { BottomNav } from "@/components/bottom-nav";

export default function SpendingPage() {
    return (
        <div className="bg-background min-h-screen pb-24">
            <div className="p-4 md:p-6 max-w-5xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">Transactions</h1>
                <LedgerHistory />
            </div>
            <BottomNav />
        </div>
    );
}
