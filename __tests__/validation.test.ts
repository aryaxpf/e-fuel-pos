import { TransactionSchema, InventorySchema, EmployeeSchema } from '../src/lib/validation';

describe('Validation Schemas', () => {
    // --- TransactionSchema ---
    describe('TransactionSchema', () => {
        test('should accept valid transaction data', () => {
            const valid = { nominal: 10000, liter: 0.7, profit: 3000 };
            const result = TransactionSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        test('should reject nominal <= 0', () => {
            const invalid = { nominal: 0, liter: 0.7, profit: 3000 };
            const result = TransactionSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        test('should reject negative nominal', () => {
            const invalid = { nominal: -5000, liter: 0.7, profit: 3000 };
            const result = TransactionSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        test('should reject negative liter', () => {
            const invalid = { nominal: 10000, liter: -1, profit: 3000 };
            const result = TransactionSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        test('should reject zero liter', () => {
            const invalid = { nominal: 10000, liter: 0, profit: 3000 };
            const result = TransactionSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        test('should default paymentMethod to CASH', () => {
            const valid = { nominal: 10000, liter: 0.7, profit: 3000 };
            const result = TransactionSchema.safeParse(valid);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.paymentMethod).toBe('CASH');
            }
        });

        test('should accept DEBT payment method', () => {
            const valid = { nominal: 10000, liter: 0.7, profit: 3000, paymentMethod: 'DEBT' };
            const result = TransactionSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        test('should reject invalid payment method', () => {
            const invalid = { nominal: 10000, liter: 0.7, profit: 3000, paymentMethod: 'BITCOIN' };
            const result = TransactionSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });
    });

    // --- InventorySchema ---
    describe('InventorySchema', () => {
        test('should accept valid inventory IN', () => {
            const valid = { type: 'IN', volume: 100, costPerLiter: 10000 };
            const result = InventorySchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        test('should reject negative volume', () => {
            const invalid = { type: 'IN', volume: -100, costPerLiter: 10000 };
            const result = InventorySchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        test('should reject zero volume', () => {
            const invalid = { type: 'IN', volume: 0, costPerLiter: 10000 };
            const result = InventorySchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        test('should reject invalid type', () => {
            const invalid = { type: 'STEAL', volume: 100, costPerLiter: 10000 };
            const result = InventorySchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        test('should reject negative costPerLiter', () => {
            const invalid = { type: 'IN', volume: 100, costPerLiter: -1 };
            const result = InventorySchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        test('should allow optional notes up to 500 chars', () => {
            const valid = { type: 'OUT', volume: 50, costPerLiter: 0, notes: 'Sales' };
            const result = InventorySchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        test('should reject notes exceeding 500 chars', () => {
            const longNote = 'x'.repeat(501);
            const invalid = { type: 'OUT', volume: 50, costPerLiter: 0, notes: longNote };
            const result = InventorySchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });
    });

    // --- EmployeeSchema ---
    describe('EmployeeSchema', () => {
        test('should accept valid employee', () => {
            const valid = { name: 'Budi', role: 'admin', pin: '123456' };
            const result = EmployeeSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        test('should reject name shorter than 2 chars', () => {
            const invalid = { name: 'B', role: 'admin', pin: '123456' };
            const result = EmployeeSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        test('should reject non-numeric PIN', () => {
            const invalid = { name: 'Budi', role: 'admin', pin: 'abcdef' };
            const result = EmployeeSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        test('should reject PIN with wrong length', () => {
            const invalid = { name: 'Budi', role: 'admin', pin: '123' };
            const result = EmployeeSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        test('should reject invalid role', () => {
            const invalid = { name: 'Budi', role: 'hacker', pin: '123456' };
            const result = EmployeeSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });
    });
});
