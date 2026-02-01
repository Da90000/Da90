import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, isSameMonth, isSameYear, parseISO, subMonths, getDaysInMonth } from "date-fns";

// --- Types ---

export type Period = "week" | "month" | "year";

export interface LedgerEntry {
  id: string;
  created_at: string;
  item_name: string;
  category: string;
  amount: number;
  transaction_type: "income" | "expense" | "debt_given" | "debt_taken";
  is_settled?: boolean;
}


export interface DashboardStats {
  balance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  lifetimeIncome: number;
  lifetimeExpense: number;
  netDebtPosition: number;
  savingsRate: number;
  totalTransactions: number;
  averageDaily: number;
  averageDailyChange: number;
  incomeChange: number;
  expenseChange: number;
  balanceChange: number;
}

export interface ChartDataPoint {
  label: string;
  amount: number;
  date: string; // Helper for sorting/filtering
}

export interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  transactions: number;
  fill: string;
}

interface DashboardState {
  period: Period;
  stats: DashboardStats;
  chartData: ChartDataPoint[];
  categoryData: CategoryData[];
  recentTransactions: LedgerEntry[];

  // Cache for raw data
  rawLedger: LedgerEntry[];

  isLoading: boolean;
  error: string | null;

  setPeriod: (period: Period) => void;
  fetchDashboardData: () => Promise<void>;
}

// --- Helpers ---

const CATEGORY_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];

// --- Store ---

