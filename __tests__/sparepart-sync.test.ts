import { ProductService, ProductCartItem } from '../src/services/productService';
import { SyncService } from '../src/services/sync';
import { LoggerService } from '../src/services/logger';

// Mock Supabase to be null, forcing the fallback paths
jest.mock('../src/lib/supabase', () => ({
    supabase: null
}));

// Mock SyncService and LoggerService
jest.mock('../src/services/sync', () => ({
    SyncService: {
        addToQueue: jest.fn(),
    }
}));

jest.mock('../src/services/logger', () => ({
    LoggerService: {
        logAction: jest.fn(),
    }
}));

describe('Sparepart Stock Sync', () => {
    const adminActor = { id: 'admin-1', username: 'admin', role: 'admin' as const };
    const cashierActor = { id: 'cashier-1', username: 'kasir1', role: 'cashier' as const };

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    describe('getProductStock', () => {
        it('should correctly sum IN and subtract OUT logs', async () => {
            const logs = [
                { product_id: '123e4567-e89b-12d3-a456-426614174000', type: 'IN', quantity: 10 },
                { product_id: '123e4567-e89b-12d3-a456-426614174000', type: 'OUT', quantity: 3 },
                { product_id: '123e4567-e89b-12d3-a456-426614174001', type: 'IN', quantity: 5 } // Irrelevant product
            ];
            localStorage.setItem('efuel_product_inventory', JSON.stringify(logs));

            const stock = await ProductService.getProductStock('123e4567-e89b-12d3-a456-426614174000');
            expect(stock).toBe(7); // 10 - 3
        });

        it('should return 0 if no logs exist', async () => {
            const stock = await ProductService.getProductStock('123e4567-e89b-12d3-a456-426614174999');
            expect(stock).toBe(0);
        });
    });

    describe('restockProduct', () => {
        it('should add IN log and enqueue sync action', async () => {
            await ProductService.restockProduct('123e4567-e89b-12d3-a456-426614174000', 20, 50000, 'Initial Stock', adminActor);

            const logs = JSON.parse(localStorage.getItem('efuel_product_inventory') || '[]');
            expect(logs.length).toBe(1);
            expect(logs[0].type).toBe('IN');
            expect(logs[0].quantity).toBe(20);

            expect(SyncService.addToQueue).toHaveBeenCalledWith('INSERT_PRODUCT_INVENTORY', expect.any(Object));
        });

        it('should fail if cashier tries to restock', async () => {
            await expect(
                ProductService.restockProduct('123e4567-e89b-12d3-a456-426614174000', 20, 50000, 'Initial Stock', cashierActor)
            ).rejects.toThrow('Akses Ditolak');

            expect(SyncService.addToQueue).not.toHaveBeenCalled();
        });
    });

    describe('processProductSale', () => {
        it('should process valid sale, update inventory, and enqueue sync', async () => {
            // Setup initial stock for prod-1 = 10
            localStorage.setItem('efuel_product_inventory', JSON.stringify([
                { product_id: '123e4567-e89b-12d3-a456-426614174000', type: 'IN', quantity: 10 }
            ]));

            const cart: ProductCartItem[] = [
                { product_id: '123e4567-e89b-12d3-a456-426614174000', name: 'Oli', qty: 2, sell_price: 60000, buy_price: 50000, subtotal: 120000 }
            ];

            const result = await ProductService.processProductSale(cart, 'CASH', cashierActor);

            expect(result.success).toBe(true);
            expect(result.transaction_id).toBeDefined();

            // Verify Sync actions were enqueued
            expect(SyncService.addToQueue).toHaveBeenCalledWith('INSERT_PRODUCT_TRANSACTION', expect.any(Object));
            expect(SyncService.addToQueue).toHaveBeenCalledWith('INSERT_PRODUCT_INVENTORY', expect.objectContaining({ type: 'OUT', quantity: 2 }));

            // Verify localStorage
            const invs = JSON.parse(localStorage.getItem('efuel_product_inventory') || '[]');
            expect(invs.length).toBe(2); // 1 IN, 1 OUT
            expect(invs[1].type).toBe('OUT');
            expect(invs[1].quantity).toBe(2);
        });

        it('should reject sale if stock is insufficient', async () => {
            // Setup initial stock for prod-1 = 1
            localStorage.setItem('efuel_product_inventory', JSON.stringify([
                { product_id: '123e4567-e89b-12d3-a456-426614174000', type: 'IN', quantity: 1 }
            ]));

            const cart: ProductCartItem[] = [
                { product_id: '123e4567-e89b-12d3-a456-426614174000', name: 'Oli', qty: 2, sell_price: 60000, buy_price: 50000, subtotal: 120000 }
            ];

            await expect(
                ProductService.processProductSale(cart, 'CASH', cashierActor)
            ).rejects.toThrow('Stok Oli sisa 1, butuh 2');

            // Ensure no sync was queued
            expect(SyncService.addToQueue).not.toHaveBeenCalled();
        });
    });
});
