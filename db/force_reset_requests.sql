-- FORCE RESET REQUESTS TABLE
DROP TABLE IF EXISTS "public"."requests";

-- 1. Create Requests Table
CREATE TABLE "public"."requests" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "type" TEXT NOT NULL CHECK (type IN ('VOID_TRANSACTION', 'EDIT_TRANSACTION', 'VOID_INVENTORY')),
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  "requester_name" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE "public"."requests" ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy for ALL access (since we handle auth in app logic for now)
CREATE POLICY "Enable all access for anon" ON "public"."requests"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 4. Grant access to usage
GRANT ALL ON TABLE "public"."requests" TO anon;
GRANT ALL ON TABLE "public"."requests" TO authenticated;
GRANT ALL ON TABLE "public"."requests" TO service_role;
