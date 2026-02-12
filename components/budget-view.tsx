"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    CreditCard,
    Target
} from "lucide-react";
import { FloatingActionBtn } from "@/components/ui/fab";
import { useCurrency } from "@/contexts/currency-context";
import { fetchBudgets, upsertBudget, deleteBudget, type CategoryBudget } from "@/lib/budgets-store";
import { fetchLedger, type LedgerEntry } from "@/lib/ledger-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

// Common categories to suggest
const SUGGESTED_CATEGORIES = [
    "Groceries",
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Health",
    "Utilities",
    "Personal Care",
    "Education",
    "Gifts",
    "Travel"
];

function getCategoryColor(category: string) {
    const c = category.toLowerCase();
    if (c.includes("food") || c.includes("grocer")) return "bg-orange-500";
    if (c.includes("transport") || c.includes("car") || c.includes("fuel")) return "bg-blue-500";
    if (c.includes("shopping") || c.includes("cloth")) return "bg-purple-500";
    if (c.includes("entertain") || c.includes("movie")) return "bg-pink-500";
    if (c.includes("health") || c.includes("medic")) return "bg-red-500";
    if (c.includes("util") || c.includes("bill")) return "bg-yellow-500";
    return "bg-emerald-500"; // Default
}

export function BudgetView() {
    const { formatPrice } = useCurrency();
    const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog State
    const [open, setOpen] = useState(false);
    const [category, setCategory] = useState("");
    const [customCategory, setCustomCategory] = useState("");
    const [amount, setAmount] = useState("");
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const [b, l] = await Promise.all([fetchBudgets(), fetchLedger()]);
        setBudgets(b);
        setLedger(l);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const spendingMap = useMemo(() => {
        const map = new Map<string, number>();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        ledger.forEach(entry => {
            const d = new Date(entry.date);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && entry.transaction_type === 'expense') {
                const cat = entry.category || "Uncategorized";
                // Simple normalization
                map.set(cat, (map.get(cat) || 0) + entry.amount);
            }
        });
        return map;
    }, [ledger]);

    const budgetProgress = useMemo(() => {
        return budgets.map(b => {
            // Find spending for this category
            // We check for exact match or simple inclusion for robustness
            let spent = 0;

            // Exact match first
            if (spendingMap.has(b.category)) {
                spent = spendingMap.get(b.category) || 0;
            } else {
                // Fallback: sum up categories that contain the budget name (risky but handles "Food" vs "Food & Dining")
                // actually let's stick to strict matching for now to avoid double counting
                // OR iterate map keys
                for (const [key, val] of spendingMap.entries()) {
                    if (key.toLowerCase() === b.category.toLowerCase()) {
                        spent += val;
                    }
                }
            }

            return {
                ...b,
                spent,
                percent: b.amount > 0 ? Math.min(100, (spent / b.amount) * 100) : 0,
                remaining: Math.max(0, b.amount - spent),
                over: Math.max(0, spent - b.amount)
            };
        }).sort((a, b) => b.percent - a.percent);
    }, [budgets, spendingMap]);

    const handleSave = async () => {
        const finalCategory = category === "Other" ? customCategory : category;

        if (!finalCategory.trim() || !amount || Number(amount) <= 0) {
            toast({ title: "Please enter valid details", variant: "destructive" });
            return;
        }

        setSaving(true);
        const { success, error } = await upsertBudget(finalCategory.trim(), Number(amount));

        if (success) {
            haptics.success();
            toast({ title: editingId ? "Budget updated" : "Budget set" });
            setOpen(false);
            setCategory("");
            setCustomCategory("");
            setAmount("");
            setEditingId(null);
            await loadData();
        } else {
            haptics.error();
            const msg = error instanceof Error ? error.message : "Failed to save budget"
            toast({
                title: "Error",
                description: msg,
                variant: "destructive"
            });
        }
        setSaving(false);
    };

    const handleEdit = (b: CategoryBudget) => {
        if (SUGGESTED_CATEGORIES.includes(b.category)) {
            setCategory(b.category);
        } else {
            setCategory("Other");
            setCustomCategory(b.category);
        }
        setAmount(String(b.amount));
        setEditingId(b.id);
        setOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        const { success } = await deleteBudget(deleteId);
        if (success) {
            haptics.success();
            toast({ title: "Budget removed" });
            loadData();
        }
        setDeleteOpen(false);
        setDeleteId(null);
    }

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
        setDeleteOpen(true);
    }

    if (loading) return (
        <div className="space-y-4 pt-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
    );

    return (
        <div className="space-y-6 pb-24">
            {/* Header Action */}
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Target className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Set Monthly Limits</h2>
                        <p className="text-xs text-blue-700 dark:text-blue-300">Track spending vs goals</p>
                    </div>
                </div>
                <Button onClick={() => {
                    haptics.medium();
                    setEditingId(null);
                    setCategory("");
                    setCustomCategory("");
                    setAmount("");
                    setOpen(true);
                }} size="sm" className="gap-2 shadow-sm">
                    <Plus className="h-4 w-4" /> New Limit
                </Button>
            </div>

            <AnimatePresence mode="popLayout">
                {budgetProgress.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-12 text-center"
                    >
                        <div className="bg-secondary/50 p-4 rounded-full mb-4">
                            <CreditCard className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="font-semibold text-lg">No budgets yet</h3>
                        <p className="text-sm text-muted-foreground max-w-[200px] mt-2">
                            Create a budget for categories like "Food" to see your progress here.
                        </p>
                    </motion.div>
                ) : (
                    <div className="grid gap-4">
                        {budgetProgress.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-card border border-border rounded-2xl p-4 shadow-sm relative overflow-hidden group"
                            >
                                {/* Background progress fill for low opacity effect? Maybe too complex. Keep it clean. */}

                                <div className="flex justify-between items-start mb-3 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm font-bold text-lg", getCategoryColor(item.category))}>
                                            {item.category.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-base leading-none mb-1">{item.category}</h3>
                                            <p className="text-xs text-muted-foreground font-medium">
                                                <span className={cn(item.over > 0 ? "text-destructive font-bold" : "text-emerald-600")}>
                                                    {formatPrice(item.spent)}
                                                </span>
                                                <span className="opacity-70"> / {formatPrice(item.amount)}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Menu (Hidden by default, shown on hover/touch) */}
                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8 text-muted-foreground hover:bg-secondary">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1.5 relative z-10">
                                    <div className="flex justify-between text-xs font-semibold tracking-wide">
                                        <span className={cn(item.over > 0 ? "text-destructive" : "text-emerald-600")}>
                                            {item.over > 0 ? "OVER BUDGET" : `${Math.round(item.percent)}%`}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {item.over > 0 ? `+${formatPrice(item.over)}` : `${formatPrice(item.remaining)} left`}
                                        </span>
                                    </div>
                                    <Progress
                                        value={item.percent}
                                        className="h-3 rounded-full bg-secondary"
                                        indicatorClassName={cn(
                                            "transition-all duration-500",
                                            item.percent > 100 ? "bg-destructive" :
                                                item.percent > 85 ? "bg-amber-500" :
                                                    getCategoryColor(item.category) // Use brand color for progress
                                        )}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            <FloatingActionBtn onClick={() => {
                haptics.medium();
                setEditingId(null);
                setCategory("");
                setCustomCategory("");
                setAmount("");
                setOpen(true);
            }} />

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit Budget Limit" : "New Budget Limit"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={(val) => {
                                setCategory(val);
                                if (val !== "Other") setCustomCategory("");
                            }}>
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SUGGESTED_CATEGORIES.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                    <SelectItem value="Other">Custom Category...</SelectItem>
                                </SelectContent>
                            </Select>
                            {category === "Other" && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                                    <Input
                                        placeholder="e.g. Coffee"
                                        value={customCategory}
                                        onChange={(e) => setCustomCategory(e.target.value)}
                                        className="mt-2"
                                        autoFocus
                                    />
                                </motion.div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Monthly Limit (৳)</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="h-11 font-mono text-lg"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Limit"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Delete Budget Limit?</DialogTitle>
                        <DialogDescription>
                            This will permanently remove this spending limit. Your historical transaction data will remain unchanged.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete Limit</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
