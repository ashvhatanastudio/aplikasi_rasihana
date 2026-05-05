-- 1. Penanganan Type User Role (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'kasir');
    END IF;
END$$;

-- 2. Tabel Profil
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'kasir' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Pelanggan
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    whatsapp TEXT UNIQUE,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Produk/Layanan
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT DEFAULT 'Kiloan',
    name TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'Kg' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Transaksi
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT UNIQUE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    kasir_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    total_qty NUMERIC(10, 2) DEFAULT 0,
    subtotal NUMERIC(15, 2) DEFAULT 0,
    discount NUMERIC(15, 2) DEFAULT 0,
    tax NUMERIC(15, 2) DEFAULT 0,
    total_bayar NUMERIC(15, 2) NOT NULL DEFAULT 0,
    metode_pembayaran TEXT,
    uang_dibayar NUMERIC(15, 2) DEFAULT 0,
    kembalian NUMERIC(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED
    payment_status TEXT DEFAULT 'UNPAID', -- UNPAID, PAID
    laundry_status TEXT DEFAULT 'RECEIVED', -- RECEIVED, WASHING, DRYING, IRONING, READY, COLLECTED
    estimated_completed_at TIMESTAMPTZ,
    actual_completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist for older installations
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS estimated_completed_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS actual_completed_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS total_bayar NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS laundry_status TEXT DEFAULT 'RECEIVED';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS _schema_version TEXT DEFAULT '1.1'; -- Force another refresh
COMMENT ON TABLE transactions IS 'Table for laundry transactions v1.1';
COMMENT ON COLUMN transactions.notes IS 'Catatan khusus transaksi';
COMMENT ON COLUMN transactions.total_bayar IS 'Total tagihan akhir';

-- 6. Tabel Item Transaksi (transaction_items)
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    name TEXT, -- Tambahkan kolom nama untuk cache/manual item
    qty NUMERIC(10, 2) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL
);

-- Ensure all columns in transaction_items
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS name TEXT;

-- 7. Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses (Public Read/Write untuk demo)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Full Access" ON profiles;
    DROP POLICY IF EXISTS "Public Full Access" ON customers;
    DROP POLICY IF EXISTS "Public Full Access" ON products;
    DROP POLICY IF EXISTS "Public Full Access" ON transactions;
    DROP POLICY IF EXISTS "Public Full Access" ON transaction_items;
END$$;

CREATE POLICY "Public Full Access" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access" ON transaction_items FOR ALL USING (true) WITH CHECK (true);

-- Force schema cache refresh
CREATE TABLE IF NOT EXISTS schema_refresh_trigger (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
DROP TABLE IF EXISTS schema_refresh_trigger;

-- 8. Fungsi Nomor Invoice Otomatis
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    today TEXT := TO_CHAR(NOW(), 'YYMMDD');
    seq_count INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO seq_count FROM transactions WHERE invoice_number LIKE 'STR-' || today || '-%';
    NEW.invoice_number := 'STR-' || today || '-' || LPAD(seq_count::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_invoice ON transactions;
CREATE TRIGGER trg_generate_invoice BEFORE INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();
