import { supabase } from "@/lib/supabase";

export interface CategoryData {
  name: string;
  value: number;
  fill: string;
  percentage: number;
}

export interface DailyData {
  date: string;
  amount: number;
  day: number; // Day of month (1-31)
}

export interface AnalyticsData {
  categoryData: CategoryData[];
  dailyData: DailyData[];
  totalSpent: number;
}

// Color palette for categories (supports dark mode)
const CATEGORY_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#ec4899", // pink
  "#6366f1", // indigo
  "#14b8a6", // teal
];

/**
 * Fetches and processes ledger data for the current month.
 * Returns analytics data including category breakdown and daily spending.
 */
export async function fetchAnalyticsData(): Promise<AnalyticsData> {
  if (!supabase) {
    console.warn("Supabase client not initialized. Returning empty analytics data.");
    return {
      categoryData: [],
      dailyData: [],
      totalSpent: 0,
    };
  }

  // Get current month start and end dates
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  // Fetch ledger records for current month
  const { data, error } = await supabase
    .from("ledger")
    .select("category, amount, created_at")
    .gte("created_at", startOfMonth.toISOString())
    .lte("created_at", endOfMonth.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Supabase analytics fetch error:", error);
    return {
      categoryData: [],
      dailyData: [],
      totalSpent: 0,
    };
  }

  if (!data || data.length === 0) {
    // Return empty data with filled daily array for the month
    const daysInMonth = endOfMonth.getDate();
    const dailyData: DailyData[] = Array.from({ length: daysInMonth }, (_, i) => ({
      date: new Date(year, month, i + 1).toISOString().split("T")[0],
      amount: 0,
      day: i + 1,
    }));

    return {
      categoryData: [],
      dailyData,
      totalSpent: 0,
    };
  }

  // Process category data
  const categoryMap = new Map<string, number>();
  let totalSpent = 0;

  for (const row of data) {
    const category = row.category || "Other";
    const amount = Number(row.amount) || 0;
    categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
    totalSpent += amount;
  }

  // Convert category map to array with colors and percentages
  const categoryData: CategoryData[] = Array.from(categoryMap.entries())
    .map(([name, value], index) => ({
      name,
      value,
      fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      percentage: totalSpent > 0 ? (value / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value); // Sort by value descending

  // Process daily data
  const dailyMap = new Map<string, number>();

  for (const row of data) {
    const date = new Date(row.created_at);
    const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const amount = Number(row.amount) || 0;
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + amount);
  }

  // Fill in missing days with 0
  const daysInMonth = endOfMonth.getDate();
  const dailyData: DailyData[] = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    const dateKey = date.toISOString().split("T")[0];
    const day = i + 1;
    return {
      date: dateKey,
      amount: dailyMap.get(dateKey) || 0,
      day,
    };
  });

  return {
    categoryData,
    dailyData,
    totalSpent,
  };
}
