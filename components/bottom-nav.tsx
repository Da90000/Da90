'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, TrendingUp, PlusCircle, PiggyBank, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { haptics } from '@/lib/haptics'

interface NavItem {
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    isFAB?: boolean
}

const navigation: NavItem[] = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Spending', href: '/spending', icon: TrendingUp },
    { name: 'Add', href: '/add', icon: PlusCircle, isFAB: true },
    { name: 'Budget', href: '/budget', icon: PiggyBank },
    { name: 'More', href: '/more', icon: Menu },
]

export function BottomNav() {
    const pathname = usePathname()

    const handleTap = () => {
        // Trigger haptic feedback
        haptics.light()
    }

    return (
        <nav
            className={cn(
                'fixed bottom-0 left-0 right-0 z-50',
                'bg-background/80 backdrop-blur-lg',
                'border-t border-border',
                'safe-bottom',
                'md:hidden' // Hide on desktop
            )}
            role="navigation"
            aria-label="Main navigation"
        >
            <div className="flex items-center justify-around h-16 px-2">
                {navigation.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    const isFAB = item.isFAB

                    if (isFAB) {
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={handleTap}
                                className={cn(
                                    'relative -mt-6',
                                    'flex flex-col items-center justify-center',
                                    'w-14 h-14 rounded-full',
                                    'bg-primary text-primary-foreground',
                                    'shadow-lg',
                                    'transition-transform active:scale-95',
                                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                                )}
                                aria-label={item.name}
                            >
                                <Icon className="h-6 w-6" />
                            </Link>
                        )
                    }

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={handleTap}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1',
                                'min-w-[48px] min-h-[48px]', // WCAG touch target
                                'rounded-lg px-3 py-2',
                                'transition-colors',
                                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                                isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                            aria-label={item.name}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <Icon className={cn('h-5 w-5', isActive && 'fill-current')} />
                            <span className="text-xs font-medium">{item.name}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
