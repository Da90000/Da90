import { createClient } from "@/lib/supabase/client";

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  day_of_month: number; // Internal field name, maps to 'due_day' in database
  category?: string; // Optional category field
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
  const supabase = createClient();
  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping fetch.");
    return [];
  }

  const { data, error } = await supabase
    .from("recurring_bills")
    .select("id, name, amount, due_day, category")
    .order("due_day", { ascending: true });

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
    // Map database column 'due_day' to internal 'day_of_month'
    const day = Math.max(1, Math.min(31, Number(row.due_day || row.day_of_month) || 1));
    const amount = Number(row.amount) || 0;
    const nextDue = calculateNextDueDate(day);
    return {
      id: String(row.id ?? ""),
      name: String(row.name ?? ""),
      amount,
      day_of_month: day,
      category: row.category ? String(row.category) : undefined,
      nextDue,
      daysRemaining: getDaysRemaining(nextDue),
    };
  });

  withDue.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return withDue;
}

/**
 * Adds a new recurring bill to the recurring_bills table.
 * Maps internal field names to database schema:
 * - day_of_month -> due_day (database column)
 * - category -> category (optional)
 * - user_id is automatically added from authenticated session
 * Returns { success: true, error: null } on success, or { success: false, error } on failure.
 */
export async function addBill(
  bill: Omit<RecurringBill, "id" | "created_at">
): Promise<{ success: boolean; error: unknown }> {
  try {
    const supabase = createClient();
    if (!supabase) {
      return { success: false, error: new Error("Supabase client not initialized") };
    }

    // Check if user is authenticated and get user ID
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: new Error("You must be logged in to add bills. Please sign in and try again."),
      };
    }

    // Validate day_of_month
    const dayOfMonth = Math.max(1, Math.min(31, bill.day_of_month || 1));
    const amount = Number.isFinite(bill.amount) && bill.amount >= 0 ? bill.amount : 0;

    // Map to database schema: due_day (not day_of_month), include category and user_id
    const insertPayload: {
      name: string;
      amount: number;
      due_day: number;
      category?: string;
      user_id?: string;
    } = {
      name: bill.name.trim(),
      amount,
      due_day: dayOfMonth, // CRITICAL: Database column is 'due_day', not 'day_of_month'
    };

    // Add category if provided
    if (bill.category && bill.category.trim()) {
      insertPayload.category = bill.category.trim();
    }

    // Add user_id from authenticated user
    insertPayload.user_id = user.id;

    const { data, error } = await supabase
      .from("recurring_bills")
      .insert(insertPayload)
      .select();

    if (error) {
      // Improved error logging with JSON.stringify
      console.error("Supabase Error:", JSON.stringify(error, null, 2));
      
      // Extract error details for user-friendly messages
      const errorMessage = error.message || (error as any)?.message || "Unknown error";
      const errorCode = error.code || (error as any)?.code || (error as any)?.statusCode || "unknown";
      const errorDetails = (error as any)?.details || null;
      const errorHint = (error as any)?.hint || null;
      
      // Check if it's an RLS policy error (common codes: 42501, PGRST301, etc.)
      const isRLSError = 
        errorCode === "42501" || 
        errorCode === "PGRST301" ||
        String(errorMessage)?.toLowerCase().includes("policy") || 
        String(errorMessage)?.toLowerCase().includes("permission") ||
        String(errorMessage)?.toLowerCase().includes("row-level security") ||
        String(errorMessage)?.toLowerCase().includes("new row violates");
      
      if (isRLSError) {
        return {
          success: false,
          error: new Error(
            "Permission denied. Please ensure you have an INSERT policy for authenticated users on the recurring_bills table. " +
            "Run this SQL in Supabase SQL Editor:\n\n" +
            "CREATE POLICY \"Allow authenticated insert recurring_bills\" ON recurring_bills FOR INSERT TO authenticated WITH CHECK (true);"
          ),
        };
      }
      
      // Return a user-friendly error message
      const userMessage = errorMessage || errorDetails || errorHint || "Failed to add bill. Please check your connection and try again.";
      return {
        success: false,
        error: new Error(userMessage),
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: new Error("Bill was created but no data was returned. Please refresh the page."),
      };
    }

    return { success: true, error: null };
  } catch (err) {
    // Catch any unexpected errors
    console.error("addBill unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Inserts a bill payment into the ledger (category: "Bill", item_name includes "Recurring").
 * Returns true on success.
 */
export async function logBillPayment(billName: string, amount: number): Promise<boolean> {
  const supabase = createClient();
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
