"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Plus, CheckCircle2, Receipt, CreditCard, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { fetchLedger, addTransaction, addDebtPayment, getTotalPaid, getRemainingAmount, deleteTransaction, updateTransaction, type LedgerEntry, type TransactionType } from "@/lib/ledger-store";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/currency-context";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { FloatingActionBtn } from "@/components/ui/fab";

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

const LEDGER_LOADING_ROWS = 5;

type ViewType = "expenses" | "income" | "debt";

export function LedgerHistory() {
  const { formatPrice, currencySymbol } = useCurrency();
  const [view, setView] = useState<ViewType>("expenses");
  const [allLedgerItems, setAllLedgerItems] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Income Dialog
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeSaving, setIncomeSaving] = useState(false);

  // Add Debt Dialog
  const [debtOpen, setDebtOpen] = useState(false);
  const [debtAmount, setDebtAmount] = useState("");
  const [debtEntity, setDebtEntity] = useState("");
  const [debtType, setDebtType] = useState<"debt_given" | "debt_taken">("debt_given");
  const [debtSaving, setDebtSaving] = useState(false);

  // Add Expense Dialog
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseItemName, setExpenseItemName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split("T")[0]!);
  const [expenseSaving, setExpenseSaving] = useState(false);

  // Record Payment Dialog
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]!);
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);

  // Edit Transaction Dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<LedgerEntry | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editEntityName, setEditEntityName] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all ledger items
      const allData = await fetchLedger();
      setAllLedgerItems(allData);
    } catch (error) {
      console.error("Failed to load ledger:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter data based on transaction type
  const expensesList = useMemo(() => {
    return allLedgerItems.filter(item => item.transaction_type === "expense" || !item.transaction_type);
  }, [allLedgerItems]);

  const incomeList = useMemo(() => {
    return allLedgerItems.filter(item => item.transaction_type === "income");
  }, [allLedgerItems]);

  const debtList = useMemo(() => {
    return allLedgerItems.filter(item =>
      (item.transaction_type === "debt_given" || item.transaction_type === "debt_taken") && !item.is_settled
    );
  }, [allLedgerItems]);

  const settledDebtList = useMemo(() => {
    return allLedgerItems.filter(item =>
      (item.transaction_type === "debt_given" || item.transaction_type === "debt_taken") && item.is_settled === true
    );
  }, [allLedgerItems]);

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
        await loadData();
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

  const handleAddDebt = async () => {
    const amount = Number.parseFloat(debtAmount);
    if (!debtEntity.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Enter valid entity name and amount", variant: "destructive" });
      return;
    }

    setDebtSaving(true);
    try {
      const { success, error } = await addTransaction({
        item_name: debtType === "debt_given" ? `Given to ${debtEntity.trim()}` : `Borrowed from ${debtEntity.trim()}`,
        category: "Debt",
        amount,
        transaction_type: debtType,
        entity_name: debtEntity.trim(),
      });

      if (success) {
        toast({ title: "Debt added successfully" });
        setDebtOpen(false);
        setDebtAmount("");
        setDebtEntity("");
        setDebtType("debt_given");
        await loadData();
      } else {
        toast({
          title: "Failed to add debt",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      }
    } finally {
      setDebtSaving(false);
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
      // Create a date string in ISO format from the date input
      // Set time to end of day to ensure it's included in the selected date
      const selectedDate = expenseDate
        ? new Date(expenseDate + "T23:59:59").toISOString()
        : new Date().toISOString();

      const { success, error } = await addTransaction({
        item_name: expenseItemName.trim(),
        category: expenseCategory,
        amount,
        transaction_type: "expense",
        created_at: selectedDate,
      });

      if (success) {
        toast({ title: "Expense Logged" });
        setExpenseOpen(false);
        setExpenseItemName("");
        setExpenseAmount("");
        setExpenseCategory("");
        setExpenseDate(new Date().toISOString().split("T")[0]!);
        await loadData();
      } else {
        toast({
          title: "Failed to log expense",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      }
    } finally {
      setExpenseSaving(false);
    }
  };

  const handleOpenPaymentDialog = (debtId: string, remaining: number) => {
    setPaymentDebtId(debtId);
    setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : "");
    setPaymentDate(new Date().toISOString().split("T")[0]!);
    setPaymentNote("");
    setPaymentOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!paymentDebtId || !paymentAmount) {
      toast({ title: "Enter payment amount", variant: "destructive" });
      return;
    }

    const amount = Number.parseFloat(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Enter valid payment amount", variant: "destructive" });
      return;
    }

    setPaymentSaving(true);
    try {
      const { success, error } = await addDebtPayment(
        paymentDebtId,
        amount,
        paymentNote.trim() || undefined,
        paymentDate ? new Date(paymentDate + "T23:59:59").toISOString() : undefined
      );

      if (success) {
        toast({ title: "Payment recorded successfully" });
        setPaymentOpen(false);
        setPaymentDebtId(null);
        setPaymentAmount("");
        setPaymentNote("");
        await loadData();
      } else {
        toast({
          title: "Failed to record payment",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      }
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleEditClick = (transaction: LedgerEntry) => {
    setEditingTransaction(transaction);
    setEditItemName(transaction.itemName);
    setEditAmount(String(transaction.amount));
    setEditCategory(transaction.category);
    setEditEntityName(transaction.entity_name || "");
    // Convert ISO date to YYYY-MM-DD format for input
    try {
      const dateObj = new Date(transaction.date);
      setEditDate(dateObj.toISOString().split("T")[0] || "");
    } catch {
      setEditDate("");
    }
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    const amount = Number.parseFloat(editAmount);
    if (!editItemName.trim() || !Number.isFinite(amount) || amount <= 0 || !editCategory) {
      toast({ title: "Enter valid values", variant: "destructive" });
      return;
    }

    setEditSaving(true);
    try {
      const updates: any = {
        item_name: editItemName.trim(),
        category: editCategory,
        amount: amount,
      };

      if (editDate) {
        updates.created_at = new Date(editDate + "T23:59:59").toISOString();
      }

      if (editEntityName.trim()) {
        updates.entity_name = editEntityName.trim();
      }

      const { success, error } = await updateTransaction(editingTransaction.id, updates);

      if (success) {
        toast({ title: "Transaction updated successfully" });
        setEditOpen(false);
        setEditingTransaction(null);
        await loadData();
      } else {
        toast({
          title: "Failed to update transaction",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      }
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteClick = async (transaction: LedgerEntry) => {
    const isDebt = transaction.transaction_type?.startsWith("debt_");
    const confirmMessage = isDebt
      ? `Delete this debt entry? This will also remove all associated payment records.`
      : `Delete this transaction?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const { success, error } = await deleteTransaction(transaction.id);

      if (success) {
        toast({ title: "Transaction deleted successfully" });
        await loadData();
      } else {
        toast({
          title: "Failed to delete transaction",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error deleting transaction",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  // Helper function to handle FAB click based on current view
  const handleFabClick = () => {
    if (view === "expenses") {
      setExpenseOpen(true);
    } else if (view === "income") {
      setIncomeOpen(true);
    } else if (view === "debt") {
      setDebtOpen(true);
    }
  };

  const totalExpenses = expensesList.reduce((sum, r) => sum + r.amount, 0);
  const totalIncome = incomeList.reduce((sum, r) => sum + r.amount, 0);
  const totalDebt = debtList.reduce((sum, r) => {
    if (r.transaction_type === "debt_given" && !r.is_settled) return sum + r.amount;
    if (r.transaction_type === "debt_taken" && !r.is_settled) return sum - r.amount;
    return sum;
  }, 0);

  const renderExpenseRow = (r: LedgerEntry) => (
    <>
      <TableCell className="text-muted-foreground">{formatDate(r.date)}</TableCell>
      <TableCell className="font-medium">{r.itemName || "—"}</TableCell>
      <TableCell>{r.category}</TableCell>
      <TableCell className="text-right tabular-nums">{formatPrice(r.amount)}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditClick(r)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDeleteClick(r)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </>
  );

  const renderIncomeRow = (r: LedgerEntry) => (
    <>
      <TableCell className="text-muted-foreground">{formatDate(r.date)}</TableCell>
      <TableCell className="font-medium text-emerald-700 dark:text-emerald-400">{r.itemName || "—"}</TableCell>
      <TableCell>{r.category}</TableCell>
      <TableCell className="text-right tabular-nums text-emerald-700 dark:text-emerald-400">
        +{formatPrice(r.amount)}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditClick(r)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDeleteClick(r)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </>
  );

  const renderDebtRow = (r: LedgerEntry) => {
    const isGiven = r.transaction_type === "debt_given";
    const isSettled = r.is_settled === true;
    const totalPaid = getTotalPaid(r);
    const remaining = getRemainingAmount(r);
    const progressPercent = r.amount > 0 ? (totalPaid / r.amount) * 100 : 0;

    return (
      <>
        <TableCell className="text-muted-foreground">{formatDate(r.date)}</TableCell>
        <TableCell className={`font-medium ${isSettled ? "line-through text-muted-foreground" : isGiven ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>
          <div className="space-y-1">
            <div>
              {isGiven ? `Given to ${r.entity_name || r.itemName}` : `Borrowed from ${r.entity_name || r.itemName}`}
            </div>
            {!isSettled && (
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Total: {formatPrice(r.amount)}</span>
                  <span>•</span>
                  <span>Paid: {formatPrice(totalPaid)}</span>
                </div>
                <div className="font-semibold text-foreground">
                  Remaining: {formatPrice(remaining)}
                </div>
                <Progress value={progressPercent} className="h-1.5 w-24" />
              </div>
            )}
          </div>
        </TableCell>
        <TableCell>{r.category}</TableCell>
        <TableCell className={`text-right tabular-nums ${isSettled ? "text-muted-foreground" : isGiven ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>
          {isGiven ? "-" : "+"}{formatPrice(r.amount)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            {!isSettled && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleOpenPaymentDialog(r.id, remaining)}
                className="gap-1"
              >
                <CreditCard className="h-4 w-4" />
                Record Payment
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditClick(r)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(r)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </>
    );
  };

  const renderMobileCard = (r: LedgerEntry, type: ViewType) => {
    const isGiven = r.transaction_type === "debt_given";
    const isSettled = r.is_settled === true;
    const isIncome = type === "income";
    const isDebt = type === "debt";
    const totalPaid = isDebt ? getTotalPaid(r) : 0;
    const remaining = isDebt ? getRemainingAmount(r) : 0;
    const progressPercent = isDebt && r.amount > 0 ? (totalPaid / r.amount) * 100 : 0;

    return (
      <div
        key={r.id}
        className={cn(
          "rounded-lg border p-4",
          isDebt && !isSettled
            ? "border-dashed border-2 " + (isGiven ? "border-destructive/50 bg-destructive/5" : "border-emerald-500/50 bg-emerald-500/5")
            : "border-border bg-card",
          isSettled && "opacity-60"
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={cn(
              "font-medium",
              isSettled && "line-through text-muted-foreground",
              !isSettled && isIncome && "text-emerald-700 dark:text-emerald-400",
              !isSettled && isDebt && (isGiven ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"),
              !isSettled && !isIncome && !isDebt && "text-foreground"
            )}>
              {isDebt
                ? isGiven
                  ? `Given to ${r.entity_name || r.itemName}`
                  : `Borrowed from ${r.entity_name || r.itemName}`
                : r.itemName || "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDate(r.date)} · {r.category}
            </p>
            {isDebt && !isSettled && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>Total: {formatPrice(r.amount)}</span>
                  <span>•</span>
                  <span>Paid: {formatPrice(totalPaid)}</span>
                </div>
                <div className="text-xs font-semibold text-foreground">
                  Remaining: {formatPrice(remaining)}
                </div>
                <Progress value={progressPercent} className="h-1.5 w-32" />
              </div>
            )}
          </div>
          <div className="text-right">
            <p className={cn(
              "text-lg font-semibold tabular-nums",
              isSettled && "text-muted-foreground",
              !isSettled && isIncome && "text-emerald-700 dark:text-emerald-400",
              !isSettled && isDebt && (isGiven ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"),
              !isSettled && !isIncome && !isDebt && "text-foreground"
            )}>
              {isIncome ? "+" : isDebt && !isGiven ? "+" : isDebt ? "-" : ""}{formatPrice(r.amount)}
            </p>
            {isDebt && !isSettled && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleOpenPaymentDialog(r.id, remaining)}
                className="mt-2 gap-1 text-xs"
              >
                <CreditCard className="h-3 w-3" />
                Record Payment
              </Button>
            )}
          </div>
        </div>

        {/* Edit/Delete Menu */}
        <div className="mt-3 flex justify-end border-t border-border/50 pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-2">
                <MoreVertical className="h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditClick(r)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeleteClick(r)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Segmented Control / Tab Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-border bg-secondary p-1">
          <button
            type="button"
            onClick={() => setView("expenses")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all min-h-[44px]",
              view === "expenses"
                ? "bg-primary text-primary-foreground text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Ledger
          </button>
          <button
            type="button"
            onClick={() => setView("income")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all min-h-[44px]",
              view === "income"
                ? "bg-primary text-primary-foreground text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => setView("debt")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all min-h-[44px]",
              view === "debt"
                ? "bg-primary text-primary-foreground text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Debt
          </button>
        </div>

        {/* Add Buttons */}
        {view === "expenses" && (
          <Button onClick={() => setExpenseOpen(true)} size="lg" className="hidden gap-2 sm:flex w-full sm:w-auto">
            <Receipt className="h-5 w-5" />
            Log Manual Expense
          </Button>
        )}
        {view === "income" && (
          <Button onClick={() => setIncomeOpen(true)} size="lg" className="hidden gap-2 sm:flex w-full sm:w-auto">
            <Plus className="h-5 w-5" />
            Add Income
          </Button>
        )}
        {view === "debt" && (
          <Button onClick={() => setDebtOpen(true)} size="lg" className="hidden gap-2 sm:flex w-full sm:w-auto">
            <Plus className="h-5 w-5" />
            Add Debt
          </Button>
        )}
      </div>

      {/* Expenses View */}
      {view === "expenses" && (
        <div className="space-y-6">
          <Card className="max-w-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-9 w-28" />
              ) : (
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {formatPrice(totalExpenses)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction Ledger</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="block space-y-3 p-4 md:hidden">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-border p-4">
                      <Skeleton className="mb-2 h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="mt-2 h-5 w-20" />
                    </div>
                  ))
                ) : expensesList.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No expenses yet</p>
                ) : (
                  expensesList.map((r) => renderMobileCard(r, "expenses"))
                )}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: LEDGER_LOADING_ROWS }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : expensesList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          No expenses yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      expensesList.map((r) => (
                        <TableRow key={r.id}>{renderExpenseRow(r)}</TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Income View */}
      {view === "income" && (
        <div className="space-y-6">
          <Card className="max-w-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-9 w-28" />
              ) : (
                <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatPrice(totalIncome)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Income History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="block space-y-3 p-4 md:hidden">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-border p-4">
                      <Skeleton className="mb-2 h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="mt-2 h-5 w-20" />
                    </div>
                  ))
                ) : incomeList.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No income recorded yet</p>
                ) : (
                  incomeList.map((r) => renderMobileCard(r, "income"))
                )}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: LEDGER_LOADING_ROWS }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : incomeList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          No income recorded yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      incomeList.map((r) => (
                        <TableRow key={r.id}>{renderIncomeRow(r)}</TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Debt View */}
      {view === "debt" && (
        <div className="space-y-6">
          <Card className="max-w-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Debt
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-9 w-28" />
              ) : (
                <p className={cn(
                  "text-2xl font-bold tabular-nums",
                  totalDebt >= 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"
                )}>
                  {totalDebt >= 0 ? "-" : "+"}{formatPrice(Math.abs(totalDebt))}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Debt History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="block space-y-3 p-4 md:hidden">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-border p-4">
                      <Skeleton className="mb-2 h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="mt-2 h-5 w-20" />
                    </div>
                  ))
                ) : debtList.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No active debts</p>
                ) : (
                  debtList.map((r) => renderMobileCard(r, "debt"))
                )}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: LEDGER_LOADING_ROWS }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : debtList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No active debts
                        </TableCell>
                      </TableRow>
                    ) : (
                      debtList.map((r) => (
                        <TableRow key={r.id} className={r.is_settled ? "opacity-60" : ""}>
                          {renderDebtRow(r)}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Settled Debts Section */}
          {settledDebtList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground">Settled History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="block space-y-3 p-4 md:hidden">
                  {settledDebtList.map((r) => (
                    <div key={r.id} className="opacity-60">
                      {renderMobileCard(r, "debt")}
                    </div>
                  ))}
                </div>

                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settledDebtList.map((r) => (
                        <TableRow key={r.id} className="opacity-60">
                          {renderDebtRow(r)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add Income Dialog */}
      <Dialog open={incomeOpen} onOpenChange={setIncomeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Income</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="income-source">Source</Label>
              <Input
                id="income-source"
                placeholder="e.g., Salary, Freelance"
                value={incomeSource}
                onChange={(e) => setIncomeSource(e.target.value)}
                disabled={incomeSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="income-amount">Amount ({currencySymbol})</Label>
              <Input
                id="income-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 50000"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                disabled={incomeSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIncomeOpen(false)}
              disabled={incomeSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleAddIncome} disabled={incomeSaving}>
              {incomeSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Income"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog
        open={expenseOpen}
        onOpenChange={(open) => {
          if (!open && !expenseSaving) {
            setExpenseItemName("");
            setExpenseAmount("");
            setExpenseCategory("");
            setExpenseDate(new Date().toISOString().split("T")[0]!);
          }
          setExpenseOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Cash Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-item-name">Item Name</Label>
              <Input
                id="expense-item-name"
                placeholder="e.g., Rickshaw Fare"
                value={expenseItemName}
                onChange={(e) => setExpenseItemName(e.target.value)}
                disabled={expenseSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount ({currencySymbol})</Label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 50.00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                disabled={expenseSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-category">Category</Label>
              <Select value={expenseCategory} onValueChange={setExpenseCategory} disabled={expenseSaving}>
                <SelectTrigger id="expense-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Health">Health</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-date">Date</Label>
              <Input
                id="expense-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                disabled={expenseSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExpenseOpen(false)}
              disabled={expenseSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleAddExpense} disabled={expenseSaving}>
              {expenseSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging...
                </>
              ) : (
                "Log Expense"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Debt Dialog */}
      <Dialog open={debtOpen} onOpenChange={setDebtOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Debt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="debt-type">Type</Label>
              <Select value={debtType} onValueChange={(value) => setDebtType(value as typeof debtType)} disabled={debtSaving}>
                <SelectTrigger id="debt-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debt_given">I Lent (Given to)</SelectItem>
                  <SelectItem value="debt_taken">I Borrowed (Taken from)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-entity">
                {debtType === "debt_given" ? "Who did you lend to?" : "Who did you borrow from?"}
              </Label>
              <Input
                id="debt-entity"
                placeholder={debtType === "debt_given" ? "e.g., John, Friend" : "e.g., Bank, Family"}
                value={debtEntity}
                onChange={(e) => setDebtEntity(e.target.value)}
                disabled={debtSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-amount">Amount ({currencySymbol})</Label>
              <Input
                id="debt-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 10000"
                value={debtAmount}
                onChange={(e) => setDebtAmount(e.target.value)}
                disabled={debtSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDebtOpen(false)}
              disabled={debtSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleAddDebt} disabled={debtSaving}>
              {debtSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Debt"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog
        open={paymentOpen}
        onOpenChange={(open) => {
          if (!open && !paymentSaving) {
            setPaymentDebtId(null);
            setPaymentAmount("");
            setPaymentNote("");
            setPaymentDate(new Date().toISOString().split("T")[0]!);
          }
          setPaymentOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount Paid ({currencySymbol})</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 300.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                disabled={paymentSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-date">Date</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={paymentSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-note">Note (Optional)</Label>
              <Textarea
                id="payment-note"
                placeholder="e.g., First installment payment"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                disabled={paymentSaving}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentOpen(false)}
              disabled={paymentSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={paymentSaving}>
              {paymentSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open && !editSaving) {
            setEditingTransaction(null);
            setEditItemName("");
            setEditAmount("");
            setEditCategory("");
            setEditDate("");
            setEditEntityName("");
          }
          setEditOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <div className="space-y-4">
              {editingTransaction.transaction_type?.startsWith("debt_") && (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    ⚠️ Warning: Changing the amount won't affect payments already recorded.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-name">
                  {editingTransaction.transaction_type?.startsWith("debt_") ? "Description" : "Item Name"}
                </Label>
                <Input
                  id="edit-name"
                  placeholder="Enter name"
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  disabled={editSaving}
                />
              </div>

              {editingTransaction.transaction_type?.startsWith("debt_") && (
                <div className="space-y-2">
                  <Label htmlFor="edit-entity">Entity Name</Label>
                  <Input
                    id="edit-entity"
                    placeholder="Who gave/took the money"
                    value={editEntityName}
                    onChange={(e) => setEditEntityName(e.target.value)}
                    disabled={editSaving}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-amount">Amount ({currencySymbol})</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter amount"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  disabled={editSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory} disabled={editSaving}>
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {editingTransaction.transaction_type === "income" ? (
                      <>
                        <SelectItem value="Income">Income</SelectItem>
                        <SelectItem value="Salary">Salary</SelectItem>
                        <SelectItem value="Bonus">Bonus</SelectItem>
                        <SelectItem value="Gift">Gift</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </>
                    ) : editingTransaction.transaction_type?.startsWith("debt_") ? (
                      <SelectItem value="Debt">Debt</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="Food">Food</SelectItem>
                        <SelectItem value="Transport">Transport</SelectItem>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Health">Health</SelectItem>
                        <SelectItem value="Entertainment">Entertainment</SelectItem>
                        <SelectItem value="Shopping">Shopping</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  disabled={editSaving}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto sm:mr-auto"
              onClick={() => {
                setEditOpen(false);
                if (editingTransaction) {
                  handleDeleteClick(editingTransaction);
                }
              }}
              disabled={editSaving}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Entry
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={editSaving}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={editSaving} className="flex-1 sm:flex-none">
                {editSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button for Mobile */}
      <FloatingActionBtn onClick={handleFabClick} />
    </div>
  );
}
