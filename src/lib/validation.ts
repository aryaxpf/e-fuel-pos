import { z } from 'zod';

// --- Shared Schemas ---

// 1. Transaction Validation
export const TransactionSchema = z.object({
    nominal: z.number().min(100), // Min Rp 100
    liter: z.number().positive(),
    profit: z.number(),
    paymentMethod: z.enum(['CASH', 'DEBT', 'QRIS']).optional().default('CASH'),
    isSpecialRule: z.boolean().optional(),
});

// 2. Inventory Validation
export const InventorySchema = z.object({
    type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
    volume: z.number().positive(),
    costPerLiter: z.number().min(0),
    notes: z.string().max(500).optional(),
});

// 3. Employee/Attendance Validation
export const AttendanceSchema = z.object({
    employee_id: z.string().uuid(),
    status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'SICK', 'LEAVE']),
    location_in_lat: z.number().optional(),
    location_in_long: z.number().optional(),
});

export const EmployeeSchema = z.object({
    name: z.string().min(2, "Name too short"),
    role: z.enum(['admin', 'staff']),
    pin: z.string().length(6, "PIN must be 6 digits").regex(/^\d+$/, "PIN must be numeric"),
});
