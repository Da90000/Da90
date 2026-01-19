"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ArrowUpRight, Receipt, ShoppingCart, Wrench } from "lucide-react";
import { fetchDashboardStats, type LedgerEntry } from "@/lib/dashboard-store";
import type { ViewMode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

interface DashboardViewProps {
  onNavigate: (mode: ViewMode) => void;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function getMonthName(): string {
  return format(new Date(), "MMMM");
}

function extractNameFromEmail(email: string | null | undefined): string {
  if (!email) return "";
  const namePart = email.split("@")[0];
  // Capitalize first letter
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
}

import { useCurrency } from "@/contexts/currency-context";

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { formatPrice } = useCurrency();
  const supabase = createClient();
  const [stats, setStats] = useState<{
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    activeDebt: number;
    overdueCount: number;
    recentTx: LedgerEntry[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  // Fetch user details
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserEmail(user?.email || null);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUserEmail(null);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUser();
  }, [supabase.auth]);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchDashboardStats();
    setStats(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !stats) {
    return <DashboardSkeleton />;
  }

  const monthLabel = getMonthName();
  const dateLabel = format(new Date(), "EEEE, MMM d");

  const greeting = getGreeting();
  const userName = extractNameFromEmail(userEmail);
  const greetingText = userLoading 
    ? greeting 
    : userName 
      ? `${greeting}, ${userName}`
      : userEmail
        ? `${greeting}, ${userEmail}`
        : greeting;

  return (
    <div className="space-y-6">
      {/* Header: Greeting + Date */}
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          {userLoading ? (
            <Skeleton className="inline-block h-7 w-48 md:h-8 md:w-64" />
          ) : (
            greetingText
          )}
        </h1>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      </header>

      {/* Key Metrics: 2 cols mobile, 3 on desktop */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {/* Card 1: Current Balance */}
        <Card className={`overflow-hidden ${
          stats.netBalance >= 0
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-destructive/60 bg-destructive/5"
        }`}>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold tabular-nums md:text-3xl ${
                stats.netBalance >= 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-destructive"
              }`}>
                {formatPrice(stats.netBalance)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Income: {formatPrice(stats.totalIncome)} | Expense: {formatPrice(stats.totalExpenses)}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: System Status */}
        <Card
          className={`overflow-hidden ${
            stats.overdueCount > 0
              ? "border-destructive/60 bg-destructive/5"
              : "border-emerald-500/40 bg-emerald-500/5"
          }`}
        >
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.overdueCount > 0 ? (
              <p className="text-base font-semibold text-destructive md:text-lg">
                ⚠️ {stats.overdueCount} Item{stats.overdueCount !== 1 ? "s" : ""} Need Attention
              </p>
            ) : (
              <p className="text-base font-semibold text-emerald-700 dark:text-emerald-400 md:text-lg">
                ✅ All Systems Nominal
              </p>
            )}
          </CardContent>
        </Card>

        {/* Spacer on 3-col to keep first two left-aligned; optional third card could go here */}
        <div className="hidden md:block" aria-hidden />
      </div>

      {/* Quick Actions: New Trip, Check Repairs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          onClick={() => onNavigate("market")}
          className="h-12 w-full gap-3 sm:h-14"
          size="lg"
        >
          <ShoppingCart className="h-5 w-5 shrink-0" />
          New Trip
        </Button>
        <Button
          onClick={() => onNavigate("maintenance")}
          variant="outline"
          className="h-12 w-full gap-3 sm:h-14"
          size="lg"
        >
          <Wrench className="h-5 w-5 shrink-0" />
          Check Repairs
        </Button>
      </div>

      {/* Recent Activity: last 5, [Icon] [Name] ........ [Amount] */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <p className="text-xs text-muted-foreground">Last 5 transactions</p>
        </CardHeader>
        <CardContent>
          {stats.recentTx.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No recent transactions.
            </p>
          ) : (
            <ul className="space-y-3">
              {stats.recentTx.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {t.itemName || "—"}
                  </span>
                  <span className={`shrink-0 font-semibold tabular-nums ${
                    t.transaction_type === "income"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-foreground"
                  }`}>
                    {t.transaction_type === "income" ? "+" : ""}{formatPrice(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <header>
        <Skeleton className="mb-1 h-7 w-40 md:h-8 md:w-48" />
        <Skeleton className="h-4 w-32" />
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-28 md:h-9 md:w-32" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-6 w-36" />
          </CardContent>
        </Card>
        <div className="hidden md:block" aria-hidden />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-12 w-full rounded-md sm:h-14" />
        <Skeleton className="h-12 w-full rounded-md sm:h-14" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
              <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
