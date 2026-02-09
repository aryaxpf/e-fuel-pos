import { supabase } from '../lib/supabase';
import { SyncService } from './sync';
import { StorageService } from './storage';

export interface Employee {
    id: string;
    user_id?: string;
    full_name: string;
    phone?: string;
    address?: string;
    role: 'MANAGER' | 'CASHIER' | 'STAFF' | 'CLEANING';
    base_salary: number;
    commission_rate: number; // 0.05 for 5%
    join_date: string;
    is_active: boolean;
}

export interface AttendanceLog {
    id: string;
    employee_id: string;
    date: string;
    clock_in?: string;
    clock_out?: string;
    photo_in_url?: string;
    photo_out_url?: string;
    location_in_lat?: number;
    location_in_long?: number;
    location_out_lat?: number;
    location_out_long?: number;
    status: 'PRESENT' | 'LATE' | 'ABSENT' | 'SICK' | 'LEAVE';
    notes?: string;
}

export interface PayrollSlip {
    id: string;
    employee_id: string;
    employee_name?: string; // Added for UI convenience
    period_start: string;
    period_end: string;
    base_salary: number;
    total_commission: number;
    total_deductions: number;
    total_bonuses: number;
    net_salary: number;
    status: 'DRAFT' | 'PAID';
    payment_date?: string;
}

