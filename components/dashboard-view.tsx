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
} from "lucide-react";
import { useDashboardStore } from "@/lib/dashboard-store";
import type { ViewMode } from "@/lib/types";
import { useCurrency } from "@/contexts/currency-context";
import { Skeleton } from "@/components/ui/skeleton";

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

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading && !stats.balance) { // Show skeleton only on initial load if no data
    return <DashboardSkeleton />;
  }

  const statCards = [
    {
      label: "Total Income",
      value: formatPrice(stats.monthlyIncome),
      change: "+12.5%", // Calculated dynamically in a real scenario, static for now matching design req logic if needed, but using real values
      positive: true,
      icon: TrendingUp,
      color: "emerald",
    },
    {
      label: "Total Expenses",
      value: formatPrice(stats.monthlyExpense),
      change: "-8.2%",
      positive: false,
      icon: TrendingDown,
      color: "red",
    },
    {
      label: "Transactions",
      value: stats.totalTransactions.toString(),
      change: "This Month",
      positive: true,
      icon: Receipt,
      color: "blue",
    },
    {
      label: "Savings Rate",
      value: `${stats.savingsRate.toFixed(1)}%`,
      change: stats.savingsRate > 20 ? "+Good" : "Low",
      positive: stats.savingsRate > 0,
      icon: Wallet,
      color: "purple",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Industry-Standard Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                <ShoppingCart className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                  ShopList Pro
                </h1>
                <p className="text-xs text-gray-500 leading-none">
                  Financial Dashboard
                </p>
              </div>
            </div>

            {/* Search & Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex relative flex-1 sm:flex-none">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full sm:w-64 md:w-72 h-10 bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <button className="relative w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-xl transition-all">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white"></span>
              </button>

              <button
                onClick={() => onNavigate("expenses")}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 h-10 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                <span className="hidden sm:inline">New Transaction</span>
              </button>

              <div className="hidden lg:flex items-center gap-2 pl-3 ml-3 border-l border-gray-200">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center cursor-pointer">
                  <User className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28">
        {/* Balance Overview Card */}
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-2xl p-6 sm:p-8 mb-8 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-emerald-800/20 rounded-full blur-3xl"></div>

          <div className="relative space-y-6">
            {/* Balance Header */}
            <div>
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs font-bold rounded-full mb-3">
                TOTAL BALANCE
              </span>

              <div className="flex items-baseline gap-3 mb-2">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
                  {formatPrice(stats.balance)}
                </h2>
                <span className="flex items-center gap-1 text-white text-sm font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  {/* Mock change data as we need historical data for this calculation */}
                  +12.5%
                </span>
              </div>

              <p className="text-emerald-100 text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {format(new Date(), "MMMM d, yyyy")}
              </p>
            </div>

            {/* Buttons Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button className="flex-1 bg-white/20 backdrop-blur-sm border border-white/30 text-white px-5 h-12 rounded-xl hover:bg-white/30 transition-all font-medium flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" />
                Current Month
              </button>
              <button className="bg-white text-emerald-600 px-6 h-12 rounded-xl hover:bg-emerald-50 transition-all font-medium flex items-center justify-center gap-2 shadow-sm">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>

            {/* Stats Grid - 2x2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="bg-white/15 backdrop-blur-md border border-white/25 rounded-xl p-5 hover:bg-white/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                      </div>
                      <span className="text-white text-sm font-semibold">
                        {stat.change}
                      </span>
                    </div>
                    <p className="text-emerald-100 text-sm font-medium mb-2">
                      {stat.label}
                    </p>
                    <p className="text-white text-3xl font-bold tracking-tight">
                      {stat.value}
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
          <p className="text-4xl font-bold tracking-tight mt-1 text-white">{formatPrice(stats.averageDaily)}</p>
          <p className="text-sm text-blue-100/80 mt-1">
            {stats.averageDailyChange > 0 ? "+" : ""}{stats.averageDailyChange}% from last month
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Daily Spending Chart - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  Spending Trend
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Your spending pattern
                </p>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setPeriod("week")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${period === "week"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setPeriod("month")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${period === "month"
                    ? "bg-white text-emerald-600 shadow-sm font-bold"
                    : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setPeriod("year")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${period === "year"
                    ? "bg-white text-emerald-600 shadow-sm font-bold"
                    : "text-gray-600 hover:bg-gray-50"
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
                          <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100">
                            <p className="text-xs font-semibold text-gray-900">
                              {formatPrice(payload[0].value as number)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
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
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  Categories
                </h3>
                <p className="text-sm text-gray-500 mt-1">This month's breakdown</p>
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
                      className="group p-3 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"
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
                            <p className="text-sm font-bold text-gray-900">
                              {item.category}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.transactions} transactions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">
                            {formatPrice(item.amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
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
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  Recent Transactions
                </h3>
                <p className="text-sm text-gray-500 mt-1">
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

          <div className="divide-y divide-gray-100">
            {recentTransactions.map((transaction) => {
              const amount = transaction.amount;
              const type = transaction.transaction_type;
              const isIncome = type === "income";
              const color = isIncome ? "#10b981" : "#6b7280"; // Emerald or Gray
              const Icon = isIncome ? TrendingUp : getCategoryIcon(transaction.category); // Use category icon for expenses

              return (
                <div
                  key={transaction.id}
                  className="p-6 hover:bg-gray-50 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                        style={{
                          backgroundColor: isIncome ? "#ecfdf5" : "#f3f4f6", // light emerald or gray
                          color: isIncome ? "#10b981" : "#4b5563",
                        }}
                      >
                        <Icon className="w-5 h-5" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-bold text-gray-900 truncate">
                            {transaction.item_name || transaction.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{transaction.category}</span>
                          <span>•</span>
                          <span className="text-xs">{format(new Date(transaction.created_at), "MMM d, h:mm a")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p
                        className={`text-lg font-bold tracking-tight ${isIncome
                          ? "text-emerald-600"
                          : "text-gray-900"
                          }`}
                      >
                        {isIncome ? "+" : "-"}{formatPrice(amount)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">
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
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 h-16"></header>
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
