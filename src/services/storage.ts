import { TransactionResult } from '../lib/fuel-logic';
import { supabase } from '../lib/supabase';

export interface InventoryLog {
    id: string;
    date: string;
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    volume: number;
    costPerLiter: number;
    notes?: string;
}

export interface TransactionRecord extends TransactionResult {
    id: string;
    timestamp: string;
}

export interface PricingRule {
    id: string;
    nominal: number;
    liter: number;
    isActive: boolean;
}

const KEYS = {
    INVENTORY: 'efuel_inventory',
    TRANSACTIONS: 'efuel_transactions',
    PRICING: 'efuel_pricing',
};

// Helper to simulate DB ID generation (for LocalStorage)
const generateId = () => Math.random().toString(36).substr(2, 9);

export const StorageService = {
    // --- Inventory ---
    getInventoryLogs: async (): Promise<InventoryLog[]> => {
        // 1. Supabase Mode
        if (supabase) {
            const { data, error } = await supabase
                .from('inventory_logs')
                .select('*')
                .order('date', { ascending: false });

            if (error) {
                console.error('Supabase Error:', error);
                return [];
            }

            // Map snake_case -> camelCase
            return (data || []).map((item: any) => ({
                id: item.id,
                date: item.date,
                type: item.type,
                volume: Number(item.volume),
                costPerLiter: Number(item.cost_per_liter),
                notes: item.notes,
            }));
        }

        // 2. LocalStorage Mode
        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(KEYS.INVENTORY);
        return data ? JSON.parse(data) : [];
    },

    addInventoryLog: async (log: Omit<InventoryLog, 'id' | 'date'>) => {
        const date = new Date().toISOString();

        if (supabase) {
            const { data, error } = await supabase
                .from('inventory_logs')
                .insert({
                    type: log.type,
                    volume: log.volume,
                    cost_per_liter: log.costPerLiter,
                    notes: log.notes,
                    date: date,
                })
                .select()
                .single();

            if (error) {
                console.error('Supabase Error:', error);
                throw error;
            }
            return { ...log, id: data.id, date: data.date } as InventoryLog;
        }

        // LocalStorage Fallback
        const logs = await StorageService.getInventoryLogs();
        const newLog: InventoryLog = {
            ...log,
            id: generateId(),
            date,
        };
        logs.unshift(newLog);
        localStorage.setItem(KEYS.INVENTORY, JSON.stringify(logs));
        return newLog;
    },

    getCurrentStock: async (): Promise<number> => {
        // Fetch all logs and transactions properly
        const logs = await StorageService.getInventoryLogs();
        const transactions = await StorageService.getTransactions();

        const totalIn = logs
            .filter((l) => l.type === 'IN' || l.type === 'ADJUSTMENT')
            .reduce((acc, curr) => acc + curr.volume, 0);

        const totalOut = transactions.reduce((acc, curr) => acc + curr.liter, 0);

        // Also subtract manual 'OUT' logs
        const manualOut = logs
            .filter((l) => l.type === 'OUT')
            .reduce((acc, curr) => acc + curr.volume, 0);

        return Number((totalIn - totalOut - manualOut).toFixed(2));
    },

    // --- Transactions ---
    getTransactions: async (): Promise<TransactionRecord[]> => {
        if (supabase) {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('timestamp', { ascending: false });

            if (error) {
                console.error('Supabase Error:', error);
                return [];
            }

            return (data || []).map((item: any) => ({
                id: item.id,
                timestamp: item.timestamp,
                nominal: Number(item.nominal),
                liter: Number(item.liter),
                profit: Number(item.profit),
                cost: 0, // Not stored in DB, strictly calculated
                isSpecialRule: item.is_special_rule,
            }));
        }

        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(KEYS.TRANSACTIONS);
        return data ? JSON.parse(data) : [];
    },

    addTransaction: async (result: TransactionResult) => {
        if (supabase) {
            const { data, error } = await supabase
                .from('transactions')
                .insert({
                    nominal: result.nominal,
                    liter: result.liter,
                    profit: result.profit,
                    is_special_rule: result.isSpecialRule,
                    timestamp: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) {
                console.error('Supabase Error:', error);
                throw error;
            }
            return { ...result, id: data.id, timestamp: data.timestamp } as TransactionRecord;
        }

        const records = await StorageService.getTransactions();
        const newRecord: TransactionRecord = {
            ...result,
            id: generateId(),
            timestamp: new Date().toISOString(),
        };
        records.unshift(newRecord);
        localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(records));
        return newRecord;
    },

    // --- Pricing Rules ---
    getPricingRules: async (): Promise<PricingRule[]> => {
        if (supabase) {
            const { data, error } = await supabase.from('pricing_rules').select('*');
            if (data && data.length > 0) {
                return data.map((item: any) => ({
                    id: item.id,
                    nominal: Number(item.nominal),
                    liter: Number(item.liter),
                    isActive: item.is_active
                }));
            }
            // If empty, loop logic below to insert defaults? 
            // For now, let's just return defaults if DB is empty to avoid breaking
        }

        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(KEYS.PRICING);
        if (!data) {
            const defaults: PricingRule[] = [
                { id: '1', nominal: 10000, liter: 0.7, isActive: true },
                { id: '2', nominal: 6000, liter: 0.5, isActive: true },
                { id: '3', nominal: 15000, liter: 1.2, isActive: true },
            ];
            localStorage.setItem(KEYS.PRICING, JSON.stringify(defaults));
            return defaults;
        }
        return JSON.parse(data);
    },
};
