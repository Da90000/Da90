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
    quantity: Number(row.quantity) || 0,
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
 * Fetches dashboard stats via three parallel queries:
 * 1. Spending: ledger for current month, sum of amount
 * 2. Maintenance: maintenance_items, count where getDaysOverdue > 0
 * 3. Recent Activity: 5 most recent ledger entries
 */
export async function fetchDashboardStats(): Promise<{
  monthSpend: number;
  overdueCount: number;
  recentTx: LedgerEntry[];
}> {
  const empty = { monthSpend: 0, overdueCount: 0, recentTx: [] };

  if (!supabase) {
    console.warn("Supabase client not initialized. Skipping fetch.");
    return empty;
  }

  const { start, end } = getCurrentMonthRange();

  const [spendingRes, maintenanceRes, recentRes] = await Promise.all([
    supabase
      .from("ledger")
      .select("amount")
      .gte("created_at", start)
      .lte("created_at", end),
    supabase
      .from("maintenance_items")
      .select("id, last_service_date, service_interval_days"),
    supabase
      .from("ledger")
      .select("id, created_at, item_name, category, amount, quantity")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  let monthSpend = 0;
  if (!spendingRes.error && spendingRes.data) {
    const rows = spendingRes.data as { amount?: number }[];
    monthSpend = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  } else if (spendingRes.error) {
    console.error("Dashboard spending fetch error:", spendingRes.error);
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

  return { monthSpend, overdueCount, recentTx };
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
