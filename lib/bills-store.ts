import { supabase } from "@/lib/supabase";

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  day_of_month: number;
}

export interface BillWithDue extends RecurringBill {
  nextDue: Date;
  daysRemaining: number;
}

/**
 * If today's day <= dayOfMonth: due is this month on dayOfMonth.
 * If today's day > dayOfMonth: due is next month on dayOfMonth.
 * Clamps dayOfMonth to the last day of the target month (e.g. Feb 31 -> Feb 28/29).
 */
export function calculateNextDueDate(dayOfMonth: number): Date {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const d = now.getDate();

  let targetYear = year;
  let targetMonth = month;

  if (d <= dayOfMonth) {
    targetMonth = month;
  } else {
    targetMonth = month + 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear = year + 1;
    }
  }

  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(Math.max(1, dayOfMonth), lastDay);
  const due = new Date(targetYear, targetMonth, day);
  due.setHours(0, 0, 0, 0);
  return due;
}

/** Whole days from today (00:00) to due (00:00). 0 = due today, 1 = tomorrow, etc. */
export function getDaysRemaining(due: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Fetches all rows from recurring_bills, computes next due and days remaining,
 * and sorts by days remaining (soonest first).
 */
export async function fetchBills(): Promise<BillWithDue[]> {
  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping fetch.");
    return [];
  }

  const { data, error } = await supabase
    .from("recurring_bills")
    .select("id, name, amount, day_of_month")
    .order("day_of_month", { ascending: true });

  if (error) {
    const e = error as { message?: string; code?: string; details?: string; hint?: string };
    const msg = e?.message ?? JSON.stringify(error);
    console.warn(
      `recurring_bills fetch error: ${msg}${e?.code ? ` [${e.code}]` : ""}. ` +
        "If the table does not exist, run supabase/migrations/recurring_bills.sql in the Supabase SQL Editor."
    );
    return [];
  }
  if (!data || !Array.isArray(data)) return [];

  const withDue: BillWithDue[] = (data as Record<string, unknown>[]).map((row) => {
    const day = Math.max(1, Math.min(31, Number(row.day_of_month) || 1));
    const amount = Number(row.amount) || 0;
    const nextDue = calculateNextDueDate(day);
    return {
      id: String(row.id ?? ""),
      name: String(row.name ?? ""),
      amount,
      day_of_month: day,
      nextDue,
      daysRemaining: getDaysRemaining(nextDue),
    };
  });

  withDue.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return withDue;
}

/**
 * Inserts a bill payment into the ledger (category: "Bill", item_name includes "Recurring").
 * Returns true on success.
 */
export async function logBillPayment(billName: string, amount: number): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("ledger").insert({
    item_name: `${billName} (Recurring)`,
    category: "Bill",
    quantity: 1,
    amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.error("logBillPayment error:", error);
    return false;
  }
  return true;
}
