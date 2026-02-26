-- ============================================================
-- Modul Sparepart: Schema Database
-- Tabel untuk Produk, Inventori Produk, dan Transaksi Produk
-- ============================================================

-- 1. PRODUCTS (Katalog Barang)
CREATE TABLE IF NOT EXISTS public.products (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name        TEXT NOT NULL,               -- Nama Sparepart (cth: Kampas Rem Vario)
    sku         TEXT UNIQUE,                 -- Kode SKU (cth: KR-VARIO-001)
    category    TEXT DEFAULT 'SPAREPART',    -- SPAREPART, AKSESORIS, OLI, dll
    buy_price   BIGINT NOT NULL DEFAULT 0,   -- Harga Beli (Modal)
    sell_price  BIGINT NOT NULL DEFAULT 0,   -- Harga Jual
    unit        TEXT DEFAULT 'PCS',          -- Satuan: PCS, SET, LITER, BOX
    min_stock   INT DEFAULT 2,               -- Batas peringatan stok rendah
    is_active   BOOLEAN DEFAULT TRUE,        -- Status aktif/tidak
    image_url   TEXT,                        -- Opsional URL gambar
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCT_INVENTORY (Riwayat Stok Masuk/Keluar per Produk)
CREATE TABLE IF NOT EXISTS public.product_inventory (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id  UUID REFERENCES public.products(id) ON DELETE CASCADE,
    type        TEXT CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')) NOT NULL,
    quantity    INT NOT NULL,                -- Jumlah barang (bisa positif/negatif saat ADJUSTMENT, tapi biasanya positif)
    cost_price  BIGINT DEFAULT 0,            -- Harga beli per unit saat stok masuk (untuk valuasi)
    notes       TEXT,                        -- Keterangan (cth: "Restock dari Supplier A")
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCT_TRANSACTIONS (Riwayat Penjualan Produk)
-- Terpisah dari tabel 'transactions' utama yang khusus bahan bakar
CREATE TABLE IF NOT EXISTS public.product_transactions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    items           JSONB NOT NULL,          -- Array of items: [{product_id, name, qty, sell_price, buy_price, subtotal}]
    total_amount    BIGINT NOT NULL,         -- Total bayar (Revenue)
    total_cost      BIGINT NOT NULL,         -- Total modal (COGS)
    total_profit    BIGINT NOT NULL,         -- Keuntungan (Margin)
    payment_method  TEXT DEFAULT 'CASH',     -- CASH, DEBT, QRIS
    customer_id     UUID REFERENCES public.customers(id), -- Opsional untuk kasbon
    user_id         UUID,                    -- Kasir yang melayani
    username        TEXT,                    -- Nama kasir
    timestamp       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row-Level Security (RLS) & Policies
-- ============================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_transactions ENABLE ROW LEVEL SECURITY;

-- Allow all access for now (system uses App-level RBAC)
CREATE POLICY "Enable all access on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access on product_inventory" ON public.product_inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access on product_transactions" ON public.product_transactions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Indexes for Performance
-- ============================================================
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_product_inventory_product_id ON public.product_inventory(product_id);
CREATE INDEX idx_product_inventory_type_date ON public.product_inventory(type, created_at);
CREATE INDEX idx_product_transactions_timestamp ON public.product_transactions(timestamp);
