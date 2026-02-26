import { supabase } from '../lib/supabase';

const QUEUE_KEY = 'efuel_sync_queue';

export interface SyncItem {
    id: string; // Unique ID for the queue item
    action: 'INSERT_INVENTORY' | 'INSERT_TRANSACTION' | 'UPDATE_TRANSACTION' | 'INSERT_EXPENSE' | 'UPDATE_SETTINGS' | 'DELETE_STOCK' | 'DELETE_TRANSACTION' | 'DELETE_EXPENSE' | 'INSERT_EMPLOYEE' | 'UPDATE_EMPLOYEE' | 'DELETE_EMPLOYEE' | 'INSERT_ATTENDANCE' | 'UPDATE_ATTENDANCE' | 'INSERT_PRODUCT' | 'UPDATE_PRODUCT' | 'INSERT_PRODUCT_INVENTORY' | 'INSERT_PRODUCT_TRANSACTION' | 'UPDATE_PRODUCT_TRANSACTION';
    payload: any;
    timestamp: number;
    retryCount: number;
}

export const SyncService = {
    getQueue: (): SyncItem[] => {
        if (typeof window === 'undefined') return [];
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    },

    addToQueue: (action: SyncItem['action'], payload: any) => {
        const queue = SyncService.getQueue();
        const item: SyncItem = {
            id: crypto.randomUUID(),
            action,
            payload,
            timestamp: Date.now(),
            retryCount: 0
        };
        queue.push(item);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        console.log(`[Sync] Added to queue: ${action}`, payload);

        // Try to process immediately if online
        if (navigator.onLine) {
            SyncService.processQueue();
        }
    },

    removeFromQueue: (id: string) => {
        const queue = SyncService.getQueue();
        const newQueue = queue.filter(item => item.id !== id);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
    },

    processQueue: async () => {
        const queue = SyncService.getQueue();
        if (queue.length === 0) return;

        console.log(`[Sync] Processing ${queue.length} items...`);

        if (!supabase) {
            console.warn("[Sync] Supabase client not initialized.");
            return;
        }

        for (const item of queue) {
            try {
                let error = null;

                switch (item.action) {
                    case 'INSERT_INVENTORY':
                        const { error: err1 } = await supabase.from('inventory_logs').insert(item.payload);
                        error = err1;
                        break;
                    case 'INSERT_TRANSACTION':
                        const { error: err2 } = await supabase.from('transactions').insert(item.payload);
                        error = err2;
                        break;
                    case 'UPDATE_TRANSACTION':
                        const { error: err_update_transaction } = await supabase.from('transactions').update({ status: item.payload.status }).eq('id', item.payload.id);
                        error = err_update_transaction;
                        break;
                    case 'INSERT_EXPENSE':
                        const { error: err3 } = await supabase.from('expenses').insert(item.payload);
                        error = err3;
                        break;
                    case 'UPDATE_SETTINGS':
                        const { error: err4 } = await supabase.from('store_settings').upsert(item.payload);
                        error = err4;
                        break;
                    case 'DELETE_STOCK':
                        // payload is { id: string }
                        const { error: err5 } = await supabase.from('inventory_logs').delete().eq('id', item.payload.id);
                        error = err5;
                        break;
                    case 'DELETE_TRANSACTION':
                        // payload is { id: string }
                        const { error: err6 } = await supabase.from('transactions').delete().eq('id', item.payload.id);
                        error = err6;
                        break;
                    case 'DELETE_EXPENSE':
                        // payload is { id: string }
                        const { error: err7 } = await supabase.from('expenses').delete().eq('id', item.payload.id);
                        error = err7;
                        break;
                    case 'INSERT_EMPLOYEE':
                        const { error: err8 } = await supabase.from('employees').insert(item.payload);
                        error = err8;
                        break;
                    case 'UPDATE_EMPLOYEE':
                        // payload is { id, updates }
                        const { error: err9 } = await supabase.from('employees').update(item.payload.updates).eq('id', item.payload.id);
                        error = err9;
                        break;
                    case 'DELETE_EMPLOYEE':
                        // payload is { id }
                        const { error: err10 } = await supabase.from('employees').delete().eq('id', item.payload.id);
                        error = err10;
                        break;
                    case 'INSERT_ATTENDANCE':
                        const { error: err11 } = await supabase.from('attendance').insert(item.payload);
                        error = err11;
                        break;
                    case 'UPDATE_ATTENDANCE':
                        // payload is { id, updates }
                        const { error: err12 } = await supabase.from('attendance').update(item.payload.updates).eq('id', item.payload.id);
                        error = err12;
                        break;
                    case 'INSERT_PRODUCT':
                        const { error: err13 } = await supabase.from('products').insert(item.payload);
                        error = err13;
                        break;
                    case 'UPDATE_PRODUCT':
                        const { error: err14 } = await supabase.from('products').update(item.payload.updates).eq('id', item.payload.id);
                        error = err14;
                        break;
                    case 'INSERT_PRODUCT_INVENTORY':
                        const { error: err15 } = await supabase.from('product_inventory').insert(item.payload);
                        error = err15;
                        break;
                    case 'INSERT_PRODUCT_TRANSACTION':
                        // payload should match process_product_transaction expectations or directly insert to tables.
                        // However, processProductSale fallback saves to DB sequentially. If we insert directly to product_transactions and product_inventory it works.
                        // Or we call the RPC if payload is specifically designed for RPC.
                        // But since the fallback inserts manually into tables, we should just insert into the tables.
                        // Actually, if we use INSERT_PRODUCT_TRANSACTION it inserts the trx. The inventory OUTs are handled by INSERT_PRODUCT_INVENTORY.
                        const { error: err16 } = await supabase.from('product_transactions').insert(item.payload);
                        error = err16;
                        break;
                }

                if (error) {
                    console.error(`[Sync] Failed item ${item.id}:`, error);
                    // Increment retry count
                    item.retryCount = (item.retryCount || 0) + 1;

                    if (item.retryCount >= 5) {
                        console.error(`[Sync] Item ${item.id} failed 5 times. Removing from queue.`);
                        // Ideally move to a 'dead_letter_queue' in DB or LocalStorage
                        SyncService.removeFromQueue(item.id);
                    } else {
                        // Update the item in the queue with new retry count
                        const currentQueue = SyncService.getQueue();
                        const index = currentQueue.findIndex(q => q.id === item.id);
                        if (index !== -1) {
                            currentQueue[index].retryCount = item.retryCount;
                            localStorage.setItem(QUEUE_KEY, JSON.stringify(currentQueue));
                        }
                    }
                } else {
                    console.log(`[Sync] Success item ${item.id}`);
                    SyncService.removeFromQueue(item.id);
                }

            } catch (err) {
                console.error(`[Sync] Critical error item ${item.id}:`, err);
                // Increment retry count for critical errors too
                item.retryCount = (item.retryCount || 0) + 1;
                if (item.retryCount >= 5) SyncService.removeFromQueue(item.id);
            }
        }
    },

    init: () => {
        if (typeof window === 'undefined') return;

        window.addEventListener('online', () => {
            console.log("[Sync] Online detected. Processing queue...");
            SyncService.processQueue();
        });

        // Periodic check every 60s
        setInterval(() => {
            if (navigator.onLine) SyncService.processQueue();
        }, 60000);
    }
};
