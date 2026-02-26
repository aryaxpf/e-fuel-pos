import { supabase } from '../lib/supabase';

export interface ActivityLog {
    id: string;
    timestamp: string;
    actor_id: string;
    action_type: 'LOGIN' | 'LOGOUT' | 'SHIFT_START' | 'SHIFT_END' | 'RESTOCK' | 'VOID_TRANSACTION' | 'SETTINGS_UPDATE' | 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'RESTOCK_PRODUCT' | 'SELL_PRODUCT' | 'VOID_FUEL_SALE' | 'VOID_PRODUCT_SALE';
    device_id: string;
    before_state?: any;
    after_state?: any;
}

const KEYS = {
    ACTIVITY_LOGS: 'efuel_activity_logs',
    DEVICE_ID: 'efuel_device_id'
};

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const LoggerService = {

    getDeviceId: (): string => {
        if (typeof window === 'undefined') return 'server';
        let deviceId = localStorage.getItem(KEYS.DEVICE_ID);
        if (!deviceId) {
            deviceId = `dev_${generateId().split('-')[0]}`;
            localStorage.setItem(KEYS.DEVICE_ID, deviceId);
        }
        return deviceId;
    },

    logAction: async (
        actorId: string,
        actionType: ActivityLog['action_type'],
        beforeState?: any,
        afterState?: any
    ): Promise<void> => {

        const logEntry: ActivityLog = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            actor_id: actorId,
            action_type: actionType,
            device_id: LoggerService.getDeviceId(),
            before_state: beforeState || null,
            after_state: afterState || null,
        };

        // 1. Supabase Mode (Online)
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('activity_logs')
                    .insert([{
                        id: logEntry.id,
                        timestamp: logEntry.timestamp,
                        actor_id: logEntry.actor_id,
                        action_type: logEntry.action_type,
                        device_id: logEntry.device_id,
                        before_state: logEntry.before_state,
                        after_state: logEntry.after_state
                    }]);

                if (error) {
                    console.error('Failed to write audit log to Supabase:', error);
                    // Fallback to local storage if DB insert fails
                    LoggerService.saveToLocal(logEntry);
                }
            } catch (err) {
                console.error('Supabase exception during audit logging:', err);
                LoggerService.saveToLocal(logEntry);
            }
            return;
        }

        // 2. LocalStorage Mode (Offline/No-backend)
        LoggerService.saveToLocal(logEntry);
    },

    saveToLocal: (logEntry: ActivityLog) => {
        if (typeof window === 'undefined') return;
        try {
            const existing = localStorage.getItem(KEYS.ACTIVITY_LOGS);
            const logs: ActivityLog[] = existing ? JSON.parse(existing) : [];
            logs.unshift(logEntry); // Add to beginning

            // Keep only last 1000 logs locally to prevent quota issues
            if (logs.length > 1000) {
                logs.length = 1000;
            }

            localStorage.setItem(KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
        } catch (err) {
            console.error('Failed to write audit log to localStorage:', err);
            // Critical failure: storage full.
        }
    },

    getLogs: async (): Promise<ActivityLog[]> => {
        if (supabase) {
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(500);

            if (error) {
                console.error('Supabase Error fetching logs:', error);
                return LoggerService.getLocalLogs();
            }
            return data as ActivityLog[];
        }
        return LoggerService.getLocalLogs();
    },

    getLocalLogs: (): ActivityLog[] => {
        if (typeof window === 'undefined') return [];
        const existing = localStorage.getItem(KEYS.ACTIVITY_LOGS);
        return existing ? JSON.parse(existing) : [];
    }
};
