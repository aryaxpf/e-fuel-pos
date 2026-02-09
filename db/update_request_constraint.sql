-- 1. Hapus Constraint Lama
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_type_check;

-- 2. Tambahkan Constraint Baru dengan tipe 'VOID_INVENTORY'
ALTER TABLE requests ADD CONSTRAINT requests_type_check 
CHECK (type IN ('VOID_TRANSACTION', 'EDIT_TRANSACTION', 'VOID_INVENTORY'));
