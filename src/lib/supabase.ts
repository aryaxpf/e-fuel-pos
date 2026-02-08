import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
    supabaseUrl && supabaseAnonKey &&
        supabaseUrl !== 'YOUR_SUPABASE_URL_HERE' &&
        supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE'
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null;
