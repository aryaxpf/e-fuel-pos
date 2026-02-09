import { TransactionResult } from '../lib/fuel-logic';
import { supabase } from '../lib/supabase';
import { SyncService } from './sync';
import { TransactionSchema, InventorySchema } from '../lib/validation';

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
    paymentMethod?: 'CASH' | 'DEBT';
}

export interface PricingRule {
    id: string;
    nominal: number;
    liter: number;
    isActive: boolean;
}

export interface StoreSettings {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    receiptFooter: string;
    printerWidth: '58mm' | '80mm';
    enableTax: boolean;
    taxRate: number;
    waApiKey?: string;
    ownerPhone?: string;
}

const KEYS = {
    INVENTORY: 'efuel_inventory',
    TRANSACTIONS: 'efuel_transactions',
    PRICING: 'efuel_pricing',
};

// Helper to simulate DB ID generation (valid UUID for Supabase)
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers (simple random UUID-like string)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

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
        // Validation
        const validation = InventorySchema.safeParse(log);
        if (!validation.success) {
            console.error("Validation Error:", validation.error);
            throw new Error(`Data Inventaris Tidak Valid: ${validation.error.issues[0].message}`);
        }

        let useLocal = !supabase;
        const date = new Date().toISOString();
        const logId = generateId();

        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('inventory_logs')
                    .insert({
                        id: logId,
                        type: log.type,
                        volume: log.volume,
                        cost_per_liter: log.costPerLiter,
                        notes: log.notes,
                        date: date,
                    })
                    .select()
                    .single();

                if (error) throw error;
                return { ...log, id: data.id, date: data.date } as InventoryLog;
            } catch (err) {
                console.warn("Supabase addInventoryLog failed, falling back:", err);
                useLocal = true;
            }
        }

        if (useLocal) {
            const logs = await StorageService.getInventoryLogs();
            const newLog: InventoryLog = {
                ...log,
                id: logId,
                date,
            };
            logs.unshift(newLog);
            localStorage.setItem(KEYS.INVENTORY, JSON.stringify(logs));

            if (supabase) {
                const payload = {
                    id: logId,
                    type: log.type,
                    volume: log.volume,
                    cost_per_liter: log.costPerLiter,
                    notes: log.notes,
                    date: date,
                };
                SyncService.addToQueue('INSERT_INVENTORY', payload);
            }
            return newLog;
        }
        throw new Error("Storage Error");
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

    deleteInventoryLog: async (id: string, actor?: { id: string, username: string }) => {
        let useLocal = !supabase;

        if (supabase) {
            try {
                // Call Secure RPC
                const { data, error } = await supabase.rpc('delete_inventory_log', {
                    p_log_id: id,
                    p_reason: 'Manual Delete',
                    p_username: actor?.username || 'System',
                    p_user_id: actor?.id
                });

                if (error) throw error;
                if (!data.success) throw new Error(data.error);

                // Audit is handled inside RPC
            } catch (err) {
                console.warn("Supabase delete_inventory_log RPC failed, falling back:", err);
                useLocal = true;
            }
        }

        if (useLocal) {
            const logs = JSON.parse(localStorage.getItem(KEYS.INVENTORY) || '[]');
            const deletedLog = logs.find((l: any) => l.id === id);
            const newLogs = logs.filter((l: any) => l.id !== id);
            localStorage.setItem(KEYS.INVENTORY, JSON.stringify(newLogs));

            // Audit Log (Local) 
            if (actor) {
                await StorageService.logAudit(actor.id, actor.username, 'DELETE_STOCK', { id, details: deletedLog });
            }

            if (supabase) {
                SyncService.addToQueue('DELETE_STOCK', { id });
            }
        }
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
                paymentMethod: item.payment_method || 'CASH',
            }));
        }

        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(KEYS.TRANSACTIONS);
        return data ? JSON.parse(data) : [];
    },

    getTransactionById: async (id: string): Promise<TransactionRecord | null> => {
        if (supabase) {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) return null;

            return {
                id: data.id,
                timestamp: data.timestamp,
                nominal: Number(data.nominal),
                liter: Number(data.liter),
                profit: Number(data.profit),
                cost: 0,
                isSpecialRule: data.is_special_rule,
            };
        }

        const transactions = await StorageService.getTransactions();
        return transactions.find(t => t.id === id) || null;
    },

    addTransaction: async (result: TransactionResult) => {
        // Validation
        const validation = TransactionSchema.safeParse(result);
        if (!validation.success) {
            console.error("Validation Error:", validation.error);
            throw new Error(`Data Transaksi Tidak Valid: ${validation.error.issues[0].message}`);
        }

        let useLocal = !supabase;
        const transactionId = generateId();
        const timestamp = new Date().toISOString();

        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('transactions')
                    .insert({
                        id: transactionId,
                        nominal: result.nominal,
                        liter: result.liter,
                        profit: result.profit,
                        is_special_rule: result.isSpecialRule,
                        payment_method: (result as any).paymentMethod || 'CASH',
                        timestamp: timestamp,
                    })
                    .select()
                    .single();

                if (error) throw error;
                return { ...result, id: data.id, timestamp: data.timestamp } as TransactionRecord;
            } catch (err) {
                console.warn("Supabase addTransaction failed, falling back:", err);
                useLocal = true;
            }
        }

        if (useLocal) {
            const records = await StorageService.getTransactions();
            const newRecord: TransactionRecord = {
                ...result,
                id: transactionId,
                timestamp: timestamp,
                paymentMethod: (result as any).paymentMethod || 'CASH'
            };
            records.unshift(newRecord);
            localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(records));

            if (supabase) {
                const payload = {
                    id: transactionId,
                    nominal: result.nominal,
                    liter: result.liter,
                    profit: result.profit,
                    is_special_rule: result.isSpecialRule,
                    payment_method: (result as any).paymentMethod || 'CASH',
                    timestamp: timestamp,
                };
                SyncService.addToQueue('INSERT_TRANSACTION', payload);
            }
            return newRecord;
        }
        throw new Error("Storage Error");
    },

    deleteTransaction: async (id: string, literToRestore: number, nominal: number) => {
        let useLocal = !supabase;

        if (supabase) {
            try {
                // 1. Call Secure RPC to Void Transaction (Atomically restores stock & audits)
                const { data, error } = await supabase.rpc('void_transaction', {
                    p_transaction_id: id,
                    p_reason: `Void Transaksi (${nominal})`,
                    p_username: 'System' // Ideally pass actual user
                });

                if (error) throw error;
                if (!data.success) throw new Error(data.error);

                // RPC handles both delete and stock restoration, so we don't need manual steps here.
            } catch (err) {
                console.warn("Supabase void_transaction RPC failed, falling back:", err);
                useLocal = true;
            }
        }

        if (useLocal) {
            // LocalStorage
            const records = await StorageService.getTransactions();
            const newRecords = records.filter(r => r.id !== id);
            localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(newRecords));

            // Restore Stock (This will handle its own Sync/Fallback)
            await StorageService.addInventoryLog({
                type: 'ADJUSTMENT',
                volume: literToRestore,
                costPerLiter: 0,
                notes: `Void Transaksi (${nominal})`
            });

            if (supabase) {
                SyncService.addToQueue('DELETE_TRANSACTION', { id });
                // Note: The addInventoryLog above calls its own queueing logic, 
                // so we don't need to queue the Restore here manually, 
                // unless we want to be explicit. But addInventoryLog is safer.
            }
        }
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
    login: async (username: string, password: string): Promise<{ success: boolean; role?: 'admin' | 'cashier'; id?: string; error?: string }> => {
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
                    return { success: true, role: 'admin', id: newAdmin.id };
                }
            }

            if (error || !data) return { success: false, error: 'User tidak ditemukan' };

            // Simple string comparison for MVP as requested
            if (data.password === password) {
                return { success: true, role: data.role, id: data.id };
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
        if (user.password === password) return { success: true, role: user.role, id: user.id };
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
    },

    // --- Request System (Phase 12) ---
    addRequest: async (type: 'VOID_TRANSACTION' | 'EDIT_TRANSACTION' | 'VOID_INVENTORY' | 'EXPENSE_VOID', payload: any, requester: string) => {
        const localId = generateId();
        const baseRequest = {
            type,
            payload,
            status: 'PENDING',
            requester_name: requester,
            created_at: new Date().toISOString()
        };

        if (supabase) {
            // Let Supabase generate the UUID
            const { error } = await supabase.from('requests').insert(baseRequest);
            if (error) throw error;
        } else {
            const requests = JSON.parse(localStorage.getItem('efuel_requests') || '[]');
            requests.unshift({ ...baseRequest, id: localId });
            localStorage.setItem('efuel_requests', JSON.stringify(requests));
        }
    },

    getRequests: async () => {
        if (supabase) {
            const { data, error } = await supabase
                .from('requests')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) return [];
            return data;
        }
        return JSON.parse(localStorage.getItem('efuel_requests') || '[]');
    },

    updateRequestStatus: async (id: string, status: 'APPROVED' | 'REJECTED') => {
        if (supabase) {
            const { error } = await supabase
                .from('requests')
                .update({ status })
                .eq('id', id);
            if (error) throw error;
        } else {
            const requests = JSON.parse(localStorage.getItem('efuel_requests') || '[]');
            const index = requests.findIndex((r: any) => r.id === id);
            if (index !== -1) {
                requests[index].status = status;
                localStorage.setItem('efuel_requests', JSON.stringify(requests));
            }
        }
    },

    // --- Shift Management (Phase 14) ---
    startShift: async (userId: string, initialCash: number, requesterName: string) => {
        const shift = {
            user_id: userId,
            requester_name: requesterName,
            initial_cash: initialCash,
            start_time: new Date().toISOString(),
            status: 'OPEN',
            expected_cash: 0,
            final_cash: 0,
            variance: 0
        };

        if (supabase) {
            const { data, error } = await supabase.from('shifts').insert(shift).select().single();
            if (error) throw error;
            return data;
        }

        const shifts = JSON.parse(localStorage.getItem('efuel_shifts') || '[]');
        const newShift = { ...shift, id: generateId() };
        shifts.unshift(newShift);
        localStorage.setItem('efuel_shifts', JSON.stringify(shifts));
        return newShift;
    },

    getCurrentShift: async (userId: string) => {
        if (supabase) {
            const { data, error } = await supabase
                .from('shifts')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'OPEN')
                .order('start_time', { ascending: false })
                .limit(1)
                .maybeSingle(); // Safer than .single()

            if (error) {
                console.error("Error fetching current shift:", error);
                return null;
            }
            return data;
        }
        const shifts = JSON.parse(localStorage.getItem('efuel_shifts') || '[]');
        return shifts.find((s: any) => s.user_id === userId && s.status === 'OPEN') || null;
    },

    closeShift: async (shiftId: string, finalCash: number, expectedCash: number) => {
        const updates = {
            end_time: new Date().toISOString(),
            final_cash: finalCash,
            expected_cash: expectedCash,
            variance: finalCash - expectedCash,
            status: 'CLOSED'
        };

        if (supabase) {
            const { error } = await supabase.from('shifts').update(updates).eq('id', shiftId);
            if (error) throw error;
        } else {
            const shifts = JSON.parse(localStorage.getItem('efuel_shifts') || '[]');
            const index = shifts.findIndex((s: any) => s.id === shiftId);
            if (index !== -1) {
                shifts[index] = { ...shifts[index], ...updates };
                localStorage.setItem('efuel_shifts', JSON.stringify(shifts));
            }
        }
    },

    getShiftHistory: async () => {
        if (supabase) {
            const { data } = await supabase.from('shifts').select('*').order('start_time', { ascending: false });
            return data || [];
        }
        return JSON.parse(localStorage.getItem('efuel_shifts') || '[]');
    },

    // --- Debt Management (Phase 15) ---
    getCustomers: async () => {
        if (supabase) {
            const { data } = await supabase.from('customers').select('*').order('name');
            return data || [];
        }
        return JSON.parse(localStorage.getItem('efuel_customers') || '[]');
    },

    addCustomer: async (name: string, phone?: string) => {
        if (supabase) {
            const { data, error } = await supabase
                .from('customers')
                .insert({ name, phone })
                .select()
                .single();
            if (error) throw error;
            return data;
        }
        const customers = JSON.parse(localStorage.getItem('efuel_customers') || '[]');
        const newCustomer = { id: generateId(), name, phone, created_at: new Date().toISOString() };
        customers.push(newCustomer);
        localStorage.setItem('efuel_customers', JSON.stringify(customers));
        return newCustomer;
    },

    addDebt: async (customerId: string, transactionId: string, amount: number, notes?: string) => {
        const debt = {
            customer_id: customerId,
            transaction_id: transactionId,
            amount,
            amount_paid: 0,
            status: 'UNPAID',
            notes,
            created_at: new Date().toISOString()
        };

        if (supabase) {
            const { error } = await supabase.from('debts').insert(debt);
            if (error) throw error;
        } else {
            const debts = JSON.parse(localStorage.getItem('efuel_debts') || '[]');
            debts.unshift({ ...debt, id: generateId() });
            localStorage.setItem('efuel_debts', JSON.stringify(debts));
        }
    },

    getDebts: async () => {
        if (supabase) {
            const { data } = await supabase
                .from('debts')
                .select('*, customers(name)')
                .order('created_at', { ascending: false });
            return data || [];
        }
        // LocalStorage mock join
        const debts = JSON.parse(localStorage.getItem('efuel_debts') || '[]');
        const customers = JSON.parse(localStorage.getItem('efuel_customers') || '[]');
        return debts.map((d: any) => ({
            ...d,
            customers: customers.find((c: any) => c.id === d.customer_id)
        }));
    },

    payDebt: async (debtId: string, amount: number) => {
        // Fetch current debt first to calculate status
        let currentDebt;
        if (supabase) {
            const { data } = await supabase.from('debts').select('*').eq('id', debtId).single();
            currentDebt = data;
        } else {
            const debts = JSON.parse(localStorage.getItem('efuel_debts') || '[]');
            currentDebt = debts.find((d: any) => d.id === debtId);
        }

        if (!currentDebt) throw new Error('Debt not found');

        // Prevent overpayment
        const remaining = currentDebt.amount - (currentDebt.amount_paid || 0);
        const actualPay = Math.min(amount, remaining);
        const newPaid = (currentDebt.amount_paid || 0) + actualPay;
        const newStatus = newPaid >= currentDebt.amount ? 'PAID' : 'PARTIAL';

        if (supabase) {
            const { error } = await supabase
                .from('debts')
                .update({ amount_paid: newPaid, status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', debtId);
            if (error) throw error;
        } else {
            const debts = JSON.parse(localStorage.getItem('efuel_debts') || '[]');
            const index = debts.findIndex((d: any) => d.id === debtId);
            if (index !== -1) {
                debts[index] = { ...debts[index], amount_paid: newPaid, status: newStatus, updated_at: new Date().toISOString() };
                localStorage.setItem('efuel_debts', JSON.stringify(debts));
            }
        }
    },

    // --- Store Settings (Phase 18) ---
    getStoreSettings: async () => {
        if (supabase) {
            const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).single();
            if (error) return null;
            // Map snake_case -> camelCase
            return {
                storeName: data.store_name,
                storeAddress: data.store_address,
                storePhone: data.store_phone,
                receiptFooter: data.receipt_footer,
                printerWidth: data.printer_width,
                enableTax: data.enable_tax,
                taxRate: data.tax_rate,
                waApiKey: data.wa_api_key,
                ownerPhone: data.owner_phone
            };
        }
        return JSON.parse(localStorage.getItem('efuel_settings') || 'null');
    },

    updateStoreSettings: async (settings: any, actor?: string) => {
        let useLocal = !supabase;
        // Map camelCase -> snake_case
        const dbPayload = {
            id: 1,
            store_name: settings.storeName,
            store_address: settings.storeAddress,
            store_phone: settings.storePhone,
            receipt_footer: settings.receiptFooter,
            printer_width: settings.printerWidth,
            enable_tax: settings.enableTax,
            tax_rate: settings.taxRate,
            wa_api_key: settings.waApiKey,
            owner_phone: settings.ownerPhone,
            updated_at: new Date().toISOString()
        };

        if (supabase) {
            try {
                const { error } = await supabase
                    .from('store_settings')
                    .upsert(dbPayload);
                if (error) throw error;

                // Audit
                if (actor) {
                    await StorageService.logAudit(actor, 'Unknown', 'UPDATE_SETTINGS', settings);
                }
            } catch (err) {
                console.warn("Supabase updateStoreSettings failed, falling back:", err);
                useLocal = true;
            }
        }

        if (useLocal) {
            localStorage.setItem('efuel_settings', JSON.stringify(settings));
            if (actor) {
                await StorageService.logAudit(actor, 'Unknown', 'UPDATE_SETTINGS', settings);
            }
            if (supabase) {
                SyncService.addToQueue('UPDATE_SETTINGS', dbPayload);
            }
        }
    },

    // --- Expense Management (Phase 19) ---
    getExpenses: async () => {
        if (supabase) {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false });
            return data || [];
        }
        return JSON.parse(localStorage.getItem('efuel_expenses') || '[]');
    },

    addExpense: async (expense: any) => {
        let useLocal = !supabase;
        const expenseId = generateId();
        const payload = { ...expense, id: expenseId };

        if (supabase) {
            try {
                const { error } = await supabase.from('expenses').insert(payload);
                if (error) throw error;
            } catch (err) {
                console.warn("Supabase addExpense failed, falling back:", err);
                useLocal = true;
            }
        }

        if (useLocal) {
            const expenses = JSON.parse(localStorage.getItem('efuel_expenses') || '[]');
            expenses.unshift(payload);
            localStorage.setItem('efuel_expenses', JSON.stringify(expenses));

            if (supabase) {
                SyncService.addToQueue('INSERT_EXPENSE', payload);
            }
        }
    },

    deleteExpense: async (id: string, actor?: { id: string, username: string }) => {
        let useLocal = !supabase;

        if (supabase) {
            try {
                const { error } = await supabase.from('expenses').delete().eq('id', id);
                if (error) throw error;
                // Audit (Supabase)
                if (actor) {
                    await StorageService.logAudit(actor.id, actor.username, 'DELETE_EXPENSE', { id });
                }
            } catch (err) {
                console.warn("Supabase deleteExpense failed, falling back:", err);
                useLocal = true;
            }
        }

        if (useLocal) {
            const expenses = JSON.parse(localStorage.getItem('efuel_expenses') || '[]');
            const newExpenses = expenses.filter((e: any) => e.id !== id);
            localStorage.setItem('efuel_expenses', JSON.stringify(newExpenses));
            // Audit (Local)
            if (actor) {
                await StorageService.logAudit(actor.id, actor.username, 'DELETE_EXPENSE', { id });
            }
            if (supabase) {
                // For delete, payload is just ID (or object with ID)
                SyncService.addToQueue('DELETE_EXPENSE', { id });
            }
        }
    },

    // --- Audit System (Phase 24) ---
    logAudit: async (userId: string, username: string, action: string, details: any) => {
        const logEntry = {
            user_id: userId,
            username: username,
            action: action,
            details: details,
            created_at: new Date().toISOString(),
            ip_address: 'client-side' // reliable IP requires server-side
        };

        if (supabase) {
            await supabase.from('audit_logs').insert(logEntry);
        } else {
            const logs = JSON.parse(localStorage.getItem('efuel_audit_logs') || '[]');
            logs.unshift({ ...logEntry, id: generateId() });
            localStorage.setItem('efuel_audit_logs', JSON.stringify(logs));
        }
    },

    getAuditLogs: async () => {
        if (supabase) {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) return [];
            return data;
        } else {
            return JSON.parse(localStorage.getItem('efuel_audit_logs') || '[]');
        }
    },

    // --- Backup & Export (Phase 27) ---
    exportData: async () => {
        const timestamp = new Date().toISOString();
        const data: any = {
            version: '1.0',
            timestamp,
            settings: await StorageService.getStoreSettings(),
            transactions: await StorageService.getTransactions(),
            inventory: await StorageService.getInventoryLogs(),
            expenses: await StorageService.getExpenses(),
            audit: await StorageService.getAuditLogs(),
            // Fetch debts and shifts if available
            debts: [],
            shifts: []
        };

        // Debts
        if (supabase) {
            const { data: debts } = await supabase.from('debts').select('*');
            if (debts) data.debts = debts;
        } else {
            data.debts = JSON.parse(localStorage.getItem('efuel_debts') || '[]');
        }

        // Shifts
        if (supabase) {
            const { data: shifts } = await supabase.from('shifts').select('*');
            if (shifts) data.shifts = shifts;
        } else {
            data.shifts = JSON.parse(localStorage.getItem('efuel_shifts') || '[]');
        }

        return data;
    }
};
