'use client'

import { createClient } from '@/lib/supabase/client'

const QUEUE_KEY = 'lifeOS_sync_queue'
const MAX_RETRIES = 3
const MAX_QUEUE_SIZE = 100

export interface PendingAction {
    id: string
    type: 'INSERT' | 'UPDATE' | 'DELETE'
    table: string
    payload: any
    timestamp: number
    retryCount: number
}

export class SyncService {
    private static instance: SyncService | null = null
    private isProcessing = false
    private listeners: Array<() => void> = []

    private constructor() {
        if (typeof window !== 'undefined') {
            this.initialize()
        }
    }

    static getInstance(): SyncService {
        if (!SyncService.instance) {
            SyncService.instance = new SyncService()
        }
        return SyncService.instance
    }

    private initialize() {
        // Set up online/offline event listeners
        window.addEventListener('online', this.handleOnline.bind(this))
        window.addEventListener('offline', this.handleOffline.bind(this))

        // Process queue if already online
        if (navigator.onLine) {
            setTimeout(() => this.processQueue(), 1000)
        }
    }

    private handleOnline() {
        console.log('🟢 Back online - processing queue')
        this.processQueue()
        this.notifyListeners()
    }

    private handleOffline() {
        console.log('🔴 Gone offline')
        this.notifyListeners()
    }

    /**
     * Add a listener that will be called when online/offline status changes
     */
    addListener(callback: () => void) {
        this.listeners.push(callback)
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback)
        }
    }

    private notifyListeners() {
        this.listeners.forEach(callback => callback())
    }

    /**
     * Get current queue from localStorage
     */
    getQueue(): PendingAction[] {
        try {
            const queueJson = localStorage.getItem(QUEUE_KEY)
            if (!queueJson) return []
            return JSON.parse(queueJson)
        } catch (error) {
            console.error('Error reading queue from localStorage:', error)
            return []
        }
    }

    /**
     * Save queue to localStorage
     */
    private saveQueue(queue: PendingAction[]) {
        try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
        } catch (error) {
            console.error('Error saving queue to localStorage:', error)
            // Handle quota exceeded
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                console.warn('localStorage quota exceeded. Clearing old items...')
                // Keep only the most recent 50 items
                const trimmedQueue = queue.slice(-50)
                try {
                    localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmedQueue))
                } catch (e) {
                    console.error('Failed to save even trimmed queue:', e)
                }
            }
        }
    }

    /**
     * Add an action to the queue
     */
    addToQueue(action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>) {
        const queue = this.getQueue()

        // Check queue size limit
        if (queue.length >= MAX_QUEUE_SIZE) {
            console.warn('Queue size limit reached. Removing oldest item.')
            queue.shift()
        }

        const pendingAction: PendingAction = {
            ...action,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            retryCount: 0,
        }

        queue.push(pendingAction)
        this.saveQueue(queue)
        this.notifyListeners()

        console.log('📥 Action queued:', pendingAction)
    }

    /**
     * Remove an action from the queue
     */
    removeFromQueue(id: string) {
        const queue = this.getQueue()
        const filtered = queue.filter(action => action.id !== id)
        this.saveQueue(filtered)
        this.notifyListeners()
    }

    /**
     * Clear entire queue (emergency use)
     */
    clearQueue() {
        localStorage.removeItem(QUEUE_KEY)
        this.notifyListeners()
        console.log('🗑️ Queue cleared')
    }

    /**
     * Process the queue and retry failed operations
     */
    async processQueue() {
        // Prevent concurrent processing
        if (this.isProcessing) {
            console.log('⏳ Queue processing already in progress')
            return
        }

        if (!navigator.onLine) {
            console.log('🔴 Still offline, skipping queue processing')
            return
        }

        this.isProcessing = true
        const queue = this.getQueue()

        if (queue.length === 0) {
            this.isProcessing = false
            return
        }

        console.log(`🔄 Processing ${queue.length} queued action(s)`)

        const supabase = createClient()
        const remainingQueue: PendingAction[] = []

        for (const action of queue) {
            try {
                let result: any

                // Execute the appropriate Supabase operation
                switch (action.type) {
                    case 'INSERT':
                        result = await supabase.from(action.table).insert(action.payload)
                        break
                    case 'UPDATE':
                        result = await supabase
                            .from(action.table)
                            .update(action.payload.data)
                            .eq('id', action.payload.id)
                        break
                    case 'DELETE':
                        result = await supabase
                            .from(action.table)
                            .delete()
                            .eq('id', action.payload.id)
                        break
                }

                if (result.error) {
                    throw result.error
                }

                // Success - don't add back to queue
                console.log(`✅ Synced: ${action.type} on ${action.table}`)
            } catch (error: any) {
                console.error(`❌ Failed to sync action ${action.id}:`, error)

                // Increment retry count
                action.retryCount++

                // Check if we should retry
                if (action.retryCount < MAX_RETRIES) {
                    console.log(`🔁 Retry ${action.retryCount}/${MAX_RETRIES} for action ${action.id}`)
                    remainingQueue.push(action)
                } else {
                    console.error(`⚠️ Max retries reached for action ${action.id}. Discarding.`)
                    // Optionally notify user of permanent failure
                }
            }
        }

        // Save remaining queue
        this.saveQueue(remainingQueue)
        this.isProcessing = false
        this.notifyListeners()

        if (remainingQueue.length === 0) {
            console.log('✨ Queue processed successfully - all items synced')
        } else {
            console.log(`⏰ ${remainingQueue.length} item(s) remain in queue`)
        }
    }

    /**
     * Get current online status
     */
    isOnline(): boolean {
        return typeof navigator !== 'undefined' && navigator.onLine
    }

    /**
     * Clean up event listeners (call on unmount)
     */
    destroy() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleOnline.bind(this))
            window.removeEventListener('offline', this.handleOffline.bind(this))
        }
    }
}

