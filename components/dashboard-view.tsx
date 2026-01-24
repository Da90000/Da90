"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Plus, Wrench, Receipt, ArrowDown, ArrowUp } from "lucide-react";
import { fetchDashboardStats, type LedgerEntry } from "@/lib/dashboard-store";
import type { ViewMode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/contexts/currency-context";
import { cn } from "@/lib/utils";
import { addTransaction } from "@/lib/ledger-store";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { TransactionCard } from "@/components/ui/transaction-card";

interface DashboardViewProps {
  onNavigate: (mode: ViewMode) => void;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function extractNameFromEmail(email: string | null | undefined): string {
  if (!email) return "";
  const namePart = email.split("@")[0];
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
}

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

  // Add Income State
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeSaving, setIncomeSaving] = useState(false);

  // Add Expense State
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseItemName, setExpenseItemName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseSaving, setExpenseSaving] = useState(false);

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

  const handleAddIncome = async () => {
    const amount = Number.parseFloat(incomeAmount);
    if (!incomeSource.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Enter valid source and amount", variant: "destructive" });
      return;
    }

    setIncomeSaving(true);
    try {
      const { success, error } = await addTransaction({
        item_name: incomeSource.trim(),
        category: "Income",
        amount,
        transaction_type: "income",
      });

      if (success) {
        toast({ title: "Income added successfully" });
        setIncomeOpen(false);
        setIncomeAmount("");
        setIncomeSource("");
        await load(); // Reload stats
      } else {
        toast({
          title: "Failed to add income",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      }
    } finally {
      setIncomeSaving(false);
    }
  };

  const handleAddExpense = async () => {
    const amount = Number.parseFloat(expenseAmount);
    if (!expenseItemName.trim() || !Number.isFinite(amount) || amount <= 0 || !expenseCategory) {
      toast({ title: "Enter valid item name, amount, and category", variant: "destructive" });
      return;
    }

    setExpenseSaving(true);
    try {
      const { success, error } = await addTransaction({
        item_name: expenseItemName.trim(),
        category: expenseCategory,
        amount,
        transaction_type: "expense",
      });

      if (success) {
        toast({ title: "Expense added successfully" });
        setExpenseOpen(false);
        setExpenseItemName("");
        setExpenseAmount("");
        setExpenseCategory("");
        await load(); // Reload stats
      } else {
        toast({
          title: "Failed to add expense",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      }
    } finally {
      setExpenseSaving(false);
    }
  };

  if (loading || !stats) {
    return <DashboardSkeleton />;
  }

  const dateLabel = format(new Date(), "EEEE, MMM d");
  const greeting = getGreeting();
  const userName = extractNameFromEmail(userEmail);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {userLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            `${greeting}, ${userName}`
          )}
        </h1>
        <p className="text-sm text-muted-foreground font-medium">{dateLabel}</p>
      </header>

      {/* Hero Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg shadow-emerald-500/20">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-sm font-medium text-emerald-100">Current Balance</span>
              <div className="text-4xl font-bold tracking-tight">
                {formatPrice(stats.netBalance)}
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <ArrowDownRight className="h-5 w-5 rotate-45 text-emerald-100" />
              </div>
              <div>
                <span className="block text-xs text-emerald-100/70">Income</span>
                <span className="block text-sm font-semibold">{formatPrice(stats.totalIncome)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <ArrowUpRight className="h-5 w-5 text-emerald-100" />
              </div>
              <div>
                <span className="block text-xs text-emerald-100/70">Expense</span>
                <span className="block text-sm font-semibold">{formatPrice(stats.totalExpenses)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Background decorative circles */}
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-300/20 blur-2xl" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={() => setIncomeOpen(true)}
          className="h-auto flex-col items-center justify-center gap-1 rounded-2xl bg-white p-4 text-emerald-600 shadow-sm hover:bg-emerald-50 hover:text-emerald-700 dark:bg-zinc-900 dark:text-emerald-400 dark:hover:bg-zinc-800 border items-start"
          variant="ghost"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 mb-2">
            <ArrowDown className="h-6 w-6" />
          </div>
          <span className="font-semibold text-foreground">Add Income</span>
        </Button>
        <Button
          onClick={() => setExpenseOpen(true)}
          className="h-auto flex-col items-center justify-center gap-1 rounded-2xl bg-white p-4 text-rose-600 shadow-sm hover:bg-rose-50 hover:text-rose-700 dark:bg-zinc-900 dark:text-rose-400 dark:hover:bg-zinc-800 border items-start"
          variant="ghost"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 mb-2">
            <ArrowUp className="h-6 w-6" />
          </div>
          <span className="font-semibold text-foreground">Add Expense</span>
        </Button>
      </div>

      {/* System Status */}
      <div className={cn(
        "flex items-center gap-3 rounded-2xl px-5 py-4 border",
        stats.overdueCount > 0
          ? "bg-red-50 border-red-100 text-red-700 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400"
          : "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400"
      )}>
        <div className={cn(
          "h-2.5 w-2.5 rounded-full shrink-0",
          stats.overdueCount > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500"
        )} />
        <span className="font-medium">
          {stats.overdueCount > 0
            ? `${stats.overdueCount} Items Need Attention`
            : "All Systems Nominal"
          }
        </span>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold text-lg">Recent Activity</h3>
          <span className="text-xs text-muted-foreground">Last 5 transactions</span>
        </div>

        <Card className="overflow-hidden border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            {stats.recentTx.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground bg-white dark:bg-zinc-900 rounded-3xl border border-border/50">
                No recent transactions.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentTx.map((t) => (
                  <TransactionCard
                    key={t.id}
                    title={t.itemName || "Transaction"}
                    subtitle={format(new Date(t.date), "MMM d, h:mm a")}
                    amount={t.amount}
                    category={t.category}
                    type={t.transaction_type}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Income Dialog */}
      <Dialog open={incomeOpen} onOpenChange={setIncomeOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Income</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="income-source">Source</Label>
              <Input
                id="income-source"
                placeholder="e.g. Salary, Freelance"
                value={incomeSource}
                onChange={(e) => setIncomeSource(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="income-amount">Amount</Label>
              <Input
                id="income-amount"
                type="number"
                placeholder="0.00"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncomeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddIncome} disabled={incomeSaving}>
              {incomeSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Income
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="expense-name">Item Name</Label>
              <Input
                id="expense-name"
                placeholder="e.g. Groceries"
                value={expenseItemName}
                onChange={(e) => setExpenseItemName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expense-category">Category</Label>
              <Input
                id="expense-category"
                placeholder="e.g. Food, Transport"
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expense-amount">Amount</Label>
              <Input
                id="expense-amount"
                type="number"
                placeholder="0.00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExpense} disabled={expenseSaving}>
              {expenseSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </header>

      {/* Card Skeleton */}
      <Skeleton className="h-56 w-full rounded-3xl" />

      {/* Buttons Skeleton */}
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>

      {/* Status Skeleton */}
      <Skeleton className="h-14 w-full rounded-2xl" />

      {/* Recent Activity Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    </div>
  );
}

