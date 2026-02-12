"use client";

import { MaintenanceTracker } from "@/components/maintenance-tracker";
import { BottomNav } from "@/components/bottom-nav";
import { Header } from "@/components/header";
import { useState } from "react";

export default function MaintenancePage() {
    // Simple check for auth typically needed here too, but MaintenanceTracker handles its own loading state.
    // We'll wrap it in standard layout.

    return (
        <div className="min-h-screen bg-background pb-24">
            <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 md:pb-8 lg:px-8">
                <MaintenanceTracker />
            </div>
            <BottomNav />
        </div>
    );
}
