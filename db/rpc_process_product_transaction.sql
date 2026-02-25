-- ============================================================
-- RPC: process_product_transaction
-- 
-- Atomic transaction processing for SPAREPART/PRODUCTS.
-- Processes multiple items in a cart, validates stock for each,
-- records the transaction, and deducts inventory in a single
-- ACID-compliant database transaction.
--
-- Expected JSONB payload for items:
-- [
--   { "product_id": "uuid", "name": "Oli", "qty": 2, "sell_price": 50000, "buy_price": 40000, "subtotal": 100000 }
-- ]
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_product_transaction(
    p_items         JSONB,
    p_payment       TEXT DEFAULT 'CASH',
    p_customer_id   UUID DEFAULT NULL,
    p_user_id       UUID DEFAULT NULL,
    p_username      TEXT DEFAULT 'System'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item JSONB;
    v_product_id UUID;
    v_qty INT;
    v_name TEXT;
    
    v_total_in INT;
    v_total_out INT;
    v_current_stock INT;
    
    v_total_amount BIGINT := 0;
    v_total_cost BIGINT := 0;
    v_total_profit BIGINT := 0;
    
    v_transaction_id UUID;
    v_debt_id UUID;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- ========================================================
    -- STEP 1: Process and Validate Each Item
    -- ========================================================
    
    -- Loop through each item in the cart
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'qty')::INT;
        v_name := v_item->>'name';
        
        -- Calculate totals for the transaction
        v_total_amount := v_total_amount + (v_item->>'subtotal')::BIGINT;
        v_total_cost := v_total_cost + ((v_item->>'buy_price')::BIGINT * v_qty);
        v_total_profit := v_total_amount - v_total_cost;
        
        -- Get current stock by locking the inventory rows for this product
        SELECT COALESCE(SUM(quantity), 0) INTO v_total_in
        FROM product_inventory
        WHERE product_id = v_product_id AND type IN ('IN', 'ADJUSTMENT') 
        FOR UPDATE;
        
        SELECT COALESCE(SUM(quantity), 0) INTO v_total_out
        FROM product_inventory
        WHERE product_id = v_product_id AND type = 'OUT' 
        FOR UPDATE;
        
        v_current_stock := v_total_in - v_total_out;
        
        -- Check if stock is sufficient
        IF v_qty > v_current_stock THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', format('Stok tidak cukup untuk produk: %s! Sisa: %s Pcs, dibutuhkan: %s Pcs.', v_name, v_current_stock, v_qty)
            );
        END IF;
    END LOOP;
    
    -- ========================================================
    -- STEP 2: Insert Transaction Record
    -- ========================================================
    v_transaction_id := gen_random_uuid();
    
    INSERT INTO product_transactions (
        id, items, total_amount, total_cost, total_profit, 
        payment_method, customer_id, user_id, username, timestamp
    ) VALUES (
        v_transaction_id, p_items, v_total_amount, v_total_cost, v_total_profit,
        p_payment, p_customer_id, p_user_id, p_username, v_now
    );
    
    -- ========================================================
    -- STEP 3: Deduct Inventory & Handle Debt
    -- ========================================================
    
    -- Insert OUT inventory logs for each item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'qty')::INT;
        
        INSERT INTO product_inventory (
            id, product_id, type, quantity, cost_price, notes, created_at
        ) VALUES (
            gen_random_uuid(), v_product_id, 'OUT', v_qty, 0, 
            format('Penjualan (TRX: %s)', LEFT(v_transaction_id::TEXT, 8)), v_now
        );
    END LOOP;
    
    -- If Payment is DEBT and Customer ID is provided
    IF p_payment = 'DEBT' AND p_customer_id IS NOT NULL THEN
        v_debt_id := gen_random_uuid();
        INSERT INTO debts (
            id, customer_id, transaction_id, amount, amount_paid, status, notes, created_at
        ) VALUES (
            v_debt_id, p_customer_id, v_transaction_id, v_total_amount, 0, 'UNPAID', 'Kasbon Sparepart', v_now
        );
    END IF;
    
    -- ========================================================
    -- STEP 4: Insert Audit Log
    -- ========================================================
    INSERT INTO audit_logs (user_id, username, action, details, created_at, ip_address)
    VALUES (
        p_user_id::TEXT,
        p_username,
        'SELL_PRODUCT',
        jsonb_build_object(
            'transaction_id', v_transaction_id,
            'items', p_items,
            'total_amount', v_total_amount,
            'payment_method', p_payment
        ),
        v_now,
        'db-rpc'
    );
    
    -- ========================================================
    -- STEP 5: Return Success
    -- ========================================================
    RETURN jsonb_build_object(
        'success', TRUE,
        'transaction_id', v_transaction_id,
        'debt_id', COALESCE(v_debt_id::TEXT, NULL),
        'total_amount', v_total_amount,
        'payment_method', p_payment,
        'timestamp', v_now
    );

EXCEPTION WHEN OTHERS THEN
    -- Any error causes full ROLLBACK automatically
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', format('Database Error: %s', SQLERRM)
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.process_product_transaction TO public;
