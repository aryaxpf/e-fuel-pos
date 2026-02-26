import { supabase } from '../lib/supabase';
import { LoggerService } from './logger';
import { SyncService } from './sync';
import { Role, requirePermission } from '../lib/rbac';
import { ProductSchema, ProductInventorySchema } from '../lib/validation';

export interface Product {
    id: string;
    name: string;
    sku?: string;
    category: string;
    buy_price: number;
    sell_price: number;
    unit: string;
    min_stock: number;
    is_active: boolean;
    image_url?: string;
}

export interface ProductCartItem {
    product_id: string;
    name: string;
    qty: number;
    sell_price: number;
    buy_price: number;
    subtotal: number;
}

// Fallback Keys
const KEYS = {
    PRODUCTS: 'efuel_products',
    PRODUCT_INVENTORY: 'efuel_product_inventory',
    PRODUCT_TRANSACTIONS: 'efuel_product_transactions',
};

// Helper ID Generator
const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export const ProductService = {
    // ==========================================
    // 1. PRODUCT CATALOG CRUD
    // ==========================================
    getProducts: async (): Promise<Product[]> => {
        if (supabase) {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('is_active', true)
                .order('name');
            if (error) {
                console.error('Supabase getProducts error:', error);
                // Fallback to local
                const local = localStorage.getItem(KEYS.PRODUCTS);
                return local ? JSON.parse(local).filter((p: any) => p.is_active) : [];
            }
            // Sync to local
            localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(data));
            return data as Product[];
        }
        const local = localStorage.getItem(KEYS.PRODUCTS);
        return local ? JSON.parse(local).filter((p: any) => p.is_active) : [];
    },

    addProduct: async (productData: Partial<Product>, actor: { id: string, username: string, role: Role }): Promise<Product> => {
        requirePermission(actor.role, 'MANAGE_PRODUCTS');

        // Validate
        const validData = ProductSchema.parse(productData);

        const newProduct = {
            ...validData,
            id: generateId(),
            created_at: new Date().toISOString()
        };

        if (supabase) {
            const { data, error } = await supabase.from('products').insert(newProduct).select().single();
            if (error) throw new Error(error.message);

            // Log Audit
            await LoggerService.logAction(actor.id, 'CREATE_PRODUCT', actor.username, { product: validData });
            return data;
        }

        // Local Fallback
        const products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
        products.push(newProduct);
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
        SyncService.addToQueue('INSERT_PRODUCT', newProduct);
        return newProduct as Product;
    },

    updateProduct: async (id: string, updates: Partial<Product>, actor: { id: string, username: string, role: Role }): Promise<void> => {
        requirePermission(actor.role, 'MANAGE_PRODUCTS');

        if (supabase) {
            const { error } = await supabase.from('products').update(updates).eq('id', id);
            if (error) throw new Error(error.message);
            await LoggerService.logAction(actor.id, 'UPDATE_PRODUCT', actor.username, { product_id: id, updates });
            return;
        }

        const products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
        const index = products.findIndex((p: any) => p.id === id);
        if (index > -1) {
            products[index] = { ...products[index], ...updates };
            localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
            SyncService.addToQueue('UPDATE_PRODUCT', { id, updates });
        }
    },

    deleteProduct: async (id: string, actor: { id: string, username: string, role: Role }): Promise<void> => {
        requirePermission(actor.role, 'MANAGE_PRODUCTS');
        // Soft delete
        return ProductService.updateProduct(id, { is_active: false }, actor);
    },

    // ==========================================
    // 2. STOCK & INVENTORY
    // ==========================================
    getProductStock: async (productId: string): Promise<number> => {
        if (supabase) {
            const { data, error } = await supabase
                .from('product_inventory')
                .select('type, quantity')
                .eq('product_id', productId);

            if (error) return 0;

            let stock = 0;
            data.forEach(log => {
                if (log.type === 'IN' || log.type === 'ADJUSTMENT') stock += log.quantity;
                if (log.type === 'OUT') stock -= log.quantity;
            });
            return stock;
        }

        const logs = JSON.parse(localStorage.getItem(KEYS.PRODUCT_INVENTORY) || '[]');
        let stock = 0;
        logs.filter((l: any) => l.product_id === productId).forEach((log: any) => {
            if (log.type === 'IN' || log.type === 'ADJUSTMENT') stock += log.quantity;
            if (log.type === 'OUT') stock -= log.quantity;
        });
        return stock;
    },

    restockProduct: async (productId: string, quantity: number, costPrice: number, notes: string, actor: { id: string, username: string, role: Role }) => {
        requirePermission(actor.role, 'RESTOCK_PRODUCTS');

        const validLog = ProductInventorySchema.parse({
            product_id: productId,
            type: 'IN',
            quantity,
            cost_price: costPrice,
            notes
        });

        const log = { ...validLog, id: generateId(), created_at: new Date().toISOString() };

        if (supabase) {
            const { error } = await supabase.from('product_inventory').insert(log);
            if (error) throw new Error(error.message);

            await LoggerService.logAction(actor.id, 'RESTOCK_PRODUCT', actor.username, { product_id: productId, quantity, cost_price: costPrice });
            return;
        }

        const logs = JSON.parse(localStorage.getItem(KEYS.PRODUCT_INVENTORY) || '[]');
        logs.push(log);
        localStorage.setItem(KEYS.PRODUCT_INVENTORY, JSON.stringify(logs));
        SyncService.addToQueue('INSERT_PRODUCT_INVENTORY', log);
    },

    // ==========================================
    // 3. TRANSACTION PROCESSING
    // ==========================================
    processProductSale: async (
        cart: ProductCartItem[],
        paymentMethod: 'CASH' | 'DEBT' | 'QRIS',
        actor: { id: string, username: string, role: Role },
        customerId?: string
    ) => {
        requirePermission(actor.role, 'SELL_PRODUCTS');

        if (!cart || cart.length === 0) throw new Error("Keranjang kosong!");

        if (supabase) {
            // Atomic DB execution via RPC
            const { data, error } = await supabase.rpc('process_product_transaction', {
                p_items: cart,
                p_payment: paymentMethod,
                p_customer_id: customerId || null,
                p_user_id: actor.id,
                p_username: actor.username
            });

            if (error) throw new Error(`RPC Error: ${error.message}`);
            if (!data.success) throw new Error(data.error);

            return data;
        }

        // --- LOCAL STORAGE FALLBACK (Sequential) ---
        // 1. Verify Stock
        const errors = [];
        for (const item of cart) {
            const stock = await ProductService.getProductStock(item.product_id);
            if (item.qty > stock) {
                errors.push(`Stok ${item.name} sisa ${stock}, butuh ${item.qty}`);
            }
        }
        if (errors.length > 0) throw new Error(errors.join('\\n'));

        // 2. Prepare Transaction
        let totalAmount = 0;
        let totalCost = 0;
        cart.forEach(c => {
            totalAmount += c.subtotal;
            totalCost += (c.buy_price * c.qty);
        });

        const trx = {
            id: generateId(),
            items: cart,
            total_amount: totalAmount,
            total_cost: totalCost,
            total_profit: totalAmount - totalCost,
            payment_method: paymentMethod,
            customer_id: customerId,
            user_id: actor.id,
            username: actor.username,
            timestamp: new Date().toISOString()
        };

        // 3. Save Transaction
        const trxs = JSON.parse(localStorage.getItem(KEYS.PRODUCT_TRANSACTIONS) || '[]');
        trxs.push(trx);
        localStorage.setItem(KEYS.PRODUCT_TRANSACTIONS, JSON.stringify(trxs));
        SyncService.addToQueue('INSERT_PRODUCT_TRANSACTION', trx);

        // 4. Save Inventory OUT logs
        const invs = JSON.parse(localStorage.getItem(KEYS.PRODUCT_INVENTORY) || '[]');
        cart.forEach(c => {
            const invLog = {
                id: generateId(),
                product_id: c.product_id,
                type: 'OUT',
                quantity: c.qty,
                cost_price: 0,
                notes: `Penjualan Kasir Lokal`,
                created_at: new Date().toISOString()
            };
            invs.push(invLog);
            SyncService.addToQueue('INSERT_PRODUCT_INVENTORY', invLog);
        });
        localStorage.setItem(KEYS.PRODUCT_INVENTORY, JSON.stringify(invs));

        return { success: true, transaction_id: trx.id };
    },

    getProductTransactionsForReports: async (startDate?: Date, endDate?: Date) => {
        if (supabase) {
            let query = supabase.from('product_transactions').select('*').order('timestamp', { ascending: false });
            if (startDate) query = query.gte('timestamp', startDate.toISOString());
            if (endDate) query = query.lte('timestamp', endDate.toISOString());

            const { data } = await query;
            return data || [];
        }

        let txs = JSON.parse(localStorage.getItem(KEYS.PRODUCT_TRANSACTIONS) || '[]');
        if (startDate && endDate) {
            txs = txs.filter((t: any) => new Date(t.timestamp) >= startDate && new Date(t.timestamp) <= endDate);
        }
        return txs;
    },

    getProductInventoryForReports: async (startDate?: Date, endDate?: Date) => {
        if (supabase) {
            let query = supabase.from('product_inventory').select('*').in('type', ['IN', 'ADJUSTMENT']);
            if (startDate) query = query.gte('created_at', startDate.toISOString());
            if (endDate) query = query.lte('created_at', endDate.toISOString());

            const { data } = await query;
            return data || [];
        }

        let logs = JSON.parse(localStorage.getItem(KEYS.PRODUCT_INVENTORY) || '[]');
        logs = logs.filter((l: any) => l.type === 'IN' || l.type === 'ADJUSTMENT');
        if (startDate && endDate) {
            logs = logs.filter((l: any) => new Date(l.created_at) >= startDate && new Date(l.created_at) <= endDate);
        }
        return logs;
    },

    voidProductTransaction: async (id: string, actor: { id: string, username: string, role: string }) => {
        requirePermission((actor.role || 'cashier') as Role, 'SELL_PRODUCTS');

        const trxs = await ProductService.getProductTransactionsForReports();
        const tx = trxs.find((t: any) => t.id === id);
        if (!tx) throw new Error("Transaksi barang tidak ditemukan");
        if (tx.status === 'VOID') throw new Error("Sudah dibatalkan");

        if (supabase) {
            const { error: txErr } = await supabase.from('product_transactions').update({ status: 'VOID' }).eq('id', id);
            if (txErr) throw txErr;

            for (const item of tx.items) {
                await ProductService.restockProduct(item.product_id, item.qty, item.buy_price, `VOID Barang: ${id}`, { ...actor, role: 'admin' as Role });
            }
            await LoggerService.logAction(actor.id, 'VOID_PRODUCT_SALE', actor.username, { transaction_id: id, total_amount: tx.total_amount });
            return;
        }

        const updated = trxs.map((t: any) => t.id === id ? { ...t, status: 'VOID' } : t);
        localStorage.setItem(KEYS.PRODUCT_TRANSACTIONS, JSON.stringify(updated));

        // Loop and add to queue inside restock
        for (const item of tx.items) {
            await ProductService.restockProduct(item.product_id, item.qty, item.buy_price, `VOID Barang: ${id}`, { ...actor, role: 'admin' as Role });
        }
        SyncService.addToQueue('UPDATE_PRODUCT_TRANSACTION', { id, status: 'VOID' });
    }
};