const KEYS = {
    EMPLOYEES: 'efuel_employees',
    ATTENDANCE: 'efuel_attendance',
    PAYROLL: 'efuel_payroll',
};

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const EmployeeService = {
    // --- EMPLOYEES ---

    getEmployees: async (): Promise<Employee[]> => {
        if (supabase) {
            const { data, error } = await supabase.from('employees').select('*').order('full_name');
            if (!error && data) return data;
        }
        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(KEYS.EMPLOYEES);
        return data ? JSON.parse(data) : [];
    },

    addEmployee: async (employee: Omit<Employee, 'id'>) => {
        let useLocal = !supabase;
        const newEmployee = { ...employee, id: generateId() };

        if (supabase) {
            try {
                const { error } = await supabase.from('employees').insert(newEmployee);
                if (error) throw error;
            } catch (err) {
                console.warn("Supabase addEmployee failed, falling back:", err);
                useLocal = true;
            }
        }

        if (useLocal) {
            const users = await EmployeeService.getEmployees();
            users.push(newEmployee);
            localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(users));

            // Sync Queue
            if (supabase) {
                SyncService.addToQueue('INSERT_EMPLOYEE', newEmployee);
            }
        }

        // Audit
        await StorageService.logAudit('system', 'System', 'EMPLOYEE_ADD', { name: newEmployee.full_name, role: newEmployee.role });

        return newEmployee;
    },

    updateEmployee: async (id: string, updates: Partial<Employee>) => {
        let useLocal = !supabase;

        if (supabase) {
            try {
                const { error } = await supabase.from('employees').update(updates).eq('id', id);
                if (error) throw error;
            } catch (err) {
                console.warn("Supabase updateEmployee failed, falling back:", err);
                useLocal = true;
            }
        }

        if (useLocal) {
            const employees = await EmployeeService.getEmployees();
            const index = employees.findIndex(e => e.id === id);
            if (index !== -1) {
                employees[index] = { ...employees[index], ...updates };
                localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));

                // Sync Queue
                if (supabase) {
                    SyncService.addToQueue('UPDATE_EMPLOYEE', { id, updates });
                }
            }
        }

        // Audit for sensitive changes
        if (updates.base_salary || updates.commission_rate || updates.role) {
            await StorageService.logAudit('system', 'System', 'EMPLOYEE_UPDATE', { id, updates });
        }
    },

    deleteEmployee: async (id: string) => {
        let useLocal = !supabase;

        if (supabase) {
            try {
                const { error } = await supabase.from('employees').delete().eq('id', id);
                if (error) throw error;
            } catch (err) {
                console.warn("Supabase deleteEmployee failed, falling back:", err);
                useLocal = true;
            }
        }

        if (useLocal) {
            const employees = await EmployeeService.getEmployees();
            const filtered = employees.filter(e => e.id !== id);
            localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(filtered));

            // Sync Queue
            if (supabase) {
                SyncService.addToQueue('DELETE_EMPLOYEE', { id });
            }
        }

        // Audit
        await StorageService.logAudit('system', 'System', 'EMPLOYEE_DELETE', { id });
    },

    // --- ATTENDANCE ---

    getAttendance: async (date?: string): Promise<AttendanceLog[]> => {
        if (supabase) {
            let query = supabase.from('attendance').select('*').order('date', { ascending: false });
            if (date) query = query.eq('date', date);
            const { data, error } = await query;
            if (!error && data) return data;
        }

        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(KEYS.ATTENDANCE);
        const logs: AttendanceLog[] = data ? JSON.parse(data) : [];
        if (date) {
            return logs.filter(l => l.date === date);
        }
        return logs;
    },

    clockIn: async (employeeId: string, location: { lat: number, long: number }, photoUrl: string) => {
        let useLocal = !supabase;
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        // ... (check existing ignored for brevity, assume caller handles logic or we re-impl logic if needed)
        // Actually, we need to check existing logic carefully. 
        // Logic: Check if already clocked in.
        // The read part is safe (getAttendance falls through).

        // Check if already clocked in
        const logs = await EmployeeService.getAttendance(today);
        const existing = logs.find(l => l.employee_id === employeeId);
        if (existing) throw new Error('Employee already clocked in for today');

        const newLog: AttendanceLog = {
            id: generateId(),
            employee_id: employeeId,
            date: today,
            clock_in: now,
            location_in_lat: location.lat,
            location_in_long: location.long,
            photo_in_url: photoUrl,
            status: 'PRESENT',
        };

        if (supabase) {
            try {
                const { error } = await supabase.from('attendance').insert(newLog);
                if (error) throw error;
            } catch (err) {
                console.warn("Supabase clockIn failed, falling back:", err);
                useLocal = true;
            }
        }

        if (useLocal) {
            const allLogs = await EmployeeService.getAttendance(); // get all
            allLogs.push(newLog);
            localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(allLogs));

            // Sync Queue
            if (supabase) {
                SyncService.addToQueue('INSERT_ATTENDANCE', newLog);
            }
        }
        return newLog;
    },

    clockOut: async (employeeId: string, location: { lat: number, long: number }, photoUrl: string) => {
        let useLocal = !supabase;
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        if (supabase) {
            // For update, we try update. If it fails (e.g. table missing), we fallback.
            // But logic is tricky: if we succeed finding ID via Supabase read, but fail update?
            // Since reads fall through, let's try the whole block.
            try {
                const { data, error } = await supabase.from('attendance')
                    .select('*')
                    .eq('employee_id', employeeId)
                    .eq('date', today)
                    .single();

                if (error || !data) throw new Error('No Clock-In record found for today');

                const { error: updateError } = await supabase.from('attendance')
                    .update({
                        clock_out: now,
                        location_out_lat: location.lat,
                        location_out_long: location.long,
                        photo_out_url: photoUrl
                    })
                    .eq('id', data.id);

                if (updateError) throw updateError;
            } catch (err) {
                console.warn("Supabase clockOut failed/not found, trying local:", err);
                useLocal = true;
            }
        }

        if (useLocal) {
            const logs = JSON.parse(localStorage.getItem(KEYS.ATTENDANCE) || '[]'); // Use direct local read to be sure
            const index = logs.findIndex((l: any) => l.employee_id === employeeId && l.date === today);
            if (index === -1) throw new Error('No Clock-In record found for today (Local)');

            logs[index] = {
                ...logs[index],
                clock_out: now,
                location_out_lat: location.lat,
                location_out_long: location.long,
                photo_out_url: photoUrl
            };
            localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(logs));

            // Sync Queue
            if (supabase) {
                const updates = {
                    clock_out: now,
                    location_out_lat: location.lat,
                    location_out_long: location.long,
                    photo_out_url: photoUrl
                };
                SyncService.addToQueue('UPDATE_ATTENDANCE', { id: logs[index].id, updates });
            }
        }
    },

    // --- PAYROLL ---

    generatePayroll: async (periodStart: string, periodEnd: string) => {
        let useLocal = !supabase;
        // 1. Get all employees
        const employees = await EmployeeService.getEmployees();
        const payrolls: PayrollSlip[] = [];
        const skipped: string[] = [];

        // 2. Process each employee
        for (const emp of employees) {
            // Check attendance for this period
            // NOTE: In a real app we'd query DB. For now, we'll iterate all logs (inefficient but works for MVP/Local)
            const allLogs = await EmployeeService.getAttendance();
            const workedLogs = allLogs.filter(l =>
                l.employee_id === emp.id &&
                l.date >= periodStart.split('T')[0] &&
                l.date <= periodEnd.split('T')[0] &&
                l.status === 'PRESENT'
            );

            if (workedLogs.length === 0) {
                skipped.push(`${emp.full_name} (Belum ada presensi)`);
                continue;
            }

            const slip: PayrollSlip = {
                id: generateId(),
                employee_id: emp.id,
                period_start: periodStart,
                period_end: periodEnd,
                base_salary: emp.base_salary,
                total_commission: 0,
                total_deductions: 0,
                total_bonuses: 0,
                net_salary: emp.base_salary, // Logic to be improved later
                status: 'DRAFT'
            };
            payrolls.push(slip);
        }

        if (payrolls.length === 0) {
            return { success: false, message: 'Tidak ada karyawan yang memenuhi syarat untuk payroll periode ini.', skipped };
        }

        // Save drafts
        if (supabase) {
            try {
                const { error } = await supabase.from('payroll').insert(payrolls);
                if (error) throw error;
            } catch (err) {
                console.warn("Supabase generatePayroll failed, falling back:", err);
                useLocal = true;
            }
        }

        if (useLocal) {
            const current = JSON.parse(localStorage.getItem(KEYS.PAYROLL) || '[]');
            localStorage.setItem(KEYS.PAYROLL, JSON.stringify([...current, ...payrolls]));
        }

        // Audit
        await StorageService.logAudit('system', 'System', 'PAYROLL_GENERATE', { periodStart, periodEnd, total_slips: payrolls.length });

        return {
            success: true,
            message: `Berhasil generate ${payrolls.length} slip gaji.`,
            skipped
        };
    },

    getPayrolls: async (): Promise<PayrollSlip[]> => {
        if (supabase) {
            const { data, error } = await supabase.from('payroll').select('*, employees(full_name)');
            if (!error && data) {
                // Flatten structure
                return data.map((item: any) => ({
                    ...item,
                    employee_name: item.employees?.full_name || 'Unknown'
                }));
            }
        }

        if (typeof window === 'undefined') return [];
        const payrolls = JSON.parse(localStorage.getItem(KEYS.PAYROLL) || '[]');
        const employees = await EmployeeService.getEmployees();

        // Manual Join for LocalStorage
        return payrolls.map((p: PayrollSlip) => {
            const emp = employees.find(e => e.id === p.employee_id);
            return { ...p, employee_name: emp?.full_name || 'Unknown' };
        });
    }
};
