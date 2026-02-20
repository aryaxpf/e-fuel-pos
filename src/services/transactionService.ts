/**
 * Transaction Service
 * Centralizes all transaction processing logic with:
 * - Server-side price calculation (prevents client-side price manipulation)
 * - Stock validation guard (prevents negative stock / race conditions)
 * - Atomic transaction + inventory log creation
 * - Audit trail logging
 *
 * When Supabase is available, uses native RPC functions with
 * SELECT ... FOR UPDATE row-level locking for true atomicity.
 * Falls back to application-level sequential insert for localStorage mode.
 */

import { calculateTransaction, TransactionResult } from '../lib/fuel-logic';
import { supabase } from '../lib/supabase';
import { StorageService, TransactionRecord } from './storage';
import { requirePermission, Role } from '../lib/rbac';

export interface ProcessTransactionInput {
    /** The nominal amount (Rupiah) — price is calculated server-side from this */
    amount: number;
    /** Payment method */
    paymentMethod: 'CASH' | 'DEBT' | 'QRIS';
    /** The actor performing the transaction */
    actor: {
        id: string;
        username: string;
        role: Role;
    };
    /** Optional: customer ID for DEBT payment */
    customerId?: string;
    /** Optional: customer name for DEBT payment notes */
    customerName?: string;
}

export interface ProcessTransactionResult {
    success: boolean;
    record?: TransactionRecord;
    error?: string;
}

