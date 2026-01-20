"use client";

import { format } from "date-fns";
import { useCurrency } from "@/contexts/currency-context";

interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
    type?: 'category' | 'daily';
}

export const CustomTooltip = ({ active, payload, label, type }: CustomTooltipProps) => {
    const { formatPrice } = useCurrency();

    if (!active || !payload || !payload.length) return null;

    const value = payload[0].value;

    // For daily data, payload[0].name is often just the series name (e.g. "amount").
    // We need the actual date which is passed as 'label' (x-axis value).
    const name = type === 'daily'
        ? (label || payload[0]?.payload?.date)
        : (payload[0].name || label);

    // Try to find color in payload or fallbacks
    const color = payload[0].fill || payload[0].color || (payload[0].payload && payload[0].payload.fill) || "#3b82f6";

    const isDaily = type === 'daily';

    return (
        <div className="bg-popover/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-2xl min-w-[180px] animate-in fade-in-0 zoom-in-95">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                />
                <p className="font-semibold text-sm text-foreground">
                    {isDaily && name ? format(new Date(name), 'MMM d, yyyy') : name}
                </p>
            </div>

            {/* Amount */}
            <p className="text-2xl font-bold tracking-tight text-foreground">
                {formatPrice(value)}
            </p>

            {/* Context */}
            {isDaily && (
                <p className="text-xs text-muted-foreground mt-1">
                    {value > 1000 ? '⚠️ High spending day' : '✅ Normal spending'}
                </p>
            )}
            {!isDaily && payload[0].payload.percentage !== undefined && (
                <p className="text-xs text-muted-foreground mt-1">
                    {payload[0].payload.percentage.toFixed(1)}% of total
                </p>
            )}
        </div>
    );
};
