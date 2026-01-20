"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Label } from "recharts";
import { CategoryData } from "@/lib/analytics-store";
import { CustomTooltip } from "./custom-tooltip";
import { useCurrency } from "@/contexts/currency-context";
import { useIsMobile } from "@/hooks/use-mobile";

interface CategoryDonutChartProps {
    data: CategoryData[];
    totalSpent: number;
}

export const CategoryDonutChart = ({ data, totalSpent }: CategoryDonutChartProps) => {
    const { formatPrice } = useCurrency();
    const isMobile = useIsMobile();
    const sortedData = [...data].sort((a, b) => b.value - a.value);

    // Responsive adjustments
    const innerRadius = isMobile ? 60 : 75;
    const outerRadius = isMobile ? 85 : 105;

    return (
        <ResponsiveContainer width="100%" height={350}>
            <PieChart>
                <Pie
                    data={sortedData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    paddingAngle={3}
                    strokeWidth={0}
                >
                    {sortedData.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={entry.fill}
                            className="hover:opacity-80 transition-opacity cursor-pointer dark:brightness-110"
                            stroke=""
                        />
                    ))}

                    <Label
                        value={formatPrice(totalSpent)}
                        position="center"
                        className="text-2xl font-bold fill-foreground"
                        style={{ fill: 'hsl(var(--foreground))', fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 'bold' }}
                    />
                    <Label
                        value="Total Spent"
                        position="center"
                        dy={24}
                        className="text-xs fill-muted-foreground uppercase tracking-wider"
                        style={{ fill: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}
                    />
                </Pie>

                <Tooltip content={<CustomTooltip type="category" />} cursor={{ fill: 'transparent' }} />
                <Legend
                    layout={isMobile ? "horizontal" : "vertical"}
                    align={isMobile ? "center" : "right"}
                    verticalAlign={isMobile ? "bottom" : "middle"}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "12px", paddingTop: isMobile ? "20px" : "0" }}
                    formatter={(value, entry: any) => (
                        <span className="text-sm text-foreground ml-1">
                            {value} <span className="text-muted-foreground ml-1">{formatPrice(entry.payload.value)}</span>
                        </span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};
