-- ===================================================
-- NYC Notion Accounting - Supabase PostgreSQL Schema
-- Run this SQL in Supabase SQL Editor (https://supabase.com/dashboard/project/dlziinforufdlcjdxdma/sql)
-- ===================================================

-- 1. Table: nyc_contracts (ตารางสัญญาผ่อนชำระและขายสด)
CREATE TABLE IF NOT EXISTS public.nyc_contracts (
    id TEXT PRIMARY KEY,
    contract_no TEXT UNIQUE NOT NULL,
    bp_code TEXT,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    guarantor_name TEXT,
    guarantor_phone TEXT,
    address TEXT NOT NULL,
    location_pin TEXT,
    id_card_no TEXT,
    category TEXT NOT NULL,
    sub_category TEXT,
    product_name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    color TEXT,
    serial_no TEXT,
    sale_type TEXT DEFAULT 'เงินผ่อน',
    total_price NUMERIC NOT NULL,
    down_payment NUMERIC DEFAULT 0,
    monthly_installment NUMERIC NOT NULL,
    total_installments INT NOT NULL,
    paid_installments INT DEFAULT 0,
    remaining_balance NUMERIC NOT NULL,
    due_date_day INT DEFAULT 15,
    start_date TEXT NOT NULL,
    status TEXT NOT NULL,
    payments JSONB DEFAULT '[]'::jsonb,
    schedule JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Table: nyc_customer_profiles (ตารางฐานข้อมูลลูกค้า Master)
CREATE TABLE IF NOT EXISTS public.nyc_customer_profiles (
    id TEXT PRIMARY KEY,
    bp_code TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    guarantor_name TEXT,
    guarantor_phone TEXT,
    address TEXT NOT NULL,
    location_pin TEXT,
    id_card_no TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Table: nyc_ledger (ตารางสมุดบัญชีรายรับ-รายจ่ายประจำวัน)
CREATE TABLE IF NOT EXISTS public.nyc_ledger (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    ref_contract_no TEXT,
    ref_customer_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) with Public Access Policies
ALTER TABLE public.nyc_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nyc_customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nyc_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write access to nyc_contracts" ON public.nyc_contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access to nyc_customer_profiles" ON public.nyc_customer_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access to nyc_ledger" ON public.nyc_ledger FOR ALL USING (true) WITH CHECK (true);
