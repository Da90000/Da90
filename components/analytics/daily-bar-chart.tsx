"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { DailyData } from "@/lib/analytics-store";
import { CustomTooltip } from "./custom-tooltip";
import { format } from "date-fns";
import { useCurrency } from "@/contexts/currency-context";

interface DailyBarChartProps {
    data: DailyData[];
}

export const DailyBarChart = ({ data }: DailyBarChartProps) => {
    const { currencySymbol } = useCurrency();

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="normalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    </linearGradient>

                    <linearGradient id="highGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                    </linearGradient>
                </defs>

                <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                    opacity={0.3}
                />

                <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    minTickGap={30}
                />

                <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${currencySymbol}${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                    width={45}
                />

                <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }} content={<CustomTooltip type="daily" />} />

                <Bar
                    dataKey="amount"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={50}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={entry.amount > 1000 ? "url(#highGradient)" : "url(#normalGradient)"}
                            className="transition-all duration-300 hover:opacity-80"
                            stroke=""
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};
