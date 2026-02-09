-- Create SHIFTS table
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID, -- If using custom users table, reference public.users(id) instead of auth.users
    requester_name TEXT, -- Fallback for username for display
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    initial_cash BIGINT DEFAULT 0, -- Modal Awal
    final_cash BIGINT DEFAULT 0,   -- Uang di Laci saat tutup
    expected_cash BIGINT DEFAULT 0, -- System calculation
    status TEXT CHECK (status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
    variance BIGINT DEFAULT 0, -- Selisih
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Grant Access
CREATE POLICY "Enable all access" ON public.shifts FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_shifts_user_id ON public.shifts(user_id);
CREATE INDEX idx_shifts_status ON public.shifts(status);