/**
 * Helper function to wrap Supabase calls with offline queue handling
 * 
 * @param operation - The Supabase operation to execute
 * @param queueMetadata - Metadata for queuing if operation fails
 * @returns The result of the Supabase operation
 * 
 * @example
 * const result = await secureSupabaseCall(
 *   () => supabase.from('bills').insert({ name: 'Electricity', amount: 100 }),
 *   { table: 'bills', type: 'INSERT', payload: { name: 'Electricity', amount: 100 } }
 * )
 */
export async function secureSupabaseCall<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    queueMetadata: { table: string; type: 'INSERT' | 'UPDATE' | 'DELETE'; payload: any }
): Promise<{ data: T | null; error: any; queued?: boolean }> {
    try {
        const result = await operation()

        // Check if error is network-related
        if (result.error) {
            const errorMessage = result.error.message?.toLowerCase() || ''
            const isNetworkError =
                errorMessage.includes('failed to fetch') ||
                errorMessage.includes('networkerror') ||
                errorMessage.includes('network request failed') ||
                !navigator.onLine

            if (isNetworkError) {
                // Add to queue
                console.log('🌐 Network error detected, queuing action')
                SyncService.getInstance().addToQueue(queueMetadata)

                return {
                    data: null,
                    error: null, // Don't return error to caller for queued items
                    queued: true,
                }
            }

            // Non-network error (validation, permissions, etc.) - return as-is
            return result
        }

        // Success
        return result
    } catch (error: any) {
        // Catch JavaScript errors (not Supabase errors)
        console.error('Unexpected error in secureSupabaseCall:', error)

        // Check if device is offline
        if (!navigator.onLine) {
            console.log('🌐 Device offline, queuing action')
            SyncService.getInstance().addToQueue(queueMetadata)

            return {
                data: null,
                error: null,
                queued: true,
            }
        }

        // Unknown error - return it
        return {
            data: null,
            error: error,
        }
    }
}
