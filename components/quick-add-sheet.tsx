'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mic, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addTransaction } from '@/lib/ledger-store'
import { useDashboardStore } from '@/lib/dashboard-store'
import { haptics } from '@/lib/haptics'

interface QuickAddSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const QUICK_AMOUNTS = [50, 100, 200, 500]

// AI Suggested Categories with confidence scores
const CATEGORIES = [
    { value: 'food', label: 'Food & Dining', confidence: 0.92, emoji: '🍔' },
    { value: 'transport', label: 'Transport', confidence: 0.15, emoji: '🚗' },
    { value: 'housing', label: 'Housing', confidence: 0.08, emoji: '🏠' },
    { value: 'shopping', label: 'Shopping', confidence: 0.05, emoji: '🛍️' },
    { value: 'entertainment', label: 'Entertainment', confidence: 0.02, emoji: '🎬' },
    { value: 'utilities', label: 'Utilities', confidence: 0.01, emoji: '💡' },
]

export function QuickAddSheet({ open, onOpenChange }: QuickAddSheetProps) {
    const [amount, setAmount] = useState('')
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].value)
    const [description, setDescription] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isListening, setIsListening] = useState(false)

    const { fetchDashboardData } = useDashboardStore()

    // Reset form when sheet opens
    useEffect(() => {
        if (open) {
            setAmount('')
            setDescription('')
            setSelectedCategory(CATEGORIES[0].value)
        }
    }, [open])

    // Voice input simulation
    // Voice input simulation
    const handleVoiceInput = () => {
        haptics.medium()

        setIsListening(true)

        // Simulate voice recognition delay
        setTimeout(() => {
            setAmount('450')
            setDescription('Quick grocery run')
            setSelectedCategory('food')
            setIsListening(false)

            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                // Keep manual vibrate for specific pattern or use utility?
                // Using utility for consistency
                haptics.selection()
            }
        }, 1500)
    }

    const handleQuickAmount = (value: number) => {
        setAmount(String(value))
        haptics.selection()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!amount || parseFloat(amount) <= 0) return

        setIsSubmitting(true)

        try {
            // Optimistic update
            await addTransaction({
                transaction_type: 'expense',
                amount: parseFloat(amount),
                category: selectedCategory,
                item_name: description || 'Quick Add Expense',
                created_at: new Date().toISOString(),
            })

            await fetchDashboardData()

            // Success feedback
            await haptics.success()

            // Close sheet
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to add expense:', error)
            await haptics.error()
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                className="h-[85vh] sm:h-[60vh] rounded-t-[1.5rem] p-0 flex flex-col gap-0 border-t-0 shadow-2xl safe-bottom w-full"
            >
                {/* Drag Handle Area */}
                <div className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing w-full">
                    <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
                </div>

                <div className="px-6 flex-1 overflow-y-auto w-full">
                    <SheetHeader className="text-left mb-6 w-full">
                        <SheetTitle className="text-xl font-bold flex items-center gap-2">
                            Quick Add Expense
                        </SheetTitle>
                        <SheetDescription>
                            Log a new transaction instantly
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 pb-safe w-full">
                        {/* Voice Input Button */}
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            className={cn(
                                "w-full h-14 text-base font-medium rounded-xl relative overflow-hidden transition-all",
                                isListening ? "border-primary text-primary bg-primary/5" : "hover:bg-muted/50"
                            )}
                            onClick={handleVoiceInput}
                            disabled={isListening || isSubmitting}
                        >
                            {isListening ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Listening...
                                </>
                            ) : (
                                <>
                                    <Mic className="mr-2 h-5 w-5" />
                                    Tap to Speak
                                </>
                            )}
                            {isListening && (
                                <span className="absolute inset-0 bg-primary/5 animate-pulse" />
                            )}
                        </Button>

                        <div className="relative flex items-center gap-4">
                            <div className="h-px bg-border flex-1" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Or Type Manually
                            </span>
                            <div className="h-px bg-border flex-1" />
                        </div>

                        {/* Amount Input Section */}
                        <div className="space-y-3">
                            <Label htmlFor="amount" className="text-sm font-medium">
                                Amount
                            </Label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-medium">
                                    ৳
                                </span>
                                <Input
                                    id="amount"
                                    type="number"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="pl-10 h-14 text-xl font-semibold rounded-xl"
                                    required
                                    autoFocus={!isListening}
                                />
                            </div>

                            {/* Quick Amount Chips */}
                            <div className="grid grid-cols-4 gap-2">
                                {QUICK_AMOUNTS.map((value) => (
                                    <Button
                                        key={value}
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="h-9 hover:bg-primary/10 hover:text-primary transition-colors text-xs font-medium"
                                        onClick={() => handleQuickAmount(value)}
                                    >
                                        ৳{value}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* AI Category Suggestion */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                                    Category
                                </Label>
                                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                                    {(CATEGORIES[0].confidence * 100).toFixed(0)}% Match
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {CATEGORIES.map((category) => (
                                    <Button
                                        key={category.value}
                                        type="button"
                                        variant={selectedCategory === category.value ? 'default' : 'outline'}
                                        className={cn(
                                            "h-11 justify-start px-3 transition-all",
                                            selectedCategory === category.value
                                                ? "shadow-sm border-primary/20"
                                                : "border-transparent bg-secondary/50 hover:bg-secondary border hover:border-border"
                                        )}
                                        onClick={() => {
                                            setSelectedCategory(category.value)
                                            haptics.selection()
                                        }}
                                    >
                                        <span className="mr-2 text-base">{category.emoji}</span>
                                        <span className="truncate text-sm">{category.label}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Description Input */}
                        <div className="space-y-3">
                            <Label htmlFor="description" className="text-sm font-medium">
                                Description <span className="text-muted-foreground font-normal">(Optional)</span>
                            </Label>
                            <Input
                                id="description"
                                type="text"
                                placeholder="What was this for?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="h-12 rounded-xl"
                            />
                        </div>

                        {/* Submit Action */}
                        <Button
                            type="submit"
                            size="lg"
                            className="w-full h-14 text-base font-semibold rounded-xl shadow-lg shadow-primary/20 mt-4"
                            disabled={!amount || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                `Add Expense ${amount ? `(৳${amount})` : ''}`
                            )}
                        </Button>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    )
}