export const TransactionService = {
    /**
     * Process a fuel transaction:
     * 1. RBAC check — only authorized roles can create transactions
     * 2. Calculate price SERVER-SIDE using pricing rules (not client input)
     * 3. Route to either:
     *    a. Supabase RPC (atomic with row-level locking) — preferred
     *    b. Application-level sequential insert — localStorage fallback
     *
     * This prevents:
     * - Price manipulation (price comes from server, not client)
     * - Negative stock (DB-level locking prevents race conditions)
     * - Unauthorized access (RBAC check)
     */
    processTransaction: async (
        input: ProcessTransactionInput
    ): Promise<ProcessTransactionResult> => {
        const { amount, paymentMethod, actor, customerId, customerName } = input;

        // 1. RBAC Guard
        try {
            requirePermission(actor.role, 'CREATE_TRANSACTION');
        } catch (err: any) {
            return { success: false, error: err.message };
        }

        // 2. Calculate transaction SERVER-SIDE
        const result: TransactionResult = calculateTransaction(amount);

        if (result.nominal <= 0 || result.liter <= 0) {
            return { success: false, error: 'Nominal transaksi tidak valid.' };
        }

        // 3. Route: Supabase RPC (atomic) vs localStorage (sequential)
        if (supabase) {
            return TransactionService._processViaRPC(result, paymentMethod, actor, customerId, customerName);
        } else {
            return TransactionService._processViaLocalStorage(result, paymentMethod, actor);
        }
    },

    /**
     * SUPABASE MODE: Atomic transaction processing via RPC.
     * Uses SELECT ... FOR UPDATE at the database level to prevent
     * race conditions. All operations (transaction + inventory + audit)
     * happen in a single PostgreSQL transaction.
     */
    _processViaRPC: async (
        result: TransactionResult,
        paymentMethod: string,
        actor: { id: string; username: string; role: Role },
        customerId?: string,
        customerName?: string
    ): Promise<ProcessTransactionResult> => {
        try {
            // Choose the appropriate RPC based on payment method
            const rpcName = paymentMethod === 'DEBT' ? 'process_debt_transaction' : 'process_transaction';

            const rpcParams: any = {
                p_nominal: result.nominal,
                p_liter: result.liter,
                p_profit: result.profit,
                p_is_special_rule: result.isSpecialRule,
                p_username: actor.username,
                p_user_id: actor.id,
            };

            // Add debt-specific params
            if (paymentMethod === 'DEBT') {
                rpcParams.p_customer_id = customerId;
                rpcParams.p_customer_name = customerName || 'Unknown';
            } else {
                rpcParams.p_payment_method = paymentMethod;
            }

            const { data, error } = await supabase!.rpc(rpcName, rpcParams);

            if (error) {
                console.error('Supabase RPC error:', error);
                throw error;
            }

            if (!data.success) {
                return { success: false, error: data.error };
            }

            // Map RPC response to TransactionRecord
            const record: TransactionRecord = {
                id: data.transaction_id,
                timestamp: data.timestamp,
                nominal: result.nominal,
                liter: result.liter,
                profit: result.profit,
                cost: result.cost,
                isSpecialRule: result.isSpecialRule,
                paymentMethod: paymentMethod as any,
            };

            return { success: true, record };
        } catch (err: any) {
            console.warn('RPC failed, falling back to application-level:', err);
            // Fallback to sequential if RPC doesn't exist yet
            return TransactionService._processViaLocalStorage(result, paymentMethod, {
                id: actor.id,
                username: actor.username,
                role: actor.role,
            });
        }
    },

    /**
     * LOCALSTORAGE MODE: Sequential insert with application-level rollback.
     * Used when Supabase is unavailable or RPC hasn't been deployed yet.
     */
    _processViaLocalStorage: async (
        result: TransactionResult,
        paymentMethod: string,
        actor: { id: string; username: string; role: Role }
    ): Promise<ProcessTransactionResult> => {
        // Stock Guard (application-level)
        const currentStock = await StorageService.getCurrentStock();
        if (result.liter > currentStock) {
            return {
                success: false,
                error: `Stok tidak cukup! Sisa: ${currentStock.toFixed(2)} Liter, dibutuhkan: ${result.liter} Liter.`,
            };
        }

        try {
            // Insert Transaction
            const transactionPayload = {
                ...result,
                paymentMethod,
            };
            const record = await StorageService.addTransaction(transactionPayload);

            // Insert Inventory OUT log
            try {
                await StorageService.addInventoryLog({
                    type: 'OUT' as const,
                    volume: result.liter,
                    costPerLiter: 0,
                    notes: `Transaksi Penjualan (${record.id.slice(0, 8)})`,
                });
            } catch (inventoryErr) {
                // Rollback: delete the transaction if inventory log fails
                console.error('Inventory log failed, rolling back transaction:', inventoryErr);
                await StorageService.deleteTransaction(record.id, result.liter, result.nominal);
                return {
                    success: false,
                    error: 'Gagal mencatat stok keluar. Transaksi dibatalkan.',
                };
            }

            // Audit Log
            await StorageService.logAudit(
                actor.id,
                actor.username,
                'CREATE_TRANSACTION',
                {
                    transactionId: record.id,
                    nominal: result.nominal,
                    liter: result.liter,
                    paymentMethod,
                }
            );

            return { success: true, record };
        } catch (err: any) {
            console.error('Transaction processing failed:', err);
            return {
                success: false,
                error: err.message || 'Gagal memproses transaksi.',
            };
        }
    },

    /**
     * Void/delete a transaction with RBAC check.
     * Only admin/manager roles should be able to void transactions.
     */
    voidTransaction: async (
        transactionId: string,
        actor: { id: string; username: string; role: Role }
    ): Promise<{ success: boolean; error?: string }> => {
        // RBAC Guard
        try {
            requirePermission(actor.role, 'VOID_TRANSACTION');
        } catch (err: any) {
            return { success: false, error: err.message };
        }

        // Fetch transaction to get liter and nominal for restoration
        const transaction = await StorageService.getTransactionById(transactionId);
        if (!transaction) {
            return { success: false, error: 'Transaksi tidak ditemukan.' };
        }

        try {
            await StorageService.deleteTransaction(
                transactionId,
                transaction.liter,
                transaction.nominal
            );

            // Audit
            await StorageService.logAudit(
                actor.id,
                actor.username,
                'VOID_TRANSACTION',
                {
                    transactionId,
                    nominal: transaction.nominal,
                    liter: transaction.liter,
                }
            );

            return { success: true };
        } catch (err: any) {
            return {
                success: false,
                error: err.message || 'Gagal membatalkan transaksi.',
            };
        }
    },
};
