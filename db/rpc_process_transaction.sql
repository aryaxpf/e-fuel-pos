-- ============================================================
-- RPC: process_transaction
-- 
-- Atomic transaction processing with row-level locking.
-- Ensures that stock validation AND insert happen within a 
-- single database transaction, preventing race conditions
-- where two cashiers could oversell remaining fuel.
--
-- Usage from Supabase client:
--   const { data, error } = await supabase.rpc('process_transaction', {
--     p_nominal: 12000,
--     p_liter: 1.0,
--     p_profit: 2000,
--     p_is_special_rule: false,
--     p_payment_method: 'CASH',
--     p_username: 'kasir1',
--     p_user_id: 'uuid-of-user'
--   });
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_transaction(
    p_nominal       BIGINT,
    p_liter         NUMERIC(10,2),
    p_profit        BIGINT,
    p_is_special_rule BOOLEAN DEFAULT FALSE,
    p_payment_method TEXT DEFAULT 'CASH',
    p_username      TEXT DEFAULT 'System',
    p_user_id       UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock   NUMERIC(10,2);
    v_total_in        NUMERIC(10,2);
    v_total_out       NUMERIC(10,2);
    v_transaction_id  UUID;
    v_inventory_id    UUID;
    v_now             TIMESTAMPTZ := NOW();
BEGIN
    -- ========================================================
    -- STEP 1: Lock inventory_logs rows (FOR UPDATE)
    -- Stock is tracked ONLY via inventory_logs (IN - OUT).
    -- We do NOT count transactions.liter because each sale
    -- already creates an inventory_logs OUT record.
    -- ========================================================
    
    -- Lock and calculate total IN (purchases + adjustments)
    SELECT COALESCE(SUM(volume), 0) INTO v_total_in
    FROM inventory_logs
    WHERE type IN ('IN', 'ADJUSTMENT')
    FOR UPDATE;
    
    -- Lock and calculate total OUT from inventory logs
    SELECT COALESCE(SUM(volume), 0) INTO v_total_out
    FROM inventory_logs
    WHERE type = 'OUT'
    FOR UPDATE;
    
    -- ========================================================
    -- STEP 2: Calculate current stock (inventory_logs only)
    -- ========================================================
    v_current_stock := v_total_in - v_total_out;
    
    -- ========================================================
    -- STEP 3: Validate stock is sufficient
    -- ========================================================
    IF p_liter > v_current_stock THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', format('Stok tidak cukup! Sisa: %s Liter, dibutuhkan: %s Liter.', 
                           ROUND(v_current_stock, 2), p_liter),
            'current_stock', v_current_stock
        );
    END IF;
    
    -- ========================================================
    -- STEP 4: Insert transaction (within the same DB transaction)
    -- ========================================================
    v_transaction_id := gen_random_uuid();
    
    INSERT INTO transactions (id, nominal, liter, profit, is_special_rule, payment_method, timestamp)
    VALUES (v_transaction_id, p_nominal, p_liter, p_profit, p_is_special_rule, p_payment_method, v_now);
    
    -- ========================================================
    -- STEP 5: Insert inventory OUT log (atomic with step 4)
    -- ========================================================
    v_inventory_id := gen_random_uuid();
    
    INSERT INTO inventory_logs (id, type, volume, cost_per_liter, notes, date)
    VALUES (
        v_inventory_id, 
        'OUT', 
        p_liter, 
        0, 
        format('Transaksi Penjualan (%s)', LEFT(v_transaction_id::TEXT, 8)),
        v_now
    );
    
    -- ========================================================
    -- STEP 6: Audit log
    -- ========================================================
    INSERT INTO audit_logs (user_id, username, action, details, created_at, ip_address)
    VALUES (
        p_user_id::TEXT,
        p_username,
        'CREATE_TRANSACTION',
        jsonb_build_object(
            'transaction_id', v_transaction_id,
            'nominal', p_nominal,
            'liter', p_liter,
            'profit', p_profit,
            'payment_method', p_payment_method,
            'stock_before', v_current_stock,
            'stock_after', v_current_stock - p_liter
        ),
        v_now,
        'db-rpc'
    );
    
    -- ========================================================
    -- STEP 7: Return success
    -- If anything above failed, PostgreSQL automatically rolls
    -- back the entire transaction — no "phantom sales" possible.
    -- ========================================================
    RETURN jsonb_build_object(
        'success', TRUE,
        'transaction_id', v_transaction_id,
        'inventory_id', v_inventory_id,
        'nominal', p_nominal,
        'liter', p_liter,
        'profit', p_profit,
        'is_special_rule', p_is_special_rule,
        'payment_method', p_payment_method,
        'timestamp', v_now,
        'stock_before', v_current_stock,
        'stock_after', v_current_stock - p_liter
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Catch any unexpected errors — the transaction auto-rolls back
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', format('Database Error: %s', SQLERRM)
    );
