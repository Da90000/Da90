"use client";

import { Calendar, ChevronDown, CheckCircle, AlertTriangle, Flame } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/contexts/currency-context";
import { cn } from "@/lib/utils";

interface HeroSummaryProps {
    totalSpent: number;
    transactionCount?: number;
}

export const HeroSummary = ({ totalSpent, transactionCount = 0 }: HeroSummaryProps) => {
    const { formatPrice } = useCurrency();

    const getHealthStatus = (total: number) => {
        // Thresholds: < 20k (Green), < 40k (Amber), > 40k (Red)
        if (total < 20000) {
            return {
                label: "On Track",
                icon: CheckCircle,
                bgClass: "bg-green-500/10 text-green-700 dark:text-green-400"
            };
        } else if (total < 40000) {
            return {
                label: "Moderate",
                icon: AlertTriangle,
                bgClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            };
        } else {
            return {
                label: "High Spending",
                icon: Flame,
                bgClass: "bg-red-500/10 text-red-700 dark:text-red-400"
            };
        }
    };

    const status = getHealthStatus(totalSpent);
    const StatusIcon = status.icon;

    const now = new Date();
    const dateRange = `${format(new Date(now.getFullYear(), now.getMonth(), 1), "MMM 1")} - ${format(now, "MMM d, yyyy")}`;

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">

                {/* Header Section */}
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Financial Insights
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Track your spending patterns and trends
                    </p>
                </div>

                {/* Time Selector (Visual) */}
                <button className="self-start flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 bg-card/50 hover:bg-accent/50 transition-colors">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">This Month</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            <div className="mt-8 grid gap-4">
                {/* Main Amount */}
                <div>
                    <div className="text-5xl font-bold tracking-tight text-foreground">
                        {formatPrice(totalSpent)}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                        {dateRange}
                    </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-3 mt-2">
                    <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium", status.bgClass)}>
                        <StatusIcon className="w-4 h-4" />
                        {status.label}
                    </div>

                    {transactionCount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-secondary text-secondary-foreground">
                            <span className="text-xs">📊</span>
                            {transactionCount} transactions
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
