import { calculateTransaction } from '../src/lib/fuel-logic';

describe('Fuel Pricing Logic', () => {
    test('Rule 10k: Should return 0.7L and 3000 profit', () => {
        const result = calculateTransaction(10000);
        expect(result.liter).toBe(0.7);
        expect(result.profit).toBe(3000);
        expect(result.isSpecialRule).toBe(true);
    });

    test('Rule 6k: Should return 0.5L and 1000 profit', () => {
        const result = calculateTransaction(6000);
        expect(result.liter).toBe(0.5);
        expect(result.profit).toBe(1000);
        expect(result.isSpecialRule).toBe(true);
    });

    test('Rule 15k: Should return 1.2L and 3000 profit', () => {
        const result = calculateTransaction(15000);
        expect(result.liter).toBe(1.2);
        expect(result.profit).toBe(3000);
        expect(result.isSpecialRule).toBe(true);
    });

    test('Standard Logic: 12000 should be 1 Liter', () => {
        const result = calculateTransaction(12000);
        expect(result.liter).toBe(1.0);
        expect(result.profit).toBe(2000); // 12000 - 10000
        expect(result.isSpecialRule).toBe(false);
    });

    test('Standard Logic: 24000 should be 2 Liters', () => {
        const result = calculateTransaction(24000);
        expect(result.liter).toBe(2.0);
        expect(result.profit).toBe(4000); // 24000 - 20000
        expect(result.isSpecialRule).toBe(false);
    });

    test('Ganjil Input: 13000', () => {
        const result = calculateTransaction(13000);
        // 13000 / 12000 = 1.0833... -> 1.08
        expect(result.liter).toBe(1.08);
        // Cost: 1.08 * 10000 = 10800
        // Profit: 13000 - 10800 = 2200
        expect(result.profit).toBe(2200);
    });
});
