CREATE TABLE IF NOT EXISTS requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('VOID_TRANSACTION', 'EDIT_TRANSACTION', 'VOID_INVENTORY')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  requester_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Optional, consistent with users table policy)
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

create policy "Allow public access"
on requests for all
to public
using (true);
