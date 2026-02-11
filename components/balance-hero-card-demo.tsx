'use client'

import { BalanceHeroCard } from '@/components/balance-hero-card'
import { useState } from 'react'

/**
 * BalanceHeroCardDemo - Component showcase for testing
 * 
 * This component demonstrates all variations of the BalanceHeroCard.
 * Use this page during development to test visual appearance and interactions.
 * 
 * To use: Import and render in your dashboard or a dedicated test page.
 */
export function BalanceHeroCardDemo() {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Balance Hero Card Demo</h1>
                    <p className="text-muted-foreground">
                        Test different states and variations of the BalanceHeroCard component
                    </p>
                </div>

                {/* Standard Card */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold">Standard Card</h2>
                    <BalanceHeroCard
                        balance={125000}
                        income={45000}
                        expenses={32000}
                    />
                </section>

                {/* With Expand Button */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold">With Expand Button</h2>
                    <BalanceHeroCard
                        balance={125000}
                        income={45000}
                        expenses={32000}
                        onExpand={() => setExpanded(!expanded)}
                    />
                    {expanded && (
                        <div className="p-4 bg-secondary rounded-lg">
                            <p className="text-sm">Expanded details view triggered!</p>
                        </div>
                    )}
                </section>

                {/* Zero Balance */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold">Zero Balance</h2>
                    <BalanceHeroCard
                        balance={0}
                        income={0}
                        expenses={0}
                    />
                </section>

                {/* Negative Balance */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold">Negative Balance</h2>
                    <BalanceHeroCard
                        balance={-5000}
                        income={10000}
                        expenses={15000}
                    />
                </section>

                {/* Large Numbers */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold">Large Numbers</h2>
                    <BalanceHeroCard
                        balance={12500000}
                        income={5000000}
                        expenses={3000000}
                    />
                </section>

                {/* Small Numbers */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold">Small Numbers</h2>
                    <BalanceHeroCard
                        balance={1250}
                        income={500}
                        expenses={250}
                    />
                </section>

                {/* Testing Instructions */}
                <section className="mt-12 p-6 bg-muted rounded-lg space-y-3">
                    <h2 className="text-lg font-semibold">Testing Instructions</h2>
                    <ul className="space-y-2 text-sm">
                        <li className="flex gap-2">
                            <span>✅</span>
                            <span>Click the eye icon to toggle balance visibility</span>
                        </li>
                        <li className="flex gap-2">
                            <span>✅</span>
                            <span>Refresh the page - visibility preference should persist</span>
                        </li>
                        <li className="flex gap-2">
                            <span>✅</span>
                            <span>Resize browser to test responsive heights (160px mobile, 180px tablet+)</span>
                        </li>
                        <li className="flex gap-2">
                            <span>✅</span>
                            <span>Toggle dark mode to test gradient variations</span>
                        </li>
                        <li className="flex gap-2">
                            <span>✅</span>
                            <span>Test on mobile device for touch target sizes (44px minimum)</span>
                        </li>
                        <li className="flex gap-2">
                            <span>✅</span>
                            <span>Use screen reader to verify accessibility labels</span>
                        </li>
                    </ul>
                </section>

                {/* Responsive Preview Grid */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold">Responsive Preview</h2>
                    <div className="grid gap-4">
                        {/* Mobile Preview (375px) */}
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Mobile (375px)</p>
                            <div className="max-w-[375px]">
                                <BalanceHeroCard
                                    balance={125000}
                                    income={45000}
                                    expenses={32000}
                                    onExpand={() => alert('Expand clicked')}
                                />
                            </div>
                        </div>

                        {/* Tablet Preview (768px) */}
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Tablet (768px)</p>
                            <div className="max-w-[768px]">
                                <BalanceHeroCard
                                    balance={125000}
                                    income={45000}
                                    expenses={32000}
                                    onExpand={() => alert('Expand clicked')}
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
