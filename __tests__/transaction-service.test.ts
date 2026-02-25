/**
 * Transaction Service Tests
 *
 * These tests mock StorageService to test TransactionService logic
 * in isolation (stock guard, RBAC, price calculation, audit).
 */

// Mock StorageService before importing TransactionService
jest.mock('../src/services/storage', () => ({
    StorageService: {
        getCurrentStock: jest.fn(),
        addTransaction: jest.fn(),
        addInventoryLog: jest.fn(),
        deleteTransaction: jest.fn(),
        getTransactionById: jest.fn(),
        logAudit: jest.fn(),
    },
}));

import { TransactionService } from '../src/services/transactionService';
import { StorageService } from '../src/services/storage';

const mockedStorage = StorageService as jest.Mocked<typeof StorageService>;

describe('TransactionService', () => {
    const adminActor = { id: 'admin-1', username: 'admin', role: 'admin' as const };
    const cashierActor = { id: 'cashier-1', username: 'kasir1', role: 'cashier' as const };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // --- processTransaction ---
    describe('processTransaction', () => {
        test('should succeed with valid amount and sufficient stock', async () => {
            mockedStorage.getCurrentStock.mockResolvedValue(100); // 100L available
            mockedStorage.addTransaction.mockResolvedValue({
                id: 'tx-123',
                timestamp: '2026-01-01T00:00:00Z',
                nominal: 12000,
                liter: 1,
                profit: 2000,
                cost: 10000,
                isSpecialRule: false,
            });
            mockedStorage.addInventoryLog.mockResolvedValue({
                id: 'inv-1',
                date: '2026-01-01',
                type: 'OUT',
                volume: 1,
                costPerLiter: 0,
            });
            mockedStorage.logAudit.mockResolvedValue(undefined);

            const result = await TransactionService.processTransaction({
                amount: 12000,
                paymentMethod: 'CASH',
                actor: cashierActor,
            });

            expect(result.success).toBe(true);
            expect(result.record).toBeDefined();
            expect(result.record!.nominal).toBe(12000);
            expect(result.record!.liter).toBe(1);
        });

        test('should fail when stock is insufficient', async () => {
            mockedStorage.getCurrentStock.mockResolvedValue(0.5); // Only 0.5L

            const result = await TransactionService.processTransaction({
                amount: 12000, // needs 1L
                paymentMethod: 'CASH',
                actor: cashierActor,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Stok tidak cukup');
            // Should NOT call addTransaction
            expect(mockedStorage.addTransaction).not.toHaveBeenCalled();
        });

        test('should fail for zero or negative amount', async () => {
            const result = await TransactionService.processTransaction({
                amount: 0,
                paymentMethod: 'CASH',
                actor: cashierActor,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('tidak valid');
        });

        test('should fail if cashier tries to void (RBAC)', async () => {
            // Cashier cannot void
            mockedStorage.getTransactionById.mockResolvedValue({
                id: 'tx-123',
                timestamp: '2026-01-01T00:00:00Z',
                nominal: 12000,
                liter: 1,
                profit: 2000,
                cost: 10000,
                isSpecialRule: false,
            });

            const result = await TransactionService.voidTransaction('tx-123', cashierActor);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Akses Ditolak');
        });

        test('should calculate price server-side (not trust client)', async () => {
            mockedStorage.getCurrentStock.mockResolvedValue(100);
            mockedStorage.addTransaction.mockImplementation(async (txData: any) => ({
                id: 'tx-123',
                timestamp: '2026-01-01T00:00:00Z',
                ...txData,
            }));
            mockedStorage.addInventoryLog.mockResolvedValue({
                id: 'inv-1',
                date: '2026-01-01',
                type: 'OUT',
                volume: 0.7,
                costPerLiter: 0,
            });
            mockedStorage.logAudit.mockResolvedValue(undefined);

            // Sending amount=10000 (special rule: 0.7L)
            const result = await TransactionService.processTransaction({
                amount: 10000,
                paymentMethod: 'CASH',
                actor: cashierActor,
            });

            expect(result.success).toBe(true);
            // Verify the transaction was created with server-calculated values
            expect(mockedStorage.addTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    nominal: 10000,
                    liter: 0.7,       // Server-calculated, not client-provided
                    isSpecialRule: true,
                })
            );
        });

        test('should log audit after successful transaction', async () => {
            mockedStorage.getCurrentStock.mockResolvedValue(100);
            mockedStorage.addTransaction.mockResolvedValue({
                id: 'tx-audit',
                timestamp: '2026-01-01T00:00:00Z',
                nominal: 12000,
                liter: 1,
                profit: 2000,
                cost: 10000,
                isSpecialRule: false,
            });
            mockedStorage.addInventoryLog.mockResolvedValue({
                id: 'inv-1',
                date: '2026-01-01',
                type: 'OUT',
                volume: 1,
                costPerLiter: 0,
            });
            mockedStorage.logAudit.mockResolvedValue(undefined);

            await TransactionService.processTransaction({
                amount: 12000,
                paymentMethod: 'CASH',
                actor: adminActor,
            });

            expect(mockedStorage.logAudit).toHaveBeenCalledWith(
                adminActor.id,
                adminActor.username,
                'CREATE_TRANSACTION',
                expect.objectContaining({
                    transactionId: 'tx-audit',
                    nominal: 12000,
                })
            );
        });

        test('should rollback transaction if inventory log fails', async () => {
            mockedStorage.getCurrentStock.mockResolvedValue(100);
            mockedStorage.addTransaction.mockResolvedValue({
                id: 'tx-rollback',
                timestamp: '2026-01-01T00:00:00Z',
                nominal: 12000,
                liter: 1,
                profit: 2000,
                cost: 10000,
                isSpecialRule: false,
            });
            // Simulate inventory log failure
            mockedStorage.addInventoryLog.mockRejectedValue(new Error('DB connection lost'));
            mockedStorage.deleteTransaction.mockResolvedValue(undefined);

            const result = await TransactionService.processTransaction({
                amount: 12000,
                paymentMethod: 'CASH',
                actor: cashierActor,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Gagal mencatat stok keluar');
            // Should have rolled back the transaction
            expect(mockedStorage.deleteTransaction).toHaveBeenCalledWith('tx-rollback', 1, 12000);
        });
    });

    // --- voidTransaction ---
    describe('voidTransaction', () => {
        test('admin should be able to void a transaction', async () => {
            mockedStorage.getTransactionById.mockResolvedValue({
                id: 'tx-void',
                timestamp: '2026-01-01T00:00:00Z',
                nominal: 12000,
                liter: 1,
                profit: 2000,
                cost: 10000,
                isSpecialRule: false,
            });
            mockedStorage.deleteTransaction.mockResolvedValue(undefined);
            mockedStorage.logAudit.mockResolvedValue(undefined);

            const result = await TransactionService.voidTransaction('tx-void', adminActor);

            expect(result.success).toBe(true);
            expect(mockedStorage.deleteTransaction).toHaveBeenCalled();
            expect(mockedStorage.logAudit).toHaveBeenCalledWith(
                adminActor.id,
                adminActor.username,
                'VOID_TRANSACTION',
                expect.objectContaining({ transactionId: 'tx-void' })
            );
        });

        test('cashier should NOT be able to void', async () => {
            const result = await TransactionService.voidTransaction('tx-void', cashierActor);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Akses Ditolak');
            expect(mockedStorage.deleteTransaction).not.toHaveBeenCalled();
        });

        test('should fail if transaction not found', async () => {
            mockedStorage.getTransactionById.mockResolvedValue(null);

            const result = await TransactionService.voidTransaction('nonexistent', adminActor);

            expect(result.success).toBe(false);
            expect(result.error).toContain('tidak ditemukan');
        });
    });
});
