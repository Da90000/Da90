'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Eye, EyeOff, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BalanceHeroCardProps {
    balance: number
    income: number
    expenses: number
    onExpand?: () => void
    className?: string
}

export function BalanceHeroCard({
    balance,
    income,
    expenses,
    onExpand,
    className,
}: BalanceHeroCardProps) {
    const [isBalanceHidden, setIsBalanceHidden] = useState(false)

    // Load balance visibility preference
    useEffect(() => {
        const hidden = localStorage.getItem('balanceHidden') === 'true'
        setIsBalanceHidden(hidden)
    }, [])

    const toggleBalanceVisibility = () => {
        const newState = !isBalanceHidden
        setIsBalanceHidden(newState)
        localStorage.setItem('balanceHidden', String(newState))
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    const formatBalanceDisplay = (amount: number) => {
        if (isBalanceHidden) {
            const length = formatCurrency(amount).length
            return '■' + '•'.repeat(Math.max(length - 1, 6))
        }
        return formatCurrency(amount)
    }

    return (
        <Card
            className={cn(
                'relative overflow-hidden border-0',
                'bg-gradient-to-br from-emerald-500 to-emerald-600',
                'dark:from-emerald-600 dark:to-emerald-700',
                'text-white shadow-lg',
                'h-[160px] md:h-[180px]',
                className
            )}
        >
            {/* Subtle overlay for depth */}
            <div className="absolute inset-0 bg-black/10" />

            <div className="relative h-full flex flex-col justify-between p-4 md:p-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs md:text-sm font-medium opacity-90 uppercase tracking-wide">
                            Cash Balance
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 sm:h-8 sm:w-8 rounded-full hover:bg-white/20 text-white -mr-1 sm:mr-0"
                        onClick={toggleBalanceVisibility}
                        aria-label={isBalanceHidden ? 'Show balance' : 'Hide balance'}
                    >
                        {isBalanceHidden ? (
                            <EyeOff className="h-5 w-5 sm:h-4 sm:w-4" />
                        ) : (
                            <Eye className="h-5 w-5 sm:h-4 sm:w-4" />
                        )}
                    </Button>
                </div>

                {/* Balance Amount */}
                <div className="flex-1 flex items-center">
                    <div className="w-full">
                        <p
                            className="text-[2.5rem] md:text-5xl font-bold leading-none tracking-tight"
                            aria-label={isBalanceHidden ? 'Balance hidden' : `Balance: ${formatCurrency(balance)}`}
                        >
                            {formatBalanceDisplay(balance)}
                        </p>
                    </div>
                </div>

                {/* Summary & Expand */}
                <div className="flex items-end justify-between">
                    {!isBalanceHidden && (
                        <div className="flex gap-4 text-sm md:text-base">
                            <div className="flex items-center gap-1">
                                <span className="opacity-75" aria-label="Income">↑</span>
                                <span className="font-medium">{formatCurrency(income)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="opacity-75" aria-label="Expenses">↓</span>
                                <span className="font-medium">{formatCurrency(expenses)}</span>
                            </div>
                        </div>
                    )}
                    {onExpand && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-2 text-white hover:bg-white/20 -mr-1 rounded-full"
                            onClick={onExpand}
                            aria-label="Expand details"
                        >
                            <ChevronUp className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    )
}
