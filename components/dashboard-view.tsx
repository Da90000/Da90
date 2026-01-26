"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  Search,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Calendar,
  Receipt,
  Coffee,
  Home,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download,
  Bell,
  User,
  ChevronDown,
  Wallet,
  CreditCard,
  ArrowRight,
  ShoppingBag,
  Zap,
  Car,
  Wrench,
  Minus,

  Settings,
  LogOut,
  Sun,
  Moon,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboardStore } from "@/lib/dashboard-store";
import type { ViewMode } from "@/lib/types";
import { useCurrency } from "@/contexts/currency-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addTransaction } from "@/lib/ledger-store";
import { CATEGORIES } from "@/lib/types";

interface DashboardViewProps {
  onNavigate: (mode: ViewMode) => void;
}

// Icon mapping for categories
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

// Color mapping for categories
const getCategoryColor = (category: string) => {
  const lower = category.toLowerCase();
  if (lower.includes("income")) return "#10b981";
  if (lower.includes("debt")) return "#ef4444";
  if (lower.includes("household") || lower.includes("shop")) return "#3b82f6";
  if (lower.includes("bill")) return "#f97316";
  if (lower.includes("food")) return "#a855f7";
  if (lower.includes("transport")) return "#06b6d4";
  return "#6b7280";
};

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { formatPrice } = useCurrency();
  const {
    stats,
    chartData,
    categoryData,
    recentTransactions,
    period,
    setPeriod,
    fetchDashboardData,
    isLoading
  } = useDashboardStore();

  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"income" | "expense">("expense");
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("isBalanceHidden") === "true";
    }
    return false;
  });

  const togglePrivacy = () => {
    const newState = !isBalanceHidden;
    setIsBalanceHidden(newState);
    if (typeof window !== "undefined") {
      localStorage.setItem("isBalanceHidden", newState.toString());
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };
    fetchUser();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleOpenTransaction = (type: "income" | "expense") => {
    setTransactionType(type);
    setItemName("");
    setAmount("");
    setCategory("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setIsTransactionOpen(true);
  };

  const handleExport = () => {
    // Generate CSV content
    const headers = ["Date", "Item", "Category", "Type", "Amount"];
    const rows = recentTransactions.map(t => [
      format(new Date(t.created_at), "yyyy-MM-dd"),
      t.item_name || "",
      t.category || "",
      t.transaction_type || "expense",
      t.amount.toString()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateBalance = () => {
    // Helper to refresh data if needed, but fetchDashboardData covers it.
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !amount || !category) return;

    const transactionData = {
      item_name: itemName,
      amount: parseFloat(amount),
      category: category,
      transaction_type: transactionType,
      created_at: new Date(date).toISOString(),
    };

    await addTransaction(transactionData);
    await fetchDashboardData();
    setIsTransactionOpen(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading && !stats.balance) { // Show skeleton only on initial load if no data
    return <DashboardSkeleton />;
  }

  // Savings Rate Logic
  const getSavingsInfo = (rate: number) => {
    if (!rate || isNaN(rate)) return { label: null, color: "text-white" };
    if (rate < 20) return { label: "Low", color: "text-red-300" };
    if (rate <= 50) return { label: "Moderate", color: "text-yellow-300" };
    return { label: "High", color: "text-emerald-300" };
  };

  const savingsInfo = getSavingsInfo(stats.savingsRate);

  const statCards = [
    {
      label: "Total Income",
      value: formatPrice(stats.monthlyIncome),
      change: stats.incomeChange === 0 ? null : `${stats.incomeChange > 0 ? "+" : ""}${stats.incomeChange}%`,
      changeColor: stats.incomeChange > 0 ? "text-emerald-500" : "text-red-500",
      icon: TrendingUp,
    },
    {
      label: "Total Expenses",
      value: formatPrice(stats.monthlyExpense),
      change: stats.expenseChange === 0 ? null : `${stats.expenseChange > 0 ? "+" : ""}${stats.expenseChange}%`,
      changeColor: stats.expenseChange > 0 ? "text-red-500" : "text-emerald-500", // Red if expenses increased
      icon: TrendingDown,
    },
    {
      label: "Transactions",
      value: stats.totalTransactions.toString(),
      change: "This Month",
      changeColor: "text-emerald-100",
      icon: Receipt,
    },
    {
      label: "Savings Rate",
      value: `${stats.savingsRate ? stats.savingsRate.toFixed(1) : "0.0"}%`,
      change: savingsInfo.label,
      changeColor: savingsInfo.color,
      icon: Wallet,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Industry-Standard Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                <ShoppingCart className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-foreground tracking-tight">
                  ShopList Pro
                </h1>
                <p className="text-xs text-muted-foreground leading-none">
                  Financial Dashboard
                </p>
              </div>
            </div>

            {/* Search & Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex relative flex-1 sm:flex-none">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full sm:w-64 md:w-72 h-10 bg-muted/50 border border-input rounded-xl pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <button className="relative w-10 h-10 flex items-center justify-center hover:bg-muted rounded-xl transition-all">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white"></span>
              </button>



              <div className="hidden lg:flex items-center gap-2 pl-3 ml-3 border-l border-border">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center cursor-pointer">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="w-56">
                    {userEmail && (
                      <>
                        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground truncate">
                          {userEmail}
                        </div>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={() => onNavigate("settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                      {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                      <span>Toggle Theme</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28">
        {/* Balance Overview Card */}
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-2xl p-4 sm:p-8 mb-6 sm:mb-8 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-emerald-800/20 rounded-full blur-3xl"></div>

          <div className="relative space-y-6">
            {/* Balance Header */}
            {/* Balance Header & Action Buttons Row */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[10px] sm:text-xs font-bold rounded-full">
                    TOTAL BALANCE
                  </span>
                  <button
                    onClick={togglePrivacy}
                    className="p-1 px-2 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
                    title={isBalanceHidden ? "Show Balance" : "Hide Balance"}
                  >
                    {isBalanceHidden ? (
                      <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>

                <div className="flex items-baseline gap-3 mb-2">
                  <h2 className={`text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight transition-opacity duration-200 ${isBalanceHidden ? "opacity-90" : "opacity-100"}`}>
                    {isBalanceHidden ? "******" : formatPrice(stats.balance)}
                  </h2>
                  {stats.balanceChange !== 0 && (
                    <span className={`flex items-center gap-1 text-xs sm:text-sm font-semibold px-2 py-0.5 bg-white/10 rounded-full border border-white/10 transition-opacity duration-200 ${stats.balanceChange >= 0 ? "text-emerald-50" : "text-red-100"} ${isBalanceHidden ? "opacity-90" : "opacity-100"}`}>
                      {stats.balanceChange >= 0 ? <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />}
                      {isBalanceHidden ? "***" : `${stats.balanceChange > 0 ? "+" : ""}${stats.balanceChange.toFixed(1)}%`}
                    </span>
                  )}
                </div>

                <p className="text-emerald-100 text-xs sm:text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  {format(new Date(), "MMMM d, yyyy")}
                </p>
              </div>

              {/* Buttons Row - Horizontal on all screens now */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenTransaction("income")}
                  className="flex-1 bg-white/20 backdrop-blur-sm border border-white/30 text-white px-3 sm:px-5 h-10 sm:h-12 rounded-xl hover:bg-white/30 transition-all font-medium text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                  Add Income
                </button>
                <button
                  onClick={() => handleOpenTransaction("expense")}
                  className="flex-1 bg-white/20 backdrop-blur-sm border border-white/30 text-white px-3 sm:px-5 h-10 sm:h-12 rounded-xl hover:bg-white/30 transition-all font-medium text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                  Add Expense
                </button>
                <button
                  onClick={handleExport}
                  className="bg-card text-emerald-600 w-10 h-10 sm:w-auto sm:px-6 sm:h-12 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all font-medium flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </div>

            {/* Buttons Row */}


            {/* Stats Grid - 2x2 on Mobile, 4x1 on Large */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
              {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 sm:p-5 hover:bg-white/15 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/20 flex items-center justify-center">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.5} />
                      </div>
                      {stat.change && (
                        <span className={`text-[10px] sm:text-sm font-bold transition-opacity duration-200 ${stat.changeColor} ${isBalanceHidden ? "opacity-90" : "opacity-100"}`}>
                          {isBalanceHidden && stat.label !== "Transactions" ? (stat.label === "Savings Rate" ? "***" : "**%") : stat.change}
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-100 text-[10px] sm:text-sm font-medium mb-1 sm:mb-2 truncate">
                      {stat.label}
                    </p>
                    <p className={`text-white text-lg sm:text-3xl font-bold tracking-tight truncate transition-opacity duration-200 ${isBalanceHidden ? "opacity-90" : "opacity-100"}`}>
                      {isBalanceHidden ? (stat.label === "Transactions" ? "**" : (stat.label === "Savings Rate" ? "***" : "******")) : stat.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Average Daily Spending Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20 mb-8">
          <div className="flex items-start justify-between">
            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-blue-100" />
          </div>
          <p className="text-blue-100 text-sm font-medium mt-4">Average Daily</p>
          <p className={`text-4xl font-bold tracking-tight mt-1 text-white transition-opacity duration-200 ${isBalanceHidden ? "opacity-90" : "opacity-100"}`}>
            {isBalanceHidden ? "******" : formatPrice(stats.averageDaily)}
          </p>
          <p className="text-sm text-blue-100/80 mt-1">
            {stats.averageDailyChange > 0 ? "+" : ""}{stats.averageDailyChange}% from last month
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Daily Spending Chart - Takes 2 columns */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">
                  Spending Trend
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your spending pattern
                </p>
              </div>
              <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                <button
                  onClick={() => setPeriod("week")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${period === "week"
                    ? "bg-background text-emerald-600 shadow-sm"
                    : "text-muted-foreground hover:bg-background/50"
                    }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setPeriod("month")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${period === "month"
                    ? "bg-background text-emerald-600 shadow-sm font-bold"
                    : "text-muted-foreground hover:bg-background/50"
                    }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setPeriod("year")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${period === "year"
                    ? "bg-background text-emerald-600 shadow-sm font-bold"
                    : "text-muted-foreground hover:bg-background/50"
                    }`}
                >
                  Year
                </button>
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEmerald" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e5e7eb"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                      return value.toString();
                    }}
                    width={45}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover px-3 py-2 rounded-lg shadow-lg border border-border">
                            <p className="text-xs font-semibold text-popover-foreground">
                              {formatPrice(payload[0].value as number)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {payload[0].payload.date}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorEmerald)"
                    animationDuration={800}
                    animationEasing="ease-in-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown - 1 column */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">
                  Categories
                </h3>
                <p className="text-sm text-muted-foreground mt-1">This month's breakdown</p>
              </div>
            </div>

            <div className="space-y-4">
              {categoryData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              ) : (
                categoryData.map((item) => {
                  const Icon = getCategoryIcon(item.category);
                  const color = getCategoryColor(item.category);
                  return (
                    <div
                      key={item.category}
                      className="group p-3 hover:bg-muted/50 rounded-xl transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                              backgroundColor: `${color}15`,
                              color: color,
                            }}
                          >
                            <Icon className="w-5 h-5" strokeWidth={2.5} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              {item.category}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.transactions} transactions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">
                            {formatPrice(item.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: color,
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions - Full Width */}
        <div className="bg-card border border-border rounded-2xl shadow-sm">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">
                  Recent Transactions
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Latest activity from your accounts
                </p>
              </div>
              <button
                onClick={() => onNavigate("expenses")}
                className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-border">
            {recentTransactions.map((transaction) => {
              const amount = transaction.amount;
              const type = transaction.transaction_type;
              const isIncome = type === "income";
              const color = isIncome ? "#10b981" : "#6b7280"; // Emerald or Gray
              const Icon = isIncome ? TrendingUp : getCategoryIcon(transaction.category); // Use category icon for expenses

              return (
                <div
                  key={transaction.id}
                  className="p-6 hover:bg-muted/50 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform ${isIncome ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}
                      >
                        <Icon className="w-5 h-5" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-bold text-foreground truncate">
                            {transaction.item_name || transaction.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{transaction.category}</span>
                          <span>•</span>
                          <span className="text-xs">{format(new Date(transaction.created_at), "MMM d, h:mm a")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p
                        className={`text-lg font-bold tracking-tight ${isIncome
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                          }`}
                      >
                        {isIncome ? "+" : "-"}{formatPrice(amount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                        {transaction.transaction_type?.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* Quick Transaction Dialog */}
      <Dialog open={isTransactionOpen} onOpenChange={setIsTransactionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{transactionType === "income" ? "Add Income" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransactionSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Description</Label>
              <Input
                id="name"
                placeholder={transactionType === "income" ? "Salary, Bonus, etc." : "Groceries, Rent, etc."}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="Salary">Salary</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Investment">Investment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsTransactionOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className={transactionType === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
              >
                Add {transactionType === "income" ? "Income" : "Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border h-16"></header>
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 space-y-6">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </main>
    </div>
  );
}
