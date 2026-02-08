'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { SyncService } from '@/lib/sync-service'

export function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(false)
    const [queueCount, setQueueCount] = useState(0)

    useEffect(() => {
        const syncService = SyncService.getInstance()

        // Initial status check
        setIsOffline(!navigator.onLine)
        setQueueCount(syncService.getQueue().length)

        // Subscribe to online/offline changes
        const unsubscribe = syncService.addListener(() => {
            setIsOffline(!navigator.onLine)
            setQueueCount(syncService.getQueue().length)
        })

        return () => {
            unsubscribe()
        }
    }, [])

    // Don't render if online
    if (!isOffline) {
        return null
    }

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-amber-500/90 backdrop-blur-sm text-amber-950 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
                <WifiOff className="h-4 w-4" />
                <span>You are offline. Changes saved locally.</span>
                {queueCount > 0 && (
                    <span className="bg-amber-950/20 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {queueCount}
                    </span>
                )}
            </div>
        </div>
    )
}
