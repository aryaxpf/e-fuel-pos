-- ============================================================
-- Password Hashing Migration
--
-- Migrates plain-text passwords to bcrypt hashes using pgcrypto.
-- Run this ONCE on your Supabase database AFTER enabling pgcrypto.
--
-- IMPORTANT: This migration is IRREVERSIBLE. Make a backup first.
-- After running this, update the login logic to use 
-- crypt(password, password_hash) for verification.
-- ============================================================

-- Step 1: Enable pgcrypto extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Add a new column for the hash (safe migration approach)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Step 3: Migrate existing plain-text passwords to bcrypt hashes
-- gen_salt('bf') generates a bcrypt salt with default cost factor (10)
UPDATE public.users
SET password_hash = crypt(password, gen_salt('bf'))
WHERE password_hash IS NULL
  AND password IS NOT NULL;

-- Step 4: Verify migration succeeded (optional, run manually)
-- SELECT id, username, password, password_hash, 
--        (password_hash = crypt(password, password_hash)) AS hash_valid
-- FROM public.users;

-- ============================================================
-- Updated Login Function (RPC)
-- 
-- Replaces plain-text comparison with bcrypt verification.
-- The client sends the plain-text password, and this function 
-- compares it against the stored hash using crypt().
--
-- Usage:
--   const { data } = await supabase.rpc('verify_login', {
--     p_username: 'admin',
--     p_password: 'admin123'
--   });
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_login(
    p_username TEXT,
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
BEGIN
    -- Find user (case-insensitive)
    SELECT id, username, role, password, password_hash
    INTO v_user
    FROM public.users
    WHERE LOWER(username) = LOWER(TRIM(p_username));
    
    -- User not found
    IF v_user IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'User tidak ditemukan');
    END IF;
    
    -- Check password against hash (bcrypt verification)
    IF v_user.password_hash IS NOT NULL THEN
        -- New: Use bcrypt hash comparison
        IF v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
            RETURN jsonb_build_object(
                'success', TRUE,
                'id', v_user.id,
                'role', v_user.role,
                'username', v_user.username
            );
        ELSE
            RETURN jsonb_build_object('success', FALSE, 'error', 'Password salah');
        END IF;
    ELSE
        -- Fallback: Plain-text comparison (for un-migrated users)
        -- This ensures backwards compatibility during migration rollout
        IF v_user.password = p_password THEN
            -- Auto-migrate this user's password to bcrypt on successful login
            UPDATE public.users
            SET password_hash = crypt(p_password, gen_salt('bf'))
            WHERE id = v_user.id;
            
            RETURN jsonb_build_object(
                'success', TRUE,
                'id', v_user.id,
                'role', v_user.role,
                'username', v_user.username,
                'migrated', TRUE  -- Flag: password was auto-migrated
            );
        ELSE
            RETURN jsonb_build_object('success', FALSE, 'error', 'Password salah');
        END IF;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_login TO public;


-- ============================================================
-- Updated Add User Function (RPC)
--
-- Ensures new users are always created with hashed passwords.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_user_secure(
    p_username TEXT,
    p_password TEXT,
    p_role     TEXT DEFAULT 'cashier'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing RECORD;
    v_new_id UUID;
BEGIN
    -- Check if username already exists
    SELECT id INTO v_existing
    FROM public.users
    WHERE LOWER(username) = LOWER(TRIM(p_username));
    
    IF v_existing IS NOT NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Username sudah ada');
    END IF;
    
    -- Insert with bcrypt hash
    v_new_id := gen_random_uuid();
    INSERT INTO public.users (id, username, password, password_hash, role)
    VALUES (
        v_new_id,
        LOWER(TRIM(p_username)),
        '***hashed***',                          -- Placeholder (never store plain again)
        crypt(p_password, gen_salt('bf')),       -- Bcrypt hash
        p_role
    );
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'id', v_new_id,
        'username', LOWER(TRIM(p_username)),
        'role', p_role
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_user_secure TO public;


-- ============================================================
-- Step 5 (OPTIONAL — Run after verifying all users are migrated):
-- Remove the plain-text password column for maximum security.
-- 
-- WARNING: Only run this after ALL users have logged in at least
-- once (to trigger auto-migration) OR after the batch UPDATE above.
-- ============================================================

-- ALTER TABLE public.users DROP COLUMN password;
