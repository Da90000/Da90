'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { OfflineIndicator } from './offline-indicator'

interface OfflineContextValue {
    isOnline: boolean
    lastOnlineTime: Date | null
    checkConnectivity: () => Promise<boolean>
}

const OfflineContext = createContext<OfflineContextValue>({
    isOnline: true,
    lastOnlineTime: null,
    checkConnectivity: async () => true,
})

export function OfflineProvider({ children }: { children: React.ReactNode }) {
    const [isOnline, setIsOnline] = useState(true)
    const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null)

    const checkConnectivity = useCallback(async (): Promise<boolean> => {
        // Basic check
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return false
        }

        // Advanced check: try to fetch from server
        try {
            const response = await fetch('/api/health', {
                method: 'HEAD',
                cache: 'no-cache',
            })
            return response.ok
        } catch {
            return false
        }
    }, [])

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true)
            setLastOnlineTime(new Date())
        }

        const handleOffline = () => {
            setIsOnline(false)
        }

        // Initial check
        checkConnectivity().then(setIsOnline)

        // Listen for browser events
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // Periodic check every 30 seconds
        const interval = setInterval(async () => {
            const online = await checkConnectivity()
            if (online !== isOnline) {
                setIsOnline(online)
                if (online) setLastOnlineTime(new Date())
            }
        }, 30000)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            clearInterval(interval)
        }
    }, [checkConnectivity, isOnline])

    return (
        <OfflineContext.Provider value={{ isOnline, lastOnlineTime, checkConnectivity }}>
            {children}
            <OfflineIndicator isOnline={isOnline} lastOnlineTime={lastOnlineTime} />
        </OfflineContext.Provider>
    )
}

export const useOffline = () => useContext(OfflineContext)
