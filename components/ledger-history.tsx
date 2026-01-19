"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
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
import { Skeleton } from "@/components/ui/skeleton";

interface LedgerRow {
  id: string;
  created_at: string;
  item_name: string;
  category: string;
  amount: number;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

const LEDGER_LOADING_ROWS = 5;

export function LedgerHistory() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("ledger")
        .select("id, created_at, item_name, category, amount")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Ledger fetch error:", error);
        setRows([]);
      } else {
        setRows((data as LedgerRow[]) ?? []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const totalSpent = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="max-w-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Spent
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-9 w-28" />
          ) : (
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatAmount(totalSpent)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Expense: Table on md+, Card stack on mobile */}
      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: stacked cards — block md:hidden */}
          <div className="block space-y-3 p-4 md:hidden">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <Skeleton className="mb-2 h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="mt-2 h-5 w-20" />
                </div>
              ))
            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No expenses yet</p>
            ) : (
              rows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <p className="font-medium text-foreground">{r.item_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(r.created_at)} · {r.category}
                  </p>
                  <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
                    {formatAmount(Number(r.amount))}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Desktop: table — hidden md:block */}
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
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No expenses yet
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(r.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">{r.item_name}</TableCell>
                      <TableCell>{r.category}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(Number(r.amount))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
