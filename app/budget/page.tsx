"use client";

import { BillTracker } from "@/components/bill-tracker";
import { BottomNav } from "@/components/bottom-nav";

export default function BudgetPage() {
    return (
        <div className="bg-background min-h-screen pb-24">
            <div className="p-4 md:p-6 max-w-5xl mx-auto">
                <BillTracker />
            </div>
            <BottomNav />
        </div>
    );
}
