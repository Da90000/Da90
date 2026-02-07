"use client";

import { useState } from "react";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { TransactionType } from "@/lib/ledger-store";

const INCOME_CATEGORIES = [
    "Salary",
    "Business",
    "Freelance",
    "Check In",
    "Investment",
    "Gift",
    "Refund",
    "Other",
] as const;

interface UnifiedTransactionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: TransactionData) => Promise<void>;
    initialType?: "expense" | "income" | "debt";
}

export interface TransactionData {
    type: TransactionType;
    itemName: string;
    amount: number;
    category: string;
    date?: string;
    entityName?: string; // For debt transactions
    debtType?: "debt_given" | "debt_taken"; // For debt transactions
}

type TabType = "expense" | "income" | "debt";

export function UnifiedTransactionDialog({
    isOpen,
    onClose,
    onSubmit,
    initialType = "expense",
}: UnifiedTransactionDialogProps) {
    const [activeTab, setActiveTab] = useState<TabType>(initialType);
    const [itemName, setItemName] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
    const [entityName, setEntityName] = useState("");
    const [debtType, setDebtType] = useState<"debt_given" | "debt_taken">("debt_given");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset specific fields when tab changes
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setCategory("");
        // Optional: clear other fields if desired, but user might want to keep amount/date
    };

    const handleReset = () => {
        setItemName("");
        setAmount("");
        setCategory("");
        setDate(format(new Date(), "yyyy-MM-dd"));
        setEntityName("");
        setDebtType("debt_given");
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSubmitting(true);
        try {
            const data: TransactionData = {
                type: activeTab === "debt" ? debtType : activeTab,
                itemName: activeTab === "debt" ? entityName : itemName,
                amount: parseFloat(amount),
                category: activeTab === "debt" ? "Debt" : category || (activeTab === "income" ? "Income" : "Expense"),
                date,
            };

            if (activeTab === "debt") {
                data.entityName = entityName;
                data.debtType = debtType;
            }

            await onSubmit(data);
            handleReset();
            onClose();
        } catch (error) {
            console.error("Failed to submit transaction:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const tabs: { id: TabType; label: string; icon: React.ElementType; color: string }[] = [
        { id: "expense", label: "Expense", icon: TrendingDown, color: "text-rose-600" },
        { id: "income", label: "Income", icon: TrendingUp, color: "text-emerald-600" },
        { id: "debt", label: "Debt", icon: CreditCard, color: "text-blue-600" },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
                {/* Close Button */}
                {/* Close Button Removed as per user request */
                /* <button ... /> */}

                {/* Tab Switcher */}
                <div className="flex border-b border-border bg-muted/30 rounded-t-xl">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleTabChange(tab.id)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all relative",
                                    isActive
                                        ? "text-foreground bg-card"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                <Icon className={cn("h-4 w-4", isActive && tab.color)} />
                                {tab.label}
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-foreground">
                            {activeTab === "expense" && "Log Expense"}
                            {activeTab === "income" && "Add Income"}
                            {activeTab === "debt" && "Add Debt"}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {activeTab === "expense" && "Record a new expense transaction"}
                            {activeTab === "income" && "Record income received"}
                            {activeTab === "debt" && "Track money lent or borrowed"}
                        </p>
                    </div>

                    {/* Debt Type Selector (only for debt tab) */}
                    {activeTab === "debt" && (
                        <div className="space-y-2">
                            <Label>Debt Type</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDebtType("debt_given")}
                                    className={cn(
                                        "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all text-sm font-medium",
                                        debtType === "debt_given"
                                            ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
                                            : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
                                    )}
                                >
                                    <TrendingDown className="h-4 w-4" />
                                    I Lent Money
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDebtType("debt_taken")}
                                    className={cn(
                                        "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all text-sm font-medium",
                                        debtType === "debt_taken"
                                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                            : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
                                    )}
                                >
                                    <TrendingUp className="h-4 w-4" />
                                    I Borrowed
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Item Name / Entity Name */}
                    <div className="space-y-2">
                        <Label htmlFor="itemName">
                            {activeTab === "debt"
                                ? debtType === "debt_given"
                                    ? "Lent To (Person/Entity)"
                                    : "Borrowed From (Person/Entity)"
                                : activeTab === "income"
                                    ? "Income Source"
                                    : "Item / Description"}
                        </Label>
                        <Input
                            id="itemName"
                            placeholder={
                                activeTab === "debt"
                                    ? "Enter name..."
                                    : activeTab === "income"
                                        ? "Salary, Freelance, etc."
                                        : "Groceries, Rent, etc."
                            }
                            value={activeTab === "debt" ? entityName : itemName}
                            onChange={(e) =>
                                activeTab === "debt" ? setEntityName(e.target.value) : setItemName(e.target.value)
                            }
                            className="bg-input"
                            autoFocus
                            required
                        />
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-input"
                            required
                        />
                    </div>

                    {/* Category (only for expenses) */}
                    {activeTab === "expense" && (
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select value={category} onValueChange={setCategory} required>
                                <SelectTrigger className="bg-input">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Category (only for income) */}
                    {activeTab === "income" && (
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select value={category} onValueChange={setCategory} required>
                                <SelectTrigger className="bg-input">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {INCOME_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Date */}
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-input"
                            required
                        />
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className={cn(
                                "flex-1",
                                activeTab === "expense" && "bg-rose-600 hover:bg-rose-700",
                                activeTab === "income" && "bg-emerald-600 hover:bg-emerald-700",
                                activeTab === "debt" && "bg-blue-600 hover:bg-blue-700"
                            )}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Saving..." : `Add ${activeTab === "debt" ? "Debt" : activeTab === "income" ? "Income" : "Expense"}`}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
