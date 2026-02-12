'use client'

import { useOfflineSync } from '@/hooks/use-offline-sync'

export function SyncManager() {
    useOfflineSync()
    return null
}
