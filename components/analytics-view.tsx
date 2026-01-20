"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { fetchAnalyticsData, type AnalyticsData } from "@/lib/analytics-store";
import { AnalyticsSkeleton } from "@/components/analytics/analytics-skeleton";
import { EmptyState } from "@/components/analytics/empty-state";
import { HeroSummary } from "@/components/analytics/hero-summary";
import { CategoryDonutChart } from "@/components/analytics/category-donut-chart";
import { DailyBarChart } from "@/components/analytics/daily-bar-chart";

export function AnalyticsView() {
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
    return <AnalyticsSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="col-span-full bg-card/50 border-border/30 rounded-2xl shadow-sm">
          <HeroSummary totalSpent={0} transactionCount={0} />
        </Card>
        <Card className="bg-destructive/10 border-destructive/20 rounded-2xl">
          <CardContent className="pt-6">
            <p className="text-center text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return <EmptyState />;
  }

  const { categoryData, dailyData, totalSpent, transactionCount } = data;

  if (categoryData.length === 0 && totalSpent === 0) {
    return (
      <div className="space-y-6">
        <Card className="col-span-full bg-card/50 border-border/30 rounded-2xl shadow-sm">
          <HeroSummary totalSpent={0} transactionCount={0} />
        </Card>
        <Card className="bg-card/50 border-border/30 rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <EmptyState />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero - Always full width */}
      <Card className="col-span-full bg-card/50 border-border/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
        <HeroSummary totalSpent={totalSpent} transactionCount={transactionCount} />
      </Card>

      {/* Charts - Stack on mobile, grid on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <Card className="bg-card/50 border-border/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <CategoryDonutChart data={categoryData} totalSpent={totalSpent} />
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="bg-card/50 border-border/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Daily Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length > 0 ? (
              <DailyBarChart data={dailyData} />
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                No daily data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
