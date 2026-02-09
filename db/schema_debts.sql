-- Create CUSTOMERS table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create DEBTS table
CREATE TABLE IF NOT EXISTS public.debts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL, -- Optional link to transaction
    amount BIGINT NOT NULL, -- Total hutang
    amount_paid BIGINT DEFAULT 0, -- Yang sudah dibayar
    status TEXT CHECK (status IN ('UNPAID', 'PARTIAL', 'PAID')) DEFAULT 'UNPAID',
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- Grant Access
CREATE POLICY "Enable all for users" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for users" ON public.debts FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_debts_customer_id ON public.debts(customer_id);
CREATE INDEX idx_debts_status ON public.debts(status);
CREATE INDEX idx_customers_name ON public.customers(name);
