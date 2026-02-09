-- Enable RLS and Allow All for inventory_logs
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Inventory" ON inventory_logs;
CREATE POLICY "Allow All Inventory" ON inventory_logs FOR ALL USING (true) WITH CHECK (true);

-- Enable RLS and Allow All for transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Transactions" ON transactions;
CREATE POLICY "Allow All Transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- Enable RLS and Allow All for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Users" ON users;
CREATE POLICY "Allow All Users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Enable RLS and Allow All for pricing_rules
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Pricing" ON pricing_rules;
CREATE POLICY "Allow All Pricing" ON pricing_rules FOR ALL USING (true) WITH CHECK (true);

-- Ensure requests table is also open
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Requests" ON requests;
CREATE POLICY "Allow All Requests" ON requests FOR ALL USING (true) WITH CHECK (true);
