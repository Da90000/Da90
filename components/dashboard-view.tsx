"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Receipt,
  Coffee,
  Home,
  ArrowUpRight,
  ShoppingBag,
  Car,
  Wrench,
  Wallet,
  CreditCard,
  ChevronRight,
  Plus
} from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/lib/dashboard-store";
import type { ViewMode } from "@/lib/types";
import { useCurrency } from "@/contexts/currency-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { addTransaction } from "@/lib/ledger-store";

// New Mobile-First Components
import { BalanceHeroCard } from "@/components/balance-hero-card";
import { QuickAddSheet } from "@/components/quick-add-sheet";
import { UnifiedTransactionDialog, type TransactionData } from "@/components/unified-transaction-dialog";

interface DashboardViewProps {
  onNavigate: (mode: ViewMode) => void;
}

// Icon mapping for categories (Keep existing logic)
const getCategoryIcon = (category: string) => {
  const lower = category.toLowerCase();
  if (lower.includes("food") || lower.includes("snack")) return Coffee;
  if (lower.includes("bill") || lower.includes("utilit")) return Receipt;
  if (lower.includes("household") || lower.includes("home")) return Home;
  if (lower.includes("debt") || lower.includes("credit")) return CreditCard;
  if (lower.includes("income") || lower.includes("salary")) return TrendingUp;
  if (lower.includes("transport") || lower.includes("car")) return Car;
  if (lower.includes("maintenance")) return Wrench;
  if (lower.includes("shopping") || lower.includes("shop")) return ShoppingBag;
  return Wallet;
};

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { formatPrice } = useCurrency();
  const {
    stats,
    chartData,
    recentTransactions,
    period,
    setPeriod,
    fetchDashboardData,
    isLoading,
    rawLedger
  } = useDashboardStore();

  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"income" | "expense" | "debt">("expense");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleUnifiedTransactionSubmit = async (data: TransactionData) => {
    try {
      const transactionData = {
        item_name: data.type.startsWith("debt_")
          ? (data.debtType === "debt_given" ? `Given to ${data.entityName}` : `Borrowed from ${data.entityName}`)
          : data.itemName,
        amount: data.amount,
        category: data.category,
        transaction_type: data.type,
        entity_name: data.entityName || undefined,
        created_at: data.date ? new Date(data.date + "T23:59:59").toISOString() : new Date().toISOString(),
      };

      await addTransaction(transactionData); // This function comes from store but might need to be imported if not exported from hook
      await fetchDashboardData();
    } catch (error) {
      console.error("Failed to add transaction:", error);
    }
  };

  if (isLoading && rawLedger.length === 0) {
    return <DashboardSkeleton />;
  }

  // Savings Info Logic
  const getSavingsInfo = (rate: number) => {
    if (!rate || isNaN(rate)) return { label: "Neutral", color: "text-muted-foreground" };
    if (rate < 20) return { label: "Low", color: "text-red-500" };
    if (rate <= 50) return { label: "Moderate", color: "text-yellow-500" };
    return { label: "High", color: "text-emerald-500" };
  };
  const savingsInfo = getSavingsInfo(stats.savingsRate);

  return (
    <div className="pb-24 md:pb-6 bg-background min-h-screen">
      <div className="space-y-6 px-4 pt-4 md:pt-6 max-w-4xl mx-auto">

        {/* Mobile-First Hero Card */}
        <BalanceHeroCard
          balance={stats.balance}
          income={stats.monthlyIncome}
          expenses={stats.monthlyExpense}
          onExpand={() => onNavigate("expenses")}
          className="shadow-xl"
        />

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors group active:scale-95 duration-200"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/30 transition-colors">
              <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-medium text-center">Expense</span>
          </button>

          <button
            onClick={() => {
              setTransactionType("income");
              setIsTransactionOpen(true);
            }}
            className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors group active:scale-95 duration-200"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/30 transition-colors">
              <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-center">Income</span>
          </button>

          <button
            onClick={() => onNavigate("bills")}
            className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors group active:scale-95 duration-200"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors">
              <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-medium text-center">Bills</span>
          </button>

          <button
            onClick={() => onNavigate("inventory")}
            className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors group active:scale-95 duration-200"
          >
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors">
              <ChevronRight className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs font-medium text-center">More</span>
          </button>
        </div>

        {/* Horizontal Scroll Stats */}
        <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
          <div className="flex gap-4 w-max">
            {/* Savings Rate Card */}
            <Card className="w-[160px] md:w-[200px] shrink-0 bg-card border-border shadow-sm">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground font-medium">Savings Rate</span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight">
                    {stats.savingsRate?.toFixed(1) || "0.0"}%
                  </p>
                </div>
                <div className="mt-3">
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full bg-current/10", savingsInfo.color)}>
                    {savingsInfo.label}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Daily Average Card */}
            <Card className="w-[160px] md:w-[200px] shrink-0 bg-card border-border shadow-sm">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground font-medium">Daily Avg</span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight">
                    {formatPrice(stats.averageDaily)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {stats.averageDailyChange > 0 ? "+" : ""}{stats.averageDailyChange}% vs last mo
                </p>
              </CardContent>
            </Card>

            {/* Net Debt Card */}
            <Card className="w-[160px] md:w-[200px] shrink-0 bg-card border-border shadow-sm">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-purple-500" />
                    <span className="text-xs text-muted-foreground font-medium">Net Debt</span>
                  </div>
                  <p className="text-xl font-bold tracking-tight truncate">
                    {formatPrice(stats.netDebtPosition)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Position
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Transactions (Limit 3) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold tracking-tight">Recent Activity</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("expenses")}
              className="text-primary hover:text-primary hover:bg-primary/10 -mr-2"
            >
              See All
            </Button>
          </div>

          <div className="space-y-3">
            {recentTransactions.slice(0, 3).map((transaction) => {
              const isIncome = transaction.transaction_type === "income";
              const Icon = isIncome ? TrendingUp : getCategoryIcon(transaction.category);

              return (
                <Card
                  key={transaction.id}
                  className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow active:scale-[0.99]"
                >
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        isIncome ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10" : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {transaction.item_name || transaction.category}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {format(new Date(transaction.created_at), "MMM d • h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn(
                        "font-bold",
                        isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                      )}>
                        {isIncome ? "+" : "-"}{formatPrice(transaction.amount)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Expandable Insights */}
        <div>
          <Button
            variant="ghost"
            className="w-full justify-between px-4 py-6 h-auto bg-card border border-border rounded-xl shadow-sm hover:bg-muted/50"
            onClick={() => setInsightsExpanded(!insightsExpanded)}
          >
            <span className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Spending Insights
            </span>
            <ChevronRight
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                insightsExpanded && "rotate-90"
              )}
            />
          </Button>

          {insightsExpanded && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <Card className="border-border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Spending Trend</h3>
                    <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                      {(['week', 'month', 'year'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPeriod(p)}
                          className={cn(
                            "px-3 py-1 text-xs rounded-md transition-all",
                            period === p ? "bg-background shadow-sm font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                          dy={10}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                        />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#colorGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Sheet */}
      <QuickAddSheet open={quickAddOpen} onOpenChange={setQuickAddOpen} />

      {/* Legacy Transaction Dialog (Backup) */}
      <UnifiedTransactionDialog
        isOpen={isTransactionOpen}
        onClose={() => setIsTransactionOpen(false)}
        onSubmit={handleUnifiedTransactionSubmit}
        initialType={transactionType}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="space-y-6 px-4 pt-6 max-w-4xl mx-auto">
        <Skeleton className="h-[180px] w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-[160px] shrink-0 rounded-xl" />)}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-8 w-40 rounded-lg" />
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}
