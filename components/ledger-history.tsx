"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Plus, CheckCircle2 } from "lucide-react";
import { fetchLedger, addTransaction, settleDebt, type LedgerEntry, type TransactionType } from "@/lib/ledger-store";
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
import { cn } from "@/lib/utils";

function formatCurrency(value: number): string {
  return `৳${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
      item.transaction_type === "debt_given" || item.transaction_type === "debt_taken"
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

  const handleSettleDebt = async (id: string) => {
    try {
      const { success, error } = await settleDebt(id);
      if (success) {
        toast({ title: "Debt marked as settled" });
        await loadData();
      } else {
        toast({
          title: "Failed to settle debt",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Settle debt error:", error);
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
      <TableCell className="text-right tabular-nums">{formatCurrency(r.amount)}</TableCell>
    </>
  );

  const renderIncomeRow = (r: LedgerEntry) => (
    <>
      <TableCell className="text-muted-foreground">{formatDate(r.date)}</TableCell>
      <TableCell className="font-medium text-emerald-700 dark:text-emerald-400">{r.itemName || "—"}</TableCell>
      <TableCell>{r.category}</TableCell>
      <TableCell className="text-right tabular-nums text-emerald-700 dark:text-emerald-400">
        +{formatCurrency(r.amount)}
      </TableCell>
    </>
  );

  const renderDebtRow = (r: LedgerEntry) => {
    const isGiven = r.transaction_type === "debt_given";
    const isSettled = r.is_settled === true;
    return (
      <>
        <TableCell className="text-muted-foreground">{formatDate(r.date)}</TableCell>
        <TableCell className={`font-medium ${isSettled ? "line-through text-muted-foreground" : isGiven ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>
          {isGiven ? `Given to ${r.entity_name || r.itemName}` : `Borrowed from ${r.entity_name || r.itemName}`}
        </TableCell>
        <TableCell>{r.category}</TableCell>
        <TableCell className={`text-right tabular-nums ${isSettled ? "text-muted-foreground" : isGiven ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>
          {isGiven ? "-" : "+"}{formatCurrency(r.amount)}
        </TableCell>
        <TableCell className="text-right">
          {!isSettled && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSettleDebt(r.id)}
              className="gap-1"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Settled
            </Button>
          )}
        </TableCell>
      </>
    );
  };

  const renderMobileCard = (r: LedgerEntry, type: ViewType) => {
    const isGiven = r.transaction_type === "debt_given";
    const isSettled = r.is_settled === true;
    const isIncome = type === "income";
    const isDebt = type === "debt";
    
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
          </div>
          <div className="text-right">
            <p className={cn(
              "text-lg font-semibold tabular-nums",
              isSettled && "text-muted-foreground",
              !isSettled && isIncome && "text-emerald-700 dark:text-emerald-400",
              !isSettled && isDebt && (isGiven ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"),
              !isSettled && !isIncome && !isDebt && "text-foreground"
            )}>
              {isIncome ? "+" : isDebt && !isGiven ? "+" : isDebt ? "-" : ""}{formatCurrency(r.amount)}
            </p>
            {isDebt && !isSettled && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSettleDebt(r.id)}
                className="mt-2 gap-1 text-xs"
              >
                <CheckCircle2 className="h-3 w-3" />
                Settle
              </Button>
            )}
          </div>
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
            Expenses
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
        {view === "income" && (
          <Button onClick={() => setIncomeOpen(true)} size="lg" className="gap-2 w-full sm:w-auto">
            <Plus className="h-5 w-5" />
            Add Income
          </Button>
        )}
        {view === "debt" && (
          <Button onClick={() => setDebtOpen(true)} size="lg" className="gap-2 w-full sm:w-auto">
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
                  {formatCurrency(totalExpenses)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense History</CardTitle>
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
                  {formatCurrency(totalIncome)}
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
                  {totalDebt >= 0 ? "-" : "+"}{formatCurrency(Math.abs(totalDebt))}
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
              <Label htmlFor="income-amount">Amount (৳)</Label>
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
              <Label htmlFor="debt-amount">Amount (৳)</Label>
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
    </div>
  );
}
