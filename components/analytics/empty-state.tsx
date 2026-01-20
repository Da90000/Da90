"use client";

import { TrendingUp } from "lucide-react";

export const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-[350px] text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No data yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
            Start tracking your expenses to see beautiful insights here
        </p>
    </div>
);
