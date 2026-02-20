/**
 * Role-Based Access Control (RBAC) Helper
 * Centralizes permission checks for the POS system.
 */

export type Role = 'admin' | 'cashier';

export type Permission =
    | 'CREATE_TRANSACTION'
    | 'VOID_TRANSACTION'
    | 'MANAGE_USERS'
    | 'VIEW_REPORTS'
    | 'EDIT_PRICING'
    | 'MANAGE_STOCK'
    | 'DELETE_STOCK'
    | 'VIEW_AUDIT'
    | 'MANAGE_SETTINGS'
    | 'MANAGE_EMPLOYEES'
    | 'MANAGE_EXPENSES';

/**
 * Permission matrix: defines which roles can perform which actions.
 * Admin has full access; cashier is restricted to transaction creation.
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    admin: [
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
    ],
    cashier: [
        'CREATE_TRANSACTION',
    ],
};

/**
 * Check if a role has a specific permission.
 */
export const hasPermission = (role: Role, permission: Permission): boolean => {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;
    return permissions.includes(permission);
};

/**
 * Require a specific permission — throws an error if not authorized.
 * Use this as a guard at the start of sensitive operations.
 */
export const requirePermission = (role: Role, permission: Permission): void => {
    if (!hasPermission(role, permission)) {
        throw new Error(
            `Akses Ditolak: Role "${role}" tidak memiliki izin "${permission}".`
        );
    }
};

/**
 * Get all permissions for a given role.
 */
export const getPermissions = (role: Role): Permission[] => {
    return ROLE_PERMISSIONS[role] || [];
};