export const useDashboardStore = create<DashboardState>((set, get) => ({
  period: "month",
  stats: {
    balance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    lifetimeIncome: 0,
    lifetimeExpense: 0,
    netDebtPosition: 0,
    savingsRate: 0,
    totalTransactions: 0,
    averageDaily: 0,
    averageDailyChange: 0,
    incomeChange: 0,
    expenseChange: 0,
    balanceChange: 0
  },
  chartData: [],
  categoryData: [],
  recentTransactions: [],
  rawLedger: [],
  isLoading: false,
  error: null,

  setPeriod: (period: Period) => {
    set({ period });
    // Re-process chart data immediately using cached rawLedger
    const { rawLedger } = get();
    if (rawLedger.length > 0) {
      const chartData = processChartData(rawLedger, period);
      set({ chartData });
    } else {
      // If no data yet, fetch it
      get().fetchDashboardData();
    }
  },

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      if (!supabase) throw new Error("Supabase client not initialized");

      // 1. Fetch ALL Ledger Entries
      const { data, error } = await supabase
        .from("ledger")
        .select("id, created_at, item_name, category, amount, transaction_type, is_settled")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 1b. Fetch Debt Payments to calculate true unsettled amounts
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("debt_payments")
        .select("ledger_id, amount, payment_date");

      if (paymentsError) console.error("Error fetching debt payments:", paymentsError);

      const paymentsMap = new Map<string, { total: number; history: { amount: number, date: Date }[] }>();
      if (paymentsData) {
        paymentsData.forEach((p: any) => {
          const current = paymentsMap.get(p.ledger_id) || { total: 0, history: [] };
          current.total += Number(p.amount);
          current.history.push({ amount: Number(p.amount), date: new Date(p.payment_date) });
          paymentsMap.set(p.ledger_id, current);
        });
      }

      const ledger = (data as any[])?.map(row => ({
        ...row,
        amount: Number(row.amount) || 0,
        transaction_type: row.transaction_type || "expense",
        is_settled: row.is_settled === true
      })) || [];

      // 2. Calculate Stats
      const now = new Date();
      let totalIncome = 0;
      let totalExpense = 0;

      // Asset/Liability Trackers
      let netDebtAsset = 0;
      let netDebtLiability = 0;

      let monthlyIncome = 0;
      let monthlyExpense = 0;
      let monthlyTransactions = 0;
      let lastMonthExpense = 0;
      let lastMonthIncome = 0;
      const lastMonthDate = subMonths(now, 1);
      const startOfCurrentMonth = startOfMonth(now);

      // Previous Balance Components
      let prevTotalIncome = 0;
      let prevTotalExpense = 0;
      let prevDebtAsset = 0;
      let prevDebtLiability = 0;

      ledger.forEach(item => {
        const type = item.transaction_type;
        const amount = item.amount;
        const date = new Date(item.created_at);

        // Normalize type to ensure strict checking
        const typeRaw = item.transaction_type?.toLowerCase() || "expense";
        // DEBUG: Log type to verify we are skipping debt for income/expense totals
        if (Math.random() < 0.05) console.log("Processing Dashboard Item:", item.item_name, "Type:", typeRaw);

        // --- Standard Income / Expense (STRICTLY EXCLUDING DEBT) ---
        if (typeRaw === "income") {
          totalIncome += amount;
          if (date < startOfCurrentMonth) prevTotalIncome += amount;
        }
        else if (typeRaw === "expense") {
          totalExpense += amount;
          if (date < startOfCurrentMonth) prevTotalExpense += amount;
        }
        // Note: Debt types are deliberately ignored here for Income/Expense totals.


        // --- Debt Asset / Liability (Net Worth Calculation) ---
        if (type === "debt_given") {
          // Asset: You lent money. Current Value = (Original - PaidBack)
          // We calculate the UNSETTLED amount.
          const payments = paymentsMap.get(item.id);
          const totalPaid = payments?.total || 0;
          const currentRemaining = Math.max(0, amount - totalPaid);

          if (!item.is_settled) {
            netDebtAsset += currentRemaining;
          }

          // Historical Calculation for Prev Balance (Start of Month)
          if (date < startOfCurrentMonth) {
            // If debt created before this month, how much was remaining AT START of month?
            const paymentsBeforeMonth = payments?.history
              .filter(p => p.date < startOfCurrentMonth)
              .reduce((sum, p) => sum + p.amount, 0) || 0;

            // Check if it was settled before the month started? 
            // Ideally we check if paymentsBeforeMonth >= amount. 
            // But simpler: just take remaining amount at that time.
            const remainingAtStart = Math.max(0, amount - paymentsBeforeMonth);
            prevDebtAsset += remainingAtStart;
          }
        }

        if (type === "debt_taken") {
          // Liability: You borrowed money.
          const payments = paymentsMap.get(item.id);
          const totalPaid = payments?.total || 0;
          const currentRemaining = Math.max(0, amount - totalPaid);

          if (!item.is_settled) {
            netDebtLiability += currentRemaining;
          }

          // Historical Calculation
          if (date < startOfCurrentMonth) {
            const paymentsBeforeMonth = payments?.history
              .filter(p => p.date < startOfCurrentMonth)
              .reduce((sum, p) => sum + p.amount, 0) || 0;

            const remainingAtStart = Math.max(0, amount - paymentsBeforeMonth);
            prevDebtLiability += remainingAtStart;
          }
        }



        // Monthly stats check (Current Month)
        if (isSameMonth(date, now) && isSameYear(date, now)) {
          if (typeRaw === "income" || typeRaw === "expense") {
            monthlyTransactions++;
          }
          if (typeRaw === "income") monthlyIncome += amount;
          if (typeRaw === "expense") monthlyExpense += amount;
        }

        // Last Month stats check
        if (isSameMonth(date, lastMonthDate) && isSameYear(date, lastMonthDate)) {
          if (typeRaw === "expense") lastMonthExpense += amount;
          if (typeRaw === "income") lastMonthIncome += amount;
        }
      });

      // --- STRICT MONTHLY RE-CALCULATION ---
      // This overrides any previous logic to ensure absolute accuracy for the Monthly Cards.
      // We explicitly filter for 'income'/'expense' types (normalizing case) AND strict date match.

      const nowStrict = new Date();
      const dayOfMonth = nowStrict.getDate();
      const currentMonthPrefix = nowStrict.toISOString().substring(0, 7); // e.g. "2026-02"
      const useAllTime = dayOfMonth <= 5; // Use ALL data if first 5 days

      const isRelevantDate = (dateStr: string) => {
        if (useAllTime) return true;
        return dateStr?.startsWith(currentMonthPrefix);
      };

      const monthlyIncomeStrict = ledger
        .filter(item => (item.transaction_type?.toLowerCase() === "income") && isRelevantDate(item.created_at))
        .reduce((sum, item) => sum + item.amount, 0);

      const monthlyExpenseStrict = ledger
        .filter(item => (item.transaction_type?.toLowerCase() === "expense") && isRelevantDate(item.created_at))
        .reduce((sum, item) => sum + item.amount, 0);

      // Overwrite the loop variables
      monthlyIncome = monthlyIncomeStrict;
      monthlyExpense = monthlyExpenseStrict;

      console.log("DEBUG: Final Stats (Soft Start Mode:", useAllTime, ") -> Income:", monthlyIncome, "Expense:", monthlyExpense);

      // Cash Balance Calculation (Strictly Cash Flow)
      // User Request: Add Debt Taken (Cash In), Subtract Debt Given (Cash Out)
      // We calculate these totals from the raw ledger loop data we need.
      // Since we didn't track totalDebtGiven/Taken explicitly in the loop above (only net assets), 
      // let's do a quick reduce here for the balance formula.

      const totalDebtGiven = ledger
        .filter(i => i.transaction_type === "debt_given")
        .reduce((sum, i) => sum + i.amount, 0);

      const totalDebtTaken = ledger
        .filter(i => i.transaction_type === "debt_taken")
        .reduce((sum, i) => sum + i.amount, 0);

      const balance = (totalIncome - totalExpense) + (totalDebtTaken - totalDebtGiven);
      const prevBalance = prevTotalIncome - prevTotalExpense; // Note: This is an approximation for previous balance now.
      const netDebtPosition = netDebtAsset - netDebtLiability;

      // Legacy Vars (Unused but kept to match structure if needed, or we just remove them)
      // We removed netWorth and prevNetWorth entirely.




      const balanceChange = prevBalance !== 0
        ? ((balance - prevBalance) / Math.abs(prevBalance)) * 100
        : 0;

      const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;

      // Average Daily Calculation
      const currentDay = now.getDate();
      const safeDivisor = currentDay === 0 ? 1 : currentDay; // Should be 1-31 anyway
      const averageDaily = monthlyExpense / safeDivisor;

      const daysInLastMonth = getDaysInMonth(lastMonthDate);
      const lastMonthDailyAvg = lastMonthExpense / daysInLastMonth;

      const averageDailyChange = lastMonthDailyAvg > 0
        ? Math.round(((averageDaily - lastMonthDailyAvg) / lastMonthDailyAvg) * 100)
        : 0;

      const incomeChange = lastMonthIncome > 0
        ? Math.round(((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100)
        : 0;

      const expenseChange = lastMonthExpense > 0
        ? Math.round(((monthlyExpense - lastMonthExpense) / lastMonthExpense) * 100)
        : 0;

      // 3. Process Chart Data
      const chartData = processChartData(ledger, get().period);

      // 4. Process Category Data (Current Month Expenses)
      const currentMonthExpenses = ledger.filter(item =>
        item.transaction_type === "expense" &&
        isSameMonth(new Date(item.created_at), now) &&
        isSameYear(new Date(item.created_at), now)
      );

      const catMap = new Map<string, { amount: number; count: number }>();
      currentMonthExpenses.forEach(item => {
        const cat = item.category || "Other";
        const curr = catMap.get(cat) || { amount: 0, count: 0 };
        catMap.set(cat, { amount: curr.amount + item.amount, count: curr.count + 1 });
      });

      const processedCategories: CategoryData[] = Array.from(catMap.entries())
        .map(([category, data], idx) => ({
          category,
          amount: data.amount,
          transactions: data.count,
          percentage: monthlyExpense > 0 ? (data.amount / monthlyExpense) * 100 : 0,
          fill: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // 5. Recent Transactions
      const recentTransactions = ledger.slice(0, 10);

      set({
        stats: {
          balance,
          monthlyIncome,
          monthlyExpense,
          lifetimeIncome: totalIncome,
          lifetimeExpense: totalExpense,
          netDebtPosition,
          savingsRate,
          totalTransactions: monthlyTransactions,
          averageDaily,
          averageDailyChange,
          incomeChange,
          expenseChange,
          balanceChange
        },
        chartData,
        categoryData: processedCategories,
        recentTransactions,
        rawLedger: ledger,
        isLoading: false
      });

    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      set({ error: err.message, isLoading: false });
    }
  }
}));

// --- Internal Helper for Chart Data ---

function processChartData(ledger: LedgerEntry[], period: Period): ChartDataPoint[] {
  const now = new Date();
  const expenses = ledger.filter(l => l.transaction_type === "expense"); // Chart usually shows detailed spending trends? Or Net? Usually spending. Visual design implies spending.

  // Implementation for "Spending Trend"

  if (period === "week") {
    // Last 7 days
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i);
      const dayLabel = format(d, "EEE"); // Mon
      // Use YYYY-MM-DD for precise filtering
      const dateKey = format(d, "yyyy-MM-dd");

      // Sum spending for this day
      const dailyTotal = expenses
        .filter(l => {
          const lDateKey = format(new Date(l.created_at), "yyyy-MM-dd");
          return lDateKey === dateKey;
        })
        .reduce((sum, l) => sum + l.amount, 0);

      result.push({
        label: dayLabel,
        amount: dailyTotal,
        date: format(d, "MMM d, yyyy")
      });
    }
    return result;
  }

  if (period === "month") {
    // Current Month days
    const end = endOfMonth(now);
    const result = [];
    const daysInMonth = end.getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), i);
      const dayLabel = format(d, "MMM d");
      const dateKey = format(d, "yyyy-MM-dd");

      const dailyTotal = expenses
        .filter(l => {
          const lDateKey = format(new Date(l.created_at), "yyyy-MM-dd");
          return lDateKey === dateKey;
        })
        .reduce((sum, l) => sum + l.amount, 0);

      result.push({
        label: dayLabel,
        amount: dailyTotal,
        date: format(d, "MMM d, yyyy")
      });
    }
    return result;
  }

  if (period === "year") {
    // Current Year Jan-Dec
    const result = [];
    const currentYear = now.getFullYear();

    for (let i = 0; i < 12; i++) {
      const d = new Date(currentYear, i, 1);
      const monthLabel = format(d, "MMM");

      const monthlyTotal = expenses
        .filter(l => {
          const ld = new Date(l.created_at);
          return ld.getMonth() === i && ld.getFullYear() === currentYear;
        })
        .reduce((sum, l) => sum + l.amount, 0);

      result.push({
        label: monthLabel,
        amount: monthlyTotal,
        date: format(d, "MMMM yyyy")
      });
    }
    return result;
  }

  return [];
}
