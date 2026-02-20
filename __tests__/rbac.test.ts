import { hasPermission, requirePermission, getPermissions, Role, Permission } from '../src/lib/rbac';

describe('RBAC — Role-Based Access Control', () => {
    // --- Admin Role ---
    describe('Admin Role', () => {
        const role: Role = 'admin';

        test('should have all permissions', () => {
            const allPermissions: Permission[] = [
                'CREATE_TRANSACTION',
                'VOID_TRANSACTION',
                'MANAGE_USERS',
                'VIEW_REPORTS',
                'EDIT_PRICING',
                'MANAGE_STOCK',
                'DELETE_STOCK',
                'VIEW_AUDIT',
                'MANAGE_SETTINGS',
                'MANAGE_EMPLOYEES',
                'MANAGE_EXPENSES',
            ];

            for (const perm of allPermissions) {
                expect(hasPermission(role, perm)).toBe(true);
            }
        });

        test('requirePermission should NOT throw for admin', () => {
            expect(() => requirePermission(role, 'VOID_TRANSACTION')).not.toThrow();
            expect(() => requirePermission(role, 'MANAGE_USERS')).not.toThrow();
        });

        test('getPermissions should return full list', () => {
            const perms = getPermissions(role);
            expect(perms.length).toBeGreaterThanOrEqual(10);
        });
    });

    // --- Cashier Role ---
    describe('Cashier Role', () => {
        const role: Role = 'cashier';

        test('should ONLY have CREATE_TRANSACTION permission', () => {
            expect(hasPermission(role, 'CREATE_TRANSACTION')).toBe(true);
        });

        test('should NOT have VOID_TRANSACTION permission', () => {
            expect(hasPermission(role, 'VOID_TRANSACTION')).toBe(false);
        });

        test('should NOT have MANAGE_USERS permission', () => {
            expect(hasPermission(role, 'MANAGE_USERS')).toBe(false);
        });

        test('should NOT have VIEW_REPORTS permission', () => {
            expect(hasPermission(role, 'VIEW_REPORTS')).toBe(false);
        });

        test('should NOT have EDIT_PRICING permission', () => {
            expect(hasPermission(role, 'EDIT_PRICING')).toBe(false);
        });

        test('should NOT have VIEW_AUDIT permission', () => {
            expect(hasPermission(role, 'VIEW_AUDIT')).toBe(false);
        });

        test('requirePermission should THROW for restricted actions', () => {
            expect(() => requirePermission(role, 'VOID_TRANSACTION')).toThrow('Akses Ditolak');
            expect(() => requirePermission(role, 'MANAGE_USERS')).toThrow('Akses Ditolak');
            expect(() => requirePermission(role, 'EDIT_PRICING')).toThrow('Akses Ditolak');
        });

        test('requirePermission should NOT throw for allowed actions', () => {
            expect(() => requirePermission(role, 'CREATE_TRANSACTION')).not.toThrow();
        });

        test('getPermissions should return only 1 permission', () => {
            const perms = getPermissions(role);
            expect(perms).toEqual(['CREATE_TRANSACTION']);
        });
    });

    // --- Edge Cases ---
    describe('Edge Cases', () => {
        test('unknown role should have no permissions', () => {
            // @ts-expect-error - Testing with invalid role
            expect(hasPermission('hacker', 'CREATE_TRANSACTION')).toBe(false);
        });

        test('unknown role should throw on requirePermission', () => {
            // @ts-expect-error - Testing with invalid role
            expect(() => requirePermission('hacker', 'CREATE_TRANSACTION')).toThrow('Akses Ditolak');
        });

        test('getPermissions for unknown role returns empty array', () => {
            // @ts-expect-error - Testing with invalid role
            expect(getPermissions('hacker')).toEqual([]);
        });
    });
});
