"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { useCurrency } from "@/contexts/currency-context";
import { BillWithDue } from "@/lib/bills-store";
import { useDrag } from "@use-gesture/react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import {
    CheckCircle2,
    Trash2,
    Pencil,
    AlertCircle,
    CreditCard,
    Wifi,
    Flame,
    Clapperboard,
    Home,
    Zap,
    Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

interface BillCardProps {
    bill: BillWithDue;
    isPaid: boolean;
    onPay: (bill: BillWithDue) => void;
    onEdit: (bill: BillWithDue) => void;
    onDelete: (bill: BillWithDue) => void;
}

function getBillIcon(name: string, category?: string) {
    const n = name.toLowerCase();
    const cat = category?.toLowerCase() || "";

    if (/net|wifi|internet|broadband/.test(n) || cat.includes("internet")) return Wifi;
    if (/gas|fuel/.test(n) || cat.includes("gas")) return Flame;
    if (/netflix|prime|spotify|disney|hulu|hbo|streaming/.test(n) || cat.includes("streaming")) return Clapperboard;
    if (/rent|mortgage|housing|lease|house/.test(n) || cat.includes("rent")) return Home;
    if (/electric|water|utility|utilities/.test(n) || cat.includes("utility")) return Zap;
    if (/phone|mobile|cellular/.test(n)) return Smartphone;

    return CreditCard;
}

export function BillCard({ bill, isPaid, onPay, onEdit, onDelete }: BillCardProps) {
    const { formatPrice } = useCurrency();
    const Icon = getBillIcon(bill.name, bill.category);
    const x = useMotionValue(0);
    const controls = useDrag(({ active, movement: [mx], offset: [ox] }) => {
        if (isPaid) return; // Disable swipe if already paid

        // Swipe Right (Pay) -> mx > 0
        // Swipe Left (Edit/Delete) -> mx < 0

        if (active) {
            x.set(mx);
        } else {
            // Thresholds
            if (mx > 100) {
                haptics.success();
                onPay(bill);
            } else if (mx < -100) {
                haptics.light();
                onEdit(bill); // Or show menu? Let's just trigger edit for now, maybe delete needs verify
            }
            x.set(0);
        }
    }, {
        from: () => [x.get(), 0],
        rubberband: true,
        // axis: 'x', // Lock to X axis?
    });

    // Background Colors based on swipe direction
    const bgStyle = useTransform(x, [-200, 0, 200], ["rgba(239, 68, 68, 0.2)", "transparent", "rgba(16, 185, 129, 0.2)"]);
    const borderStyle = useTransform(x, [-200, 0, 200], ["rgba(239, 68, 68, 0.5)", "rgba(226, 232, 240, 0.1)", "rgba(16, 185, 129, 0.5)"]);

    // Icons revealing
    const leftIconOpacity = useTransform(x, [50, 100], [0, 1]);
    const rightIconOpacity = useTransform(x, [-50, -100], [0, 1]);

    // Status Logic
    const statusColor = useMemo(() => {
        if (isPaid) return "text-muted-foreground";
        if (bill.daysRemaining < 0) return "text-rose-500";
        if (bill.daysRemaining <= 3) return "text-amber-500";
        return "text-emerald-500";
    }, [bill.daysRemaining, isPaid]);

    const dueDateText = useMemo(() => {
        if (isPaid) return "Paid";
        if (bill.daysRemaining < 0) return `${Math.abs(bill.daysRemaining)} days overdue`;
        if (bill.daysRemaining === 0) return "Due today";
        if (bill.daysRemaining === 1) return "Due tomorrow";
        return `Due in ${bill.daysRemaining} days`;
    }, [bill.daysRemaining, isPaid]);

    return (
        <div className="relative mb-3 touch-pan-y">
            {/* Background Actions Layer */}
            <div className="absolute inset-0 flex items-center justify-between px-6 rounded-2xl bg-card border border-border">
                <motion.div style={{ opacity: leftIconOpacity }} className="flex items-center gap-2 text-emerald-500 font-medium">
                    <CheckCircle2 size={20} />
                    <span>Mark Paid</span>
                </motion.div>
                <motion.div style={{ opacity: rightIconOpacity }} className="flex items-center gap-2 text-sky-500 font-medium">
                    <span>Edit</span>
                    <Pencil size={20} />
                </motion.div>
            </div>

            {/* Foreground Card */}
            <motion.div
                {...controls()}
                style={{ x, background: bgStyle }}
                className={cn(
                    "relative flex items-center justify-between p-4 rounded-2xl border bg-card/95 backdrop-blur-sm shadow-sm z-10",
                    isPaid ? "opacity-60 border-border/50" : "border-border"
                )}
                whileTap={{ scale: 0.98 }}
            >
                <div className="flex items-center gap-4">
                    {/* Icon Box */}
                    <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                        isPaid ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                    )}>
                        <Icon size={20} />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col">
                        <span className={cn("font-semibold text-base", isPaid && "line-through text-muted-foreground")}>
                            {bill.name}
                        </span>
                        <span className={cn("text-xs font-medium", statusColor)}>
                            {dueDateText} • {format(bill.nextDue, "MMM d")}
                        </span>
                    </div>
                </div>

                {/* Amount */}
                <div className="flex flex-col items-end">
                    <span className={cn("text-lg font-bold tabular-nums", isPaid ? "text-muted-foreground" : "text-foreground")}>
                        {formatPrice(bill.amount)}
                    </span>
                    {/* Mobile-only action trigger if swipe is hidden/hard */}
                    <button
                        className="md:hidden text-xs text-muted-foreground mt-1"
                        onClick={(e) => { e.stopPropagation(); onEdit(bill); }}
                    >
                        Expect Details
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
