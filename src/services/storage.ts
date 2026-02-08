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

    deleteTransaction: async (id: string, literToRestore: number, nominal: number) => {
        if (supabase) {
            // 1. Delete Transaction
            const { error: deleteError } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // 2. Restore Stock (Add Adjustment Log)
            const { error: logError } = await supabase
                .from('inventory_logs')
                .insert({
                    type: 'ADJUSTMENT',
                    volume: literToRestore,
                    cost_per_liter: 0,
                    notes: `Void Transaksi (${nominal})`,
                    date: new Date().toISOString()
                });

            if (logError) console.error("Failed to auto-restore stock", logError);
            return;
        }

        // LocalStorage
        const records = await StorageService.getTransactions();
        const newRecords = records.filter(r => r.id !== id);
        localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(newRecords));

        // Restore Stock
        await StorageService.addInventoryLog({
            type: 'ADJUSTMENT',
            volume: literToRestore,
            costPerLiter: 0,
            notes: `Void Transaksi (${nominal})`
        });
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
            const defaultRules: PricingRule[] = [
                { id: '1', nominal: 10000, liter: 0.7, isActive: true },
                { id: '2', nominal: 6000, liter: 0.5, isActive: true },
                { id: '3', nominal: 15000, liter: 1.2, isActive: true },
            ];
            localStorage.setItem(KEYS.PRICING, JSON.stringify(defaultRules));
            return defaultRules;
        }
        return JSON.parse(data);
    },

    // --- User Management (Phase 8) ---
    login: async (username: string, password: string): Promise<{ success: boolean; role?: 'admin' | 'cashier'; error?: string }> => {
        console.log("Login Attempt:", username, password); // Debug log
        const cleanUser = username.toLowerCase().trim();

        // 1. GLOBAL ADMIN BYPASS REMOVED to allow password changes.
        // The admin user is now initialized in storage below if missing.

        if (supabase) {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', cleanUser)
                .single();

            // Self-Healing for Supabase: If admin is missing, create it
            if ((error || !data) && cleanUser === 'admin') {
                console.log("Admin user missing in Supabase. Attempting to create...");
                const { data: newAdmin, error: createError } = await supabase
                    .from('users')
                    .insert({ username: 'admin', password: 'admin123', role: 'admin' })
                    .select()
                    .single();

                if (createError) {
                    console.error("Auto-create Admin Failed:", createError);
                    // Check for RLS or Table Missing
                    if (createError.code === '42P01') {
                        return { success: false, error: 'Tabel "users" tidak ditemukan. Jalankan SQL Script di Supabase!' };
                    }
                    return { success: false, error: `Gagal buat admin: ${createError.message}` };
                }

                if (newAdmin) {
                    console.log("Admin created successfully.");
                    return { success: true, role: 'admin' };
                }
            }

            if (error || !data) return { success: false, error: 'User tidak ditemukan' };

            // Simple string comparison for MVP as requested
            if (data.password === password) {
                return { success: true, role: data.role };
            } else {
                return { success: false, error: 'Password salah' };
            }
        }

        // LocalStorage Fallback

        const users = JSON.parse(localStorage.getItem('users') || '[]');

        // Ensure Admin Exists (Self-Healing)
        // If 'admin' doesn't exist, create it with default credentials
        // This allows it to show up in the list and be editable
        if (!users.find((u: any) => u.username === 'admin')) {
            const defaultAdmin = { id: 'admin-1', username: 'admin', password: 'admin123', role: 'admin' };
            users.push(defaultAdmin);
            localStorage.setItem('users', JSON.stringify(users));
        }

        const user = users.find((u: any) => u.username === cleanUser);
        if (!user) return { success: false, error: 'User tidak ditemukan' };
        if (user.password === password) return { success: true, role: user.role };
        return { success: false, error: 'Password salah' };
    },

    getUsers: async () => {
        if (supabase) {
            const { data } = await supabase.from('users').select('*').order('username');
            return data || [];
        }
        return JSON.parse(localStorage.getItem('users') || '[]');
    },

    addUser: async (user: any) => {
        if (supabase) {
            const { error } = await supabase.from('users').insert(user);
            if (error) throw error;
            return;
        }
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.find((u: any) => u.username === user.username)) throw new Error('Username sudah ada');
        users.push({ ...user, id: Date.now().toString() });
        localStorage.setItem('users', JSON.stringify(users));
    },

    updateUser: async (id: string, updates: any) => {
        if (supabase) {
            const { error } = await supabase.from('users').update(updates).eq('id', id);
            if (error) throw error;
            return;
        }
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const index = users.findIndex((u: any) => u.id === id);
        if (index === -1) throw new Error('User not found');

        users[index] = { ...users[index], ...updates };
        localStorage.setItem('users', JSON.stringify(users));
    },

    deleteUser: async (id: string) => {
        if (supabase) {
            const { error } = await supabase.from('users').delete().eq('id', id);
            if (error) throw error;
            return;
        }
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const newUsers = users.filter((u: any) => u.id !== id);
        localStorage.setItem('users', JSON.stringify(newUsers));
    }
};