END;
$$;

-- Grant execute to public (or restrict to authenticated if needed)
GRANT EXECUTE ON FUNCTION public.process_transaction TO public;


-- ============================================================
-- RPC: process_debt_transaction
-- 
-- Same atomic guarantees as process_transaction, but also
-- creates a debt record for the customer (kasbon).
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_debt_transaction(
    p_nominal         BIGINT,
    p_liter           NUMERIC(10,2),
    p_profit          BIGINT,
    p_is_special_rule BOOLEAN DEFAULT FALSE,
    p_customer_id     UUID DEFAULT NULL,
    p_customer_name   TEXT DEFAULT 'Unknown',
    p_username        TEXT DEFAULT 'System',
    p_user_id         UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock   NUMERIC(10,2);
    v_total_in        NUMERIC(10,2);
    v_total_out       NUMERIC(10,2);
    v_transaction_id  UUID;
    v_inventory_id    UUID;
    v_debt_id         UUID;
    v_now             TIMESTAMPTZ := NOW();
BEGIN
    -- STEP 1: Lock and calculate stock (inventory_logs only)
    SELECT COALESCE(SUM(volume), 0) INTO v_total_in
    FROM inventory_logs WHERE type IN ('IN', 'ADJUSTMENT') FOR UPDATE;
    
    SELECT COALESCE(SUM(volume), 0) INTO v_total_out
    FROM inventory_logs WHERE type = 'OUT' FOR UPDATE;
    
    v_current_stock := v_total_in - v_total_out;
    
    -- STEP 2: Validate stock
    IF p_liter > v_current_stock THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', format('Stok tidak cukup! Sisa: %s Liter', ROUND(v_current_stock, 2))
        );
    END IF;
    
    -- STEP 3: Insert transaction as DEBT
    v_transaction_id := gen_random_uuid();
    INSERT INTO transactions (id, nominal, liter, profit, is_special_rule, payment_method, timestamp)
    VALUES (v_transaction_id, p_nominal, p_liter, p_profit, p_is_special_rule, 'DEBT', v_now);
    
    -- STEP 4: Insert inventory OUT log
    v_inventory_id := gen_random_uuid();
    INSERT INTO inventory_logs (id, type, volume, cost_per_liter, notes, date)
    VALUES (v_inventory_id, 'OUT', p_liter, 0, format('Kasbon: %s', p_customer_name), v_now);
    
    -- STEP 5: Create debt record
    IF p_customer_id IS NOT NULL THEN
        v_debt_id := gen_random_uuid();
        INSERT INTO debts (id, customer_id, transaction_id, amount, amount_paid, status, notes, created_at)
        VALUES (v_debt_id, p_customer_id, v_transaction_id, p_nominal, 0, 'UNPAID', 'Kasbon Bensin', v_now);
    END IF;
    
    -- STEP 6: Audit log
    INSERT INTO audit_logs (user_id, username, action, details, created_at, ip_address)
    VALUES (
        p_user_id::TEXT, p_username, 'CREATE_DEBT_TRANSACTION',
        jsonb_build_object(
            'transaction_id', v_transaction_id,
            'customer_id', p_customer_id,
            'nominal', p_nominal,
            'liter', p_liter,
            'stock_after', v_current_stock - p_liter
        ),
        v_now, 'db-rpc'
    );
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'transaction_id', v_transaction_id,
        'debt_id', v_debt_id,
        'stock_after', v_current_stock - p_liter
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', format('Database Error: %s', SQLERRM));
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_debt_transaction TO public;
