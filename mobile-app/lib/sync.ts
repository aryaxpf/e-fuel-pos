import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import NetInfo from '@react-native-community/netinfo'; // We need to check if we can use this, or just try-catch

// Simple Queue System for Mobile
const QUEUE_KEY = 'efuel_mobile_queue';

export interface SyncItem {
    id: string;
    action: 'INSERT_ATTENDANCE';
    payload: any;
    timestamp: number;
    retryCount: number;
}

export const SyncService = {
    getQueue: async (): Promise<SyncItem[]> => {
        try {
            const data = await AsyncStorage.getItem(QUEUE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Failed to load queue", e);
            return [];
        }
    },

    saveQueue: async (queue: SyncItem[]) => {
        try {
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        } catch (e) {
            console.error("Failed to save queue", e);
        }
    },

    addToQueue: async (action: SyncItem['action'], payload: any) => {
        const queue = await SyncService.getQueue();
        const item: SyncItem = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(), // React native crypto might need polyfill
            action,
            payload,
            timestamp: Date.now(),
            retryCount: 0
        };
        queue.push(item);
        await SyncService.saveQueue(queue);
        console.log(`[Sync] Added to queue: ${action}`);

        // Try processing immediately
        SyncService.processQueue();
    },

    processQueue: async () => {
        const queue = await SyncService.getQueue();
        if (queue.length === 0) return;

        // Simple check if we can reach supabase (or just try)
        // For mobile, better to just try.

        console.log(`[Sync] Processing ${queue.length} items...`);
        let hasChanges = false;

        const newQueue = [...queue];

        for (let i = 0; i < newQueue.length; i++) {
            const item = newQueue[i];
            try {
                let error = null;

                if (item.action === 'INSERT_ATTENDANCE') {
                    const { error: err } = await supabase.from('attendance').insert(item.payload);
                    error = err;
                }

                if (error) {
                    console.error(`[Sync] Failed item ${item.id}`, error);
                    item.retryCount = (item.retryCount || 0) + 1;
                    hasChanges = true;
                    if (item.retryCount >= 5) {
                        newQueue.splice(i, 1);
                        i--; // Adjust index
                    }
                } else {
                    console.log(`[Sync] Success item ${item.id}`);
                    newQueue.splice(i, 1);
                    i--; // Adjust index
                    hasChanges = true;
                }
            } catch (err) {
                console.error(`[Sync] Error item ${item.id}`, err);
                item.retryCount = (item.retryCount || 0) + 1;
                hasChanges = true;
            }
        }

        if (hasChanges) {
            await SyncService.saveQueue(newQueue);
        }
    }
};
