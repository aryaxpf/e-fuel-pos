-- 1. Create Users Table (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insert Default Admin (if not exists)
INSERT INTO users (username, password, role)
VALUES ('admin', 'admin123', 'admin')
ON CONFLICT (username) DO NOTHING;

-- 3. (Optional) Enable RLS but allow public access for MVP simplicity
-- If you want strict security, remove the lines below and configure policies properly.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

create policy "Allow public read access"
on users for select
to public
using (true);

create policy "Allow public insert access"
on users for insert
to public
with check (true);

create policy "Allow public update access"
on users for update
to public
using (true);

create policy "Allow public delete access"
on users for delete
to public
using (true);
