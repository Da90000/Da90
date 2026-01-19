"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  CreditCard,
  Home,
  Loader2,
  Smartphone,
  Zap,
  CheckCircle2,
} from "lucide-react";
import {
  fetchBills,
  logBillPayment,
  type BillWithDue,
} from "@/lib/bills-store";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

function getBillIcon(name: string) {
  const n = name.toLowerCase();
  if (/rent|mortgage|housing|lease/.test(n)) return Home;
  if (/electric|gas|water|utility|utilities/.test(n)) return Zap;
  if (/internet|phone|mobile|broadband|streaming/.test(n)) return Smartphone;
  return CreditCard;
}

function borderClass(daysRemaining: number, paid: boolean): string {
  if (paid) return "border-border/50 bg-muted/30 opacity-75";
  if (daysRemaining <= 1) return "border-destructive/70 bg-destructive/5";
  if (daysRemaining <= 3) return "border-amber-500/60 bg-amber-500/5";
  return "border-border bg-card";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function BillTracker() {
  const [bills, setBills] = useState<BillWithDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [paidThisSession, setPaidThisSession] = useState<Set<string>>(new Set());
  const [payOpen, setPayOpen] = useState(false);
  const [payBill, setPayBill] = useState<BillWithDue | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [paySaving, setPaySaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchBills();
    setBills(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalMonthly = bills.reduce((sum, b) => sum + b.amount, 0);

  const handleMarkPaidClick = (bill: BillWithDue) => {
    setPayBill(bill);
    setPayAmount(String(bill.amount));
    setPayOpen(true);
  };

  const handlePayConfirm = async () => {
    if (!payBill) return;
    const amount = Number.parseFloat(payAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setPaySaving(true);
    try {
      const ok = await logBillPayment(payBill.name, amount);
      if (ok) {
        toast({ title: "Paid & Logged" });
        setPaidThisSession((s) => new Set(s).add(payBill.id));
        setPayOpen(false);
        setPayBill(null);
      } else {
        toast({ title: "Failed to log payment", variant: "destructive" });
      }
    } finally {
      setPaySaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <header>
          <Skeleton className="mb-1 h-7 w-56" />
          <Skeleton className="h-10 w-36" />
        </header>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header: Title + Total Monthly Sum (prominent) */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Monthly Fixed Costs
        </h1>
        <p className="mt-1 text-4xl font-bold tabular-nums text-foreground md:text-5xl">
          {formatCurrency(totalMonthly)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Total burn rate per month</p>
      </header>

      {/* Bill cards: mobile-first stack */}
      <div className="space-y-3">
        {bills.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No recurring bills yet.</p>
              <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
                If the table is missing, run{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">supabase/migrations/recurring_bills.sql</code>{" "}
                in the Supabase SQL Editor. Then add rows to <code className="rounded bg-muted px-1.5 py-0.5 text-xs">recurring_bills</code>.
              </p>
            </CardContent>
          </Card>
        ) : (
          bills.map((bill) => {
            const Icon = getBillIcon(bill.name);
            const paid = paidThisSession.has(bill.id);
            return (
              <Card
                key={bill.id}
                className={`overflow-hidden transition-all ${borderClass(bill.daysRemaining, paid)}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium text-foreground ${paid ? "line-through text-muted-foreground" : ""}`}>
                          {bill.name}
                        </p>
                        <Badge
                          variant="secondary"
                          className="mt-1 text-[10px] font-medium"
                        >
                          Due {format(bill.nextDue, "MMM d")}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className={`text-lg font-semibold tabular-nums ${paid ? "text-muted-foreground" : "text-foreground"}`}>
                        {formatCurrency(bill.amount)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => handleMarkPaidClick(bill)}
                        disabled={paid}
                      >
                        {paid ? (
                          <CheckCircle2 className="mr-1.5 h-4 w-4 text-muted-foreground" />
                        ) : null}
                        {paid ? "Paid" : "Mark Paid"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Mark Paid: confirm amount dialog */}
      <Dialog
        open={payOpen}
        onOpenChange={(open) => {
          if (!open) setPayBill(null);
          setPayOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {payBill && (
              <p className="text-sm text-muted-foreground">
                Confirm the amount for <span className="font-medium text-foreground">{payBill.name}</span>. It will be logged to the ledger as a Bill (Recurring).
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount ($)</Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPayOpen(false)}
              disabled={paySaving}
            >
              Cancel
            </Button>
            <Button onClick={handlePayConfirm} disabled={paySaving}>
              {paySaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging…
                </>
              ) : (
                "Paid & Log"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
