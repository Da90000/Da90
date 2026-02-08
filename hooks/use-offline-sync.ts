'use client'

import { useEffect, useState } from 'react'
import { SyncService } from '@/lib/sync-service'

export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState(true)
    const [queueCount, setQueueCount] = useState(0)

    useEffect(() => {
        const syncService = SyncService.getInstance()

        // Initial state
        setIsOnline(navigator.onLine)
        setQueueCount(syncService.getQueue().length)

        // Subscribe to changes
        const unsubscribe = syncService.addListener(() => {
            setIsOnline(navigator.onLine)
            setQueueCount(syncService.getQueue().length)
        })

        return () => {
            unsubscribe()
        }
    }, [])

    const processQueue = () => {
        SyncService.getInstance().processQueue()
    }

    const clearQueue = () => {
        SyncService.getInstance().clearQueue()
    }

    return {
        isOnline,
        queueCount,
        processQueue,
        clearQueue,
    }
}
