import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const AttendanceService = {
    getTodayLog: async (employeeId: string) => {
        const today = new Date().toISOString().split('T')[0];

        // Try Supabase first
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('date', today)
            .single();

        if (!error && data) return data;

        return null;
    },

    import { SyncService } from '../lib/sync';

    // ... inside AttendanceService ...

    clockIn: async (employeeId: string, location: { lat: number, long: number }, photoUrl: string) => {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        const newLog = {
            employee_id: employeeId,
            date: today,
            clock_in: now,
            location_in_lat: location.lat,
            location_in_long: location.long,
            photo_in_url: photoUrl,
            status: 'PRESENT',
        };

        try {
            const { data, error } = await supabase
                .from('attendance')
                .insert(newLog)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.log("Offline Clock In, adding to queue");
            // Add to Sync Queue
            await SyncService.addToQueue('INSERT_ATTENDANCE', newLog);
            // Return fake success object for UI
            return { ...newLog, id: 'temp-' + Date.now() };
        }
    },

    clockOut: async (logId: string, location: { lat: number, long: number }, photoUrl: string) => {
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('attendance')
            .update({
                clock_out: now,
                location_out_lat: location.lat,
                location_out_long: location.long,
                photo_out_url: photoUrl
            })
            .eq('id', logId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    uploadPhoto: async (uri: string, fileName: string) => {
        const formData = new FormData();
        formData.append('file', {
            uri,
            name: fileName,
            type: 'image/jpeg',
        } as any);

        const { data, error } = await supabase.storage
            .from('attendance-photos')
            .upload(fileName, formData, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('attendance-photos')
            .getPublicUrl(fileName);

        return publicUrl;
    }
};
