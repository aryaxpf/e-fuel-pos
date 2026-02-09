-- 1. Create Requests Table (if not exists)
CREATE TABLE IF NOT EXISTS requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('VOID_TRANSACTION', 'EDIT_TRANSACTION', 'VOID_INVENTORY')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  requester_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy (Safely)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'requests' AND policyname = 'Allow public access'
    ) THEN
        CREATE POLICY "Allow public access" ON requests FOR ALL TO PUBLIC USING (true);
    END IF;
END
$$;
