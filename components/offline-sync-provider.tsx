'use client'

import { useOfflineSync } from '@/hooks/use-offline-sync'
import { OfflineIndicator } from './offline-indicator'

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
    useOfflineSync()

    return (
        <>
            {children}
            <OfflineIndicator />
        </>
    )
}
