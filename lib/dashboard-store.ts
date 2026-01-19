import { supabase } from "@/lib/supabase";
import { getDaysOverdue } from "@/lib/maintenance-store";

export interface LedgerEntry {
  id: string;
  date: string;
  itemName: string;
  category: string;
  amount: number;
  quantity: number;
}

function toLedgerEntry(row: Record<string, unknown>): LedgerEntry {
  return {
    id: String(row.id ?? ""),
    date: String(row.created_at ?? ""),
    itemName: String(row.item_name ?? ""),
    category: String(row.category ?? ""),
    amount: Number(row.amount) || 0,
    quantity: Number(row.quantity) || 1,
    transaction_type: row.transaction_type as "expense" | "income" | "debt_given" | "debt_taken" | undefined,
    entity_name: row.entity_name ? String(row.entity_name) : undefined,
    is_settled: row.is_settled === true,
  };
}

/** Start of current month (00:00) and end (23:59:59.999) as ISO strings. */
function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Fetches dashboard stats via parallel queries:
 * 1. Finance: ledger for current month, calculate income, expenses, net balance
 * 2. Debt: active (unsettled) debts
 * 3. Maintenance: maintenance_items, count where getDaysOverdue > 0
 * 4. Recent Activity: 5 most recent ledger entries
 */
export async function fetchDashboardStats(): Promise<{
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  activeDebt: number;
  overdueCount: number;
  recentTx: LedgerEntry[];
}> {
  const empty = { totalIncome: 0, totalExpenses: 0, netBalance: 0, activeDebt: 0, overdueCount: 0, recentTx: [] };

  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping fetch.");
    return empty;
  }

  const { start, end } = getCurrentMonthRange();

  const [ledgerRes, debtRes, maintenanceRes, recentRes] = await Promise.all([
    supabase
      .from("ledger")
      .select("amount, transaction_type")
      .gte("created_at", start)
      .lte("created_at", end),
    supabase
      .from("ledger")
      .select("amount, transaction_type")
      .in("transaction_type", ["debt_given", "debt_taken"])
      .or("is_settled.is.null,is_settled.eq.false"),
    supabase
      .from("maintenance_items")
      .select("id, last_service_date, service_interval_days"),
    supabase
      .from("ledger")
      .select("id, created_at, item_name, category, amount, quantity, transaction_type")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Calculate income and expenses
  let totalIncome = 0;
  let totalExpenses = 0;
  if (!ledgerRes.error && ledgerRes.data) {
    const rows = ledgerRes.data as { amount?: number; transaction_type?: string }[];
    for (const row of rows) {
      const amount = Number(row.amount) || 0;
      const type = row.transaction_type || "expense";
      if (type === "income") {
        totalIncome += amount;
      } else if (type === "expense") {
        totalExpenses += amount;
      }
    }
  } else if (ledgerRes.error) {
    console.error("Dashboard ledger fetch error:", ledgerRes.error);
  }

  const netBalance = totalIncome - totalExpenses;

  // Calculate active debt
  let activeDebt = 0;
  if (!debtRes.error && debtRes.data) {
    const rows = debtRes.data as { amount?: number; transaction_type?: string }[];
    for (const row of rows) {
      const amount = Number(row.amount) || 0;
      const type = row.transaction_type || "";
      if (type === "debt_given") {
        activeDebt += amount; // Money given out (positive)
      } else if (type === "debt_taken") {
        activeDebt -= amount; // Money borrowed (negative)
      }
    }
  } else if (debtRes.error) {
    console.error("Dashboard debt fetch error:", debtRes.error);
  }

  let overdueCount = 0;
  if (!maintenanceRes.error && maintenanceRes.data) {
    const rows = maintenanceRes.data as { last_service_date: string; service_interval_days: number }[];
    overdueCount = rows.filter(
      (r) => getDaysOverdue(r.last_service_date, r.service_interval_days) > 0
    ).length;
  } else if (maintenanceRes.error) {
    console.error("Dashboard maintenance_items fetch error:", maintenanceRes.error);
  }

  const recentTx: LedgerEntry[] = [];
  if (!recentRes.error && recentRes.data) {
    recentTx.push(...(recentRes.data as Record<string, unknown>[]).map(toLedgerEntry));
  } else if (recentRes.error) {
    console.error("Dashboard recent ledger fetch error:", recentRes.error);
  }

  return { totalIncome, totalExpenses, netBalance, activeDebt, overdueCount, recentTx };
}

/**
 * Log a quick manual cash expense to the ledger.
 */
export async function logQuickExpense(entry: {
  item_name: string;
  category: string;
  amount: number;
}): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("ledger").insert({
    item_name: entry.item_name,
    category: entry.category,
    quantity: 1,
    amount: entry.amount,
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.error("logQuickExpense error:", error);
    return false;
  }
  return true;
}
