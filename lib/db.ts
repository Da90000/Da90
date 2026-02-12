import { openDB, DBSchema, IDBPDatabase } from 'idb'

export interface Transaction {
    id?: number
    tempId?: string
    type: 'income' | 'expense'
    amount: number
    category: string
    description: string
    date: string
    syncStatus: 'pending' | 'synced' | 'error'
    createdAt: string
    updatedAt: string
}

export interface SyncQueueItem {
    id?: number
    action: 'CREATE' | 'UPDATE' | 'DELETE'
    table: 'transactions' | 'inventory' | 'bills'
    data: any
    tempId?: string
    retries: number
    lastError?: string
    createdAt: string
}

export interface Metadata {
    key: string
    value: any
}

interface ShopListDB extends DBSchema {
    transactions: {
        key: number
        value: Transaction
        indexes: {
            'by-syncStatus': string
            'by-date': string
            'by-tempId': string
        }
    }
    syncQueue: {
        key: number
        value: SyncQueueItem
        indexes: { 'by-action': string }
    }
    metadata: {
        key: string
        value: Metadata
    }
}

const DB_NAME = 'ShopListPro'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<ShopListDB>> | null = null

export async function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<ShopListDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                // Create transactions store
                if (!db.objectStoreNames.contains('transactions')) {
                    const txStore = db.createObjectStore('transactions', {
                        keyPath: 'id',
                        autoIncrement: true,
                    })
                    txStore.createIndex('by-syncStatus', 'syncStatus')
                    txStore.createIndex('by-date', 'date')
                    txStore.createIndex('by-tempId', 'tempId', { unique: false })
                }

                // Create sync queue store
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const queueStore = db.createObjectStore('syncQueue', {
                        keyPath: 'id',
                        autoIncrement: true,
                    })
                    queueStore.createIndex('by-action', 'action')
                }

                // Create metadata store
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' })
                }
            },
        })
    }
    return dbPromise
}

// Transaction CRUD
export async function addTransaction(transaction: Omit<Transaction, 'id'>) {
    const db = await getDB()
    return db.add('transactions', transaction as Transaction)
}

export async function getTransactions() {
    const db = await getDB()
    return db.getAll('transactions')
}

export async function getTransactionsByStatus(status: 'pending' | 'synced' | 'error') {
    const db = await getDB()
    return db.getAllFromIndex('transactions', 'by-syncStatus', status)
}

export async function updateTransaction(id: number, updates: Partial<Transaction>) {
    const db = await getDB()
    const tx = await db.get('transactions', id)
    if (!tx) throw new Error('Transaction not found')
    const updated = { ...tx, ...updates, updatedAt: new Date().toISOString() }
    return db.put('transactions', updated)
}

export async function deleteTransaction(id: number) {
    const db = await getDB()
    return db.delete('transactions', id)
}

// Sync Queue CRUD
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries'>) {
    const db = await getDB()
    return db.add('syncQueue', {
        ...item,
        retries: 0,
        createdAt: new Date().toISOString(),
    } as SyncQueueItem)
}

export async function getSyncQueue() {
    const db = await getDB()
    return db.getAll('syncQueue')
}

export async function updateSyncItem(id: number, updates: Partial<SyncQueueItem>) {
    const db = await getDB()
    const item = await db.get('syncQueue', id)
    if (!item) throw new Error('Sync item not found')
    return db.put('syncQueue', { ...item, ...updates })
}

export async function removeSyncItem(id: number) {
    const db = await getDB()
    return db.delete('syncQueue', id)
}

// Metadata
export async function setMetadata(key: string, value: any) {
    const db = await getDB()
    // Metadata store only uses 'key' as keyPath, so we store the object {key, value}
    // db.put('metadata', ...) expects the value to match the store schema.
    return db.put('metadata', { key, value })
}

export async function getMetadata(key: string) {
    const db = await getDB()
    const result = await db.get('metadata', key)
    return result?.value
}

// Bulk operations
export async function clearAllData() {
    const db = await getDB()
    const tx = db.transaction(['transactions', 'syncQueue', 'metadata'], 'readwrite')
    await Promise.all([
        tx.objectStore('transactions').clear(),
        tx.objectStore('syncQueue').clear(),
        tx.objectStore('metadata').clear(),
    ])
    await tx.done
}
