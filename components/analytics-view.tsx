"use client";

import { useState, useEffect } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAnalyticsData, type AnalyticsData } from "@/lib/analytics-store";
import { format } from "date-fns";
import { useCurrency } from "@/contexts/currency-context";

const WARNING_THRESHOLD = 500; // Highlight bars above this amount in red

// Custom tooltip for bar chart
const BarChartTooltip = ({ active, payload, formatPrice }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground">
          {format(new Date(data.date), "MMM d")}
        </p>
        <p className="text-sm text-muted-foreground">
          Amount: <span className="font-semibold text-foreground">{formatPrice(data.amount)}</span>
        </p>
      </div>
    );
  }
  return null;
};

// Custom tooltip for pie chart
const PieChartTooltip = ({ active, payload, formatPrice }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          Amount: <span className="font-semibold text-foreground">{formatPrice(data.value)}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Percentage: <span className="font-semibold text-foreground">{data.payload.percentage.toFixed(1)}%</span>
        </p>
      </div>
    );
  }
  return null;
};


export function AnalyticsView() {
  const { formatPrice, currencySymbol } = useCurrency();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const analyticsData = await fetchAnalyticsData();
        setData(analyticsData);
      } catch (err) {
        console.error("Failed to load analytics data:", err);
        setError("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Financial Analytics</h1>
          <p className="text-muted-foreground">Visualize your spending patterns</p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Financial Analytics</h1>
          <p className="text-muted-foreground">Visualize your spending patterns</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { categoryData, dailyData, totalSpent } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Financial Analytics</h1>
        <p className="text-muted-foreground">Visualize your spending patterns for {format(new Date(), "MMMM yyyy")}</p>
      </div>

      {/* Chart 1: Category Breakdown (Donut Chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Where is my money going?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<PieChartTooltip formatPrice={formatPrice} />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry: any) => (
                    <span style={{ color: "hsl(var(--foreground))", fontSize: "12px" }}>
                      {value} - {formatPrice(entry.payload.value)}
                    </span>
                  )}
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {formatPrice(totalSpent)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Total Spent
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart 2: Daily Spending (Bar Chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Spending Velocity</CardTitle>
          <p className="text-sm text-muted-foreground">Daily spending for the last 30 days</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis
                dataKey="day"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => `${value}`}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => `${currencySymbol}${value}`}
              />
              <Tooltip content={<BarChartTooltip formatPrice={formatPrice} />} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {dailyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.amount > WARNING_THRESHOLD ? "#ef4444" : "#3b82f6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-blue-500" />
              <span>Normal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-red-500" />
              <span>Above {formatPrice(WARNING_THRESHOLD)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoryData.map((category) => (
                <div
                  key={category.name}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: category.fill }}
                    />
                    <span className="font-medium text-foreground">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground">
                      {formatPrice(category.value)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {category.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
