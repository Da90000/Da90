"use client";

import { ShoppingCart, TrendingUp, FileText, Wifi, Coffee, Utensils, Car, CircleDollarSign, Zap, Home, Smartphone, Gift, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/currency-context";

interface TransactionCardProps {
    title: string;
    subtitle: string;
    amount: number;
    category: string;
    type: "income" | "expense" | "debt_given" | "debt_taken";
    onClick?: () => void;
}

const getCategoryStyles = (category: string, type: string) => {
    const lowerCat = category.toLowerCase();

    // Income Specific
    if (type === "income") {
        return {
            bg: "bg-emerald-100 dark:bg-emerald-900/30",
            text: "text-emerald-600 dark:text-emerald-400",
            icon: TrendingUp
        };
    }

    // Debt Specific
    if (type.startsWith("debt")) {
        return {
            bg: "bg-rose-100 dark:bg-rose-900/30",
            text: "text-rose-600 dark:text-rose-400",
            icon: CircleDollarSign
        }
    }

    // Expense Categories
    if (lowerCat.includes("shop") || lowerCat.includes("grocer") || lowerCat.includes("buy")) {
        return {
            bg: "bg-orange-100 dark:bg-orange-900/30",
            text: "text-orange-600 dark:text-orange-400",
            icon: ShoppingCart
        };
    }

    if (lowerCat.includes("bill") || lowerCat.includes("util") || lowerCat.includes("internet") || lowerCat.includes("wifi")) {
        return {
            bg: "bg-blue-100 dark:bg-blue-900/30",
            text: "text-blue-600 dark:text-blue-400",
            icon: lowerCat.includes("wifi") || lowerCat.includes("internet") ? Wifi : FileText
        };
    }

    if (lowerCat.includes("food") || lowerCat.includes("snack") || lowerCat.includes("restau") || lowerCat.includes("eat")) {
        return {
            bg: "bg-purple-100 dark:bg-purple-900/30",
            text: "text-purple-600 dark:text-purple-400",
            icon: lowerCat.includes("snack") ? Coffee : Utensils
        };
    }

    if (lowerCat.includes("transport") || lowerCat.includes("car") || lowerCat.includes("fuel") || lowerCat.includes("uber") || lowerCat.includes("taxi")) {
        return {
            bg: "bg-indigo-100 dark:bg-indigo-900/30",
            text: "text-indigo-600 dark:text-indigo-400",
            icon: Car
        };
    }

    if (lowerCat.includes("electric") || lowerCat.includes("power")) {
        return {
            bg: "bg-yellow-100 dark:bg-yellow-900/30",
            text: "text-yellow-600 dark:text-yellow-400",
            icon: Zap
        }
    }

    if (lowerCat.includes("home") || lowerCat.includes("rent") || lowerCat.includes("house")) {
        return {
            bg: "bg-teal-100 dark:bg-teal-900/30",
            text: "text-teal-600 dark:text-teal-400",
            icon: Home
        }
    }

    // Default
    return {
        bg: "bg-gray-100 dark:bg-zinc-800",
        text: "text-gray-600 dark:text-zinc-400",
        icon: CircleDollarSign
    };
};

export function TransactionCard({ title, subtitle, amount, category, type, onClick }: TransactionCardProps) {
    const { formatPrice } = useCurrency();
    const styles = getCategoryStyles(category, type);
    const Icon = styles.icon;

    const isIncome = type === "income";
    const isExpense = type === "expense";

    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center gap-4 p-3 bg-card rounded-2xl border border-border/40 shadow-sm hover:shadow-md transition-all cursor-pointer group",
                onClick ? "active:scale-[0.98]" : ""
            )}
        >
            {/* Icon Box */}
            <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                styles.bg,
                styles.text
            )}>
                <Icon className="h-6 w-6" />
            </div>

            {/* Text Info */}
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-base text-foreground truncate">{title}</h4>
                <p className="text-xs text-muted-foreground font-medium truncate">{subtitle}</p>
            </div>

            {/* Amount */}
            <div className={cn(
                "text-right font-bold whitespace-nowrap",
                isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
            )}>
                {isIncome ? "+" : "-"}{formatPrice(amount)}
            </div>
        </div>
    );
}
