-- ============================================================================
-- LYANS WOMAN INVENTORY MANAGEMENT SYSTEM
-- Migration: 20261002000000_initial_schema.sql
-- Description: Core Relational Schema, Multi-Location Inventory, Inflow/Outflow
--              Ledger, RBAC Profiles, Atomic Stock RPC & RLS Policies.
-- Author: Lyans Woman Engineering
-- Version: PostgreSQL 17.x / Supabase Enterprise
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & PREREQUISITES
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. ENUMS & DOMAIN TYPES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'staff');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
        CREATE TYPE stock_movement_type AS ENUM ('INFLOW', 'OUTFLOW', 'ADJUSTMENT', 'TRANSFER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inflow_subtype') THEN
        CREATE TYPE inflow_subtype AS ENUM ('Restocking', 'Returning', 'Replacing');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outflow_subtype') THEN
        CREATE TYPE outflow_subtype AS ENUM ('POS Website', 'Damaged', 'Returned to Supplier');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
        CREATE TYPE transaction_status AS ENUM ('Pending', 'Completed', 'Written-Off', 'Cancelled');
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. LOCATIONS (Multi-Location Architecture)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'boutique', -- 'boutique', 'outlet', 'mall', 'warehouse'
    address TEXT,
    capacity_limit INTEGER DEFAULT 1000,
    color_hex VARCHAR(10) DEFAULT '#10B981',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for active locations lookup
CREATE INDEX IF NOT EXISTS idx_locations_active ON public.locations(is_active);
CREATE INDEX IF NOT EXISTS idx_locations_code ON public.locations(code);

-- ----------------------------------------------------------------------------
-- 4. CATEGORIES (Product Taxonomies & Capacity Targets)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE,
    name VARCHAR(120) NOT NULL,
    subtitle VARCHAR(255),
    color VARCHAR(10) DEFAULT '#10B981',
    badge_color VARCHAR(10) DEFAULT '#ECFDF5',
    capacity_target INTEGER DEFAULT 500,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);

-- ----------------------------------------------------------------------------
-- 5. USER PROFILES & RBAC (Linked to Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role user_role NOT NULL DEFAULT 'staff',
    title VARCHAR(100),
    assigned_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Deactivated', 'Suspended')),
    avatar_url TEXT,
    avatar_initials VARCHAR(4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(assigned_location_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ----------------------------------------------------------------------------
-- 6. PRODUCTS (Master Catalog)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(60) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cost_price >= 0),
    reorder_level INTEGER NOT NULL DEFAULT 15 CHECK (reorder_level >= 0),
    primary_supplier VARCHAR(150),
    primary_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- ----------------------------------------------------------------------------
-- 7. INVENTORY LEVELS (Per-Location Real-time Balances)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    reserved_stock INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_product_location UNIQUE (product_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_product ON public.inventory_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_location ON public.inventory_levels(location_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock ON public.inventory_levels(current_stock);

-- ----------------------------------------------------------------------------
-- 8. STOCK INFLOW RECORDS (Restocking, Customer Returns, Replacements)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_inflow_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_no VARCHAR(60) UNIQUE NOT NULL,
    flow_sub_type inflow_subtype NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    supplier_or_entity VARCHAR(200) NOT NULL,
    status transaction_status NOT NULL DEFAULT 'Completed',
    notes TEXT,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inflow_created_at ON public.stock_inflow_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inflow_product ON public.stock_inflow_records(product_id);
CREATE INDEX IF NOT EXISTS idx_inflow_location ON public.stock_inflow_records(location_id);
CREATE INDEX IF NOT EXISTS idx_inflow_subtype ON public.stock_inflow_records(flow_sub_type);

-- ----------------------------------------------------------------------------
-- 9. STOCK OUTFLOW RECORDS (POS Website, Damaged, Returned to Supplier)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_outflow_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_no VARCHAR(60) UNIQUE NOT NULL,
    flow_sub_type outflow_subtype NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    destination_or_entity VARCHAR(200) NOT NULL,
    status transaction_status NOT NULL DEFAULT 'Completed',
    notes TEXT,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outflow_created_at ON public.stock_outflow_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outflow_product ON public.stock_outflow_records(product_id);
CREATE INDEX IF NOT EXISTS idx_outflow_location ON public.stock_outflow_records(location_id);
CREATE INDEX IF NOT EXISTS idx_outflow_subtype ON public.stock_outflow_records(flow_sub_type);

-- ----------------------------------------------------------------------------
-- 10. IMMUTABLE STOCK AUDIT LEDGER (Tracks Stock Level at Every Time T)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_seq BIGSERIAL,
    transaction_code VARCHAR(80) NOT NULL,
    movement_type stock_movement_type NOT NULL,
    flow_sub_type VARCHAR(60) NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    quantity_delta INTEGER NOT NULL, -- Positive for inflow, negative for outflow
    balance_before INTEGER NOT NULL CHECK (balance_before >= 0),
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    reference_table VARCHAR(50), -- 'stock_inflow_records', 'stock_outflow_records'
    reference_id UUID,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_ledger_seq ON public.inventory_ledger(ledger_seq DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_time ON public.inventory_ledger(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_prod_loc ON public.inventory_ledger(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_ledger_trans_code ON public.inventory_ledger(transaction_code);

-- ----------------------------------------------------------------------------
-- 11. SECURITY DEFINER HELPER FUNCTIONS (RBAC Claim Evaluators)
-- ----------------------------------------------------------------------------

-- Check if current authenticated user has a specific role
CREATE OR REPLACE FUNCTION public.current_user_has_role(required_role user_role)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = required_role
        AND status = 'Active'
    );
$$;

-- Check if current authenticated user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT public.current_user_has_role('super_admin');
$$;

-- Check if current authenticated user is Admin or Super Admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin')
        AND status = 'Active'
    );
$$;

-- ----------------------------------------------------------------------------
-- 12. AUTOMATIC PROFILE CREATION TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role user_role := 'staff';
    v_full_name TEXT;
    v_initials VARCHAR(4) := 'U';
BEGIN
    -- Derive role from user metadata if provided, otherwise default to staff
    IF NEW.raw_user_meta_data->>'role' = 'super_admin' THEN
        v_role := 'super_admin';
    ELSIF NEW.raw_user_meta_data->>'role' = 'admin' THEN
        v_role := 'admin';
    END IF;

    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    v_initials := UPPER(SUBSTRING(v_full_name, 1, 2));

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        title,
        status,
        avatar_initials
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        v_role,
        COALESCE(NEW.raw_user_meta_data->>'title', 'Inventory Staff'),
        'Active',
        v_initials
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = now();

    RETURN NEW;
END;
$$;

-- Register trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 13. ATOMIC TRANSACTION ENGINE: record_stock_movement (RPC)
-- Ensures strict ACID concurrency, locks rows FOR UPDATE, guarantees
-- no negative stock balances, and appends to the immutable audit ledger.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_stock_movement(
    p_movement_type VARCHAR,      -- 'INFLOW' or 'OUTFLOW'
    p_flow_sub_type VARCHAR,      -- 'Restocking', 'Returning', 'Replacing', 'POS Website', 'Damaged', 'Returned to Supplier'
    p_product_id UUID,
    p_location_id UUID,
    p_quantity INTEGER,
    p_unit_price NUMERIC,
    p_entity_name VARCHAR,        -- Supplier, Customer, POS, etc.
    p_reference_no VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_stock INTEGER := 0;
    v_new_stock INTEGER := 0;
    v_ref_no VARCHAR(80);
    v_trans_id UUID;
    v_total_amount NUMERIC(14,2);
    v_user_id UUID := auth.uid();
BEGIN
    -- 1. Validation
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Stock movement quantity must be greater than zero. Received: %', p_quantity;
    END IF;

    IF p_movement_type NOT IN ('INFLOW', 'OUTFLOW') THEN
        RAISE EXCEPTION 'Invalid movement type: %. Must be INFLOW or OUTFLOW.', p_movement_type;
    END IF;

    -- Calculate total amount
    v_total_amount := p_quantity * COALESCE(p_unit_price, 0.00);

    -- 2. Lock & Retrieve Current Inventory Level FOR UPDATE to prevent race conditions
    -- Ensure row exists first
    INSERT INTO public.inventory_levels (product_id, location_id, current_stock, reserved_stock, updated_at)
    VALUES (p_product_id, p_location_id, 0, 0, now())
    ON CONFLICT (product_id, location_id) DO NOTHING;

    SELECT current_stock INTO v_current_stock
    FROM public.inventory_levels
    WHERE product_id = p_product_id AND location_id = p_location_id
    FOR UPDATE;

    -- 3. Calculate New Stock Level
    IF p_movement_type = 'INFLOW' THEN
        v_new_stock := v_current_stock + p_quantity;
    ELSIF p_movement_type = 'OUTFLOW' THEN
        IF v_current_stock < p_quantity THEN
            RAISE EXCEPTION 'Insufficient stock in location! Available: %, Requested Outflow: %', v_current_stock, p_quantity;
        END IF;
        v_new_stock := v_current_stock - p_quantity;
    END IF;

    -- 4. Generate reference code if not provided
    IF p_reference_no IS NULL OR TRIM(p_reference_no) = '' THEN
        IF p_movement_type = 'INFLOW' THEN
            v_ref_no := 'INF-' || TO_CHAR(clock_timestamp(), 'YYYYMMDD-HH24MISS') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 4);
        ELSE
            v_ref_no := 'OUT-' || TO_CHAR(clock_timestamp(), 'YYYYMMDD-HH24MISS') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 4);
        END IF;
    ELSE
        v_ref_no := p_reference_no;
    END IF;

    -- 5. Update Inventory Level
    UPDATE public.inventory_levels
    SET current_stock = v_new_stock,
        updated_at = now()
    WHERE product_id = p_product_id AND location_id = p_location_id;

    -- 6. Insert into Inflow or Outflow Transaction Table
    IF p_movement_type = 'INFLOW' THEN
        INSERT INTO public.stock_inflow_records (
            reference_no,
            flow_sub_type,
            product_id,
            location_id,
            quantity,
            unit_cost,
            total_amount,
            supplier_or_entity,
            status,
            notes,
            recorded_by
        )
        VALUES (
            v_ref_no,
            p_flow_sub_type::inflow_subtype,
            p_product_id,
            p_location_id,
            p_quantity,
            COALESCE(p_unit_price, 0.00),
            v_total_amount,
            p_entity_name,
            'Completed',
            p_notes,
            v_user_id
        )
        RETURNING id INTO v_trans_id;
    ELSE
        INSERT INTO public.stock_outflow_records (
            reference_no,
            flow_sub_type,
            product_id,
            location_id,
            quantity,
            unit_price,
            total_amount,
            destination_or_entity,
            status,
            notes,
            recorded_by
        )
        VALUES (
            v_ref_no,
            p_flow_sub_type::outflow_subtype,
            p_product_id,
            p_location_id,
            p_quantity,
            COALESCE(p_unit_price, 0.00),
            v_total_amount,
            p_entity_name,
            CASE WHEN p_flow_sub_type = 'Damaged' THEN 'Written-Off'::transaction_status ELSE 'Completed'::transaction_status END,
            p_notes,
            v_user_id
        )
        RETURNING id INTO v_trans_id;
    END IF;

    -- 7. Record into Immutable Audit Ledger (Tracks Stock Level at Every Time T)
    INSERT INTO public.inventory_ledger (
        transaction_code,
        movement_type,
        flow_sub_type,
        product_id,
        location_id,
        quantity_delta,
        balance_before,
        balance_after,
        unit_price,
        total_value,
        reference_table,
        reference_id,
        performed_by,
        notes,
        recorded_at
    )
    VALUES (
        v_ref_no,
        p_movement_type::stock_movement_type,
        p_flow_sub_type,
        p_product_id,
        p_location_id,
        CASE WHEN p_movement_type = 'INFLOW' THEN p_quantity ELSE -p_quantity END,
        v_current_stock,
        v_new_stock,
        COALESCE(p_unit_price, 0.00),
        v_total_amount,
        CASE WHEN p_movement_type = 'INFLOW' THEN 'stock_inflow_records' ELSE 'stock_outflow_records' END,
        v_trans_id,
        v_user_id,
        p_notes,
        clock_timestamp()
    );

    RETURN jsonb_build_object(
        'success', true,
        'reference_no', v_ref_no,
        'transaction_id', v_trans_id,
        'movement_type', p_movement_type,
        'flow_sub_type', p_flow_sub_type,
        'balance_before', v_current_stock,
        'balance_after', v_new_stock,
        'quantity', p_quantity,
        'total_amount', v_total_amount
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 14. REAL-TIME KPI AGGREGATION VIEW
-- Aggregates real-time metrics for instant dashboard hydration
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_inventory_kpis AS
SELECT
    (SELECT COUNT(*) FROM public.products WHERE is_active = true) AS total_products,
    COALESCE((
        SELECT SUM(il.current_stock * p.unit_price)
        FROM public.inventory_levels il
        JOIN public.products p ON p.id = il.product_id
        WHERE p.is_active = true
    ), 0.00) AS total_stock_value,
    COALESCE((
        SELECT COUNT(DISTINCT p.id)
        FROM public.products p
        JOIN public.inventory_levels il ON il.product_id = p.id
        GROUP BY p.id, p.reorder_level
        HAVING SUM(il.current_stock) <= p.reorder_level
    ), 0) AS low_stock_items,
    (SELECT COUNT(*) FROM public.locations WHERE is_active = true) AS locations_count,
    COALESCE((
        SELECT SUM(quantity)
        FROM public.stock_inflow_records
        WHERE created_at >= CURRENT_DATE
    ), 0) AS inflow_today,
    COALESCE((
        SELECT SUM(quantity)
        FROM public.stock_outflow_records
        WHERE created_at >= CURRENT_DATE
    ), 0) AS outflow_today;

-- ----------------------------------------------------------------------------
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- Enterprise multi-tenant and role-governed data protection
-- ----------------------------------------------------------------------------

-- Enable RLS across all tables
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_inflow_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_outflow_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_ledger ENABLE ROW LEVEL SECURITY;

-- LOCATIONS: Read open to authenticated; Write reserved for Super Admin & Admin
CREATE POLICY "Locations are readable by all authenticated users"
    ON public.locations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Locations are manageable by Admins and Super Admins"
    ON public.locations FOR ALL
    TO authenticated
    USING (public.is_admin_or_super())
    WITH CHECK (public.is_admin_or_super());

-- CATEGORIES: Read open to authenticated; Write reserved for Super Admin & Admin
CREATE POLICY "Categories are readable by all authenticated users"
    ON public.categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Categories are manageable by Admins and Super Admins"
    ON public.categories FOR ALL
    TO authenticated
    USING (public.is_admin_or_super())
    WITH CHECK (public.is_admin_or_super());

-- PROFILES:
-- 1. Any user can view their own profile
-- 2. Super Admins can view and manage all profiles
-- 3. Admins can view all profiles and manage Staff profiles (cannot touch Super Admin)
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_admin_or_super());

CREATE POLICY "Super Admins can manage all profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Admins can update and manage staff profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        public.is_admin_or_super() AND role = 'staff'
    )
    WITH CHECK (
        public.is_admin_or_super() AND role = 'staff'
    );

-- PRODUCTS: Read open to all authenticated; Write reserved for Admins and Super Admins
CREATE POLICY "Products are viewable by all authenticated users"
    ON public.products FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Products can be modified by Admins and Super Admins"
    ON public.products FOR ALL
    TO authenticated
    USING (public.is_admin_or_super())
    WITH CHECK (public.is_admin_or_super());

-- INVENTORY LEVELS: Read open to all; Updates routed via RPC or Admin privileges
CREATE POLICY "Inventory levels are viewable by all authenticated users"
    ON public.inventory_levels FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Inventory levels can be updated by authorized staff or admins"
    ON public.inventory_levels FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL);

-- INFLOW RECORDS: Staff can insert and view; Admins can view all and manage
CREATE POLICY "Inflow records viewable by authenticated users"
    ON public.stock_inflow_records FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Inflow records insertable by authenticated staff and admins"
    ON public.stock_inflow_records FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- OUTFLOW RECORDS: Staff can insert and view; Admins can view all and manage
CREATE POLICY "Outflow records viewable by authenticated users"
    ON public.stock_outflow_records FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Outflow records insertable by authenticated staff and admins"
    ON public.stock_outflow_records FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- INVENTORY LEDGER: Read-only for Admins and Super Admins; Staff forbidden from viewing full financial audit
-- ABSOLUTELY NO UPDATE OR DELETE ALLOWED FOR ANYONE (Append-only immutable audit trail)
CREATE POLICY "Ledger viewable only by Admins and Super Admins"
    ON public.inventory_ledger FOR SELECT
    TO authenticated
    USING (public.is_admin_or_super());

-- Prevent any manual mutation of ledger records
REVOKE UPDATE, DELETE ON public.inventory_ledger FROM authenticated, anon, public;

-- ============================================================================
-- 16. SEED DATA (Lyans Woman Reference Data Alignment)
-- Populates initial locations, categories, catalog products, balances & transactions
-- ============================================================================

DO $$
DECLARE
    v_loc_main UUID := '11111111-1111-1111-1111-111111111111';
    v_loc_north UUID := '22222222-2222-2222-2222-222222222222';
    v_loc_south UUID := '33333333-3333-3333-3333-333333333333';
    v_loc_wh UUID := '44444444-4444-4444-4444-444444444444';

    v_cat_apparel UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_cat_bags UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    v_cat_footwear UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    v_cat_jewelry UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd';

    v_prod_gown UUID := '00000000-0000-0000-0000-000000000001';
    v_prod_tote UUID := '00000000-0000-0000-0000-000000000002';
    v_prod_pumps UUID := '00000000-0000-0000-0000-000000000003';
    v_prod_earrings UUID := '00000000-0000-0000-0000-000000000004';
    v_prod_cardigan UUID := '00000000-0000-0000-0000-000000000005';
    v_prod_minibag UUID := '00000000-0000-0000-0000-000000000006';
    v_prod_perfume UUID := '00000000-0000-0000-0000-000000000007';
BEGIN
    -- 1. Insert Locations
    INSERT INTO public.locations (id, code, name, type, address, capacity_limit, color_hex, description)
    VALUES
        (v_loc_main, 'LOC-MAIN', 'Main Store', 'boutique', 'Flagship Lyans Boutique (Ground Floor)', 1000, '#10B981', 'Flagship Lyans Boutique (Ground Floor)'),
        (v_loc_north, 'LOC-NORTH', 'Branch - North', 'outlet', 'Uptown Galleria Outlet', 600, '#2563EB', 'Uptown Galleria Outlet'),
        (v_loc_south, 'LOC-SOUTH', 'Branch - South', 'mall', 'Westfield Fashion Mall', 500, '#F59E0B', 'Westfield Fashion Mall'),
        (v_loc_wh, 'LOC-WH', 'Warehouse', 'warehouse', 'Central Fulfillment & Quarantine Depo', 2000, '#EF4444', 'Central Fulfillment & Quarantine Depo')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Insert Categories
    INSERT INTO public.categories (id, code, name, subtitle, color, badge_color, capacity_target)
    VALUES
        (v_cat_apparel, 'CAT-APP', 'Electronics / Apparel', 'Women''s Dresses, Silks & Outerwear', '#10B981', '#ECFDF5', 500),
        (v_cat_bags, 'CAT-BAG', 'Groceries / Bags & Leather', 'Luxury Handbags & Clutches', '#10B981', '#ECFDF5', 600),
        (v_cat_footwear, 'CAT-FOOT', 'Household / Footwear', 'Designer Heels, Flats & Boots', '#F59E0B', '#FFFBEB', 400),
        (v_cat_jewelry, 'CAT-JEW', 'Accessories / Jewelry', 'Fine Gems, Watches & Fragrances', '#EF4444', '#FEF2F2', 300)
    ON CONFLICT (id) DO NOTHING;

    -- 3. Insert Products Catalog
    INSERT INTO public.products (id, sku, name, category_id, unit_price, cost_price, reorder_level, primary_supplier, primary_location_id)
    VALUES
        (v_prod_gown, 'LYAN-DR-902', 'Silk Slip Evening Gown', v_cat_apparel, 280.00, 140.00, 15, 'Metro Supplies', v_loc_main),
        (v_prod_tote, 'LYAN-BG-411', 'Croc-Embossed Leather Tote', v_cat_bags, 340.00, 170.00, 20, 'Daily Goods Co.', v_loc_main),
        (v_prod_pumps, 'LYAN-SH-708', 'Pointed Satin Stiletto Pumps', v_cat_footwear, 195.00, 95.00, 25, 'Prime Distributors', v_loc_north),
        (v_prod_earrings, 'LYAN-JW-105', '18k Gold Pearl Drop Earrings', v_cat_jewelry, 150.00, 60.00, 15, 'Home Essentials', v_loc_south),
        (v_prod_cardigan, 'LYAN-DR-332', 'Cashmere Knit Wrap Cardigan', v_cat_apparel, 220.00, 110.00, 20, 'Metro Supplies', v_loc_wh),
        (v_prod_minibag, 'LYAN-BG-880', 'Quilted Velvet Mini Shoulder Bag', v_cat_bags, 210.00, 90.00, 15, 'Daily Goods Co.', v_loc_main),
        (v_prod_perfume, 'LYAN-PF-551', 'Midnight Rose Eau de Parfum (100ml)', v_cat_jewelry, 135.00, 50.00, 12, 'Prime Distributors', v_loc_main)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Insert Inventory Levels (Aggregated matching UI counts)
    INSERT INTO public.inventory_levels (product_id, location_id, current_stock, reserved_stock)
    VALUES
        (v_prod_gown, v_loc_main, 45, 0),
        (v_prod_tote, v_loc_main, 62, 2),
        (v_prod_pumps, v_loc_north, 18, 0),
        (v_prod_earrings, v_loc_south, 9, 0),
        (v_prod_cardigan, v_loc_wh, 84, 5),
        (v_prod_minibag, v_loc_main, 35, 1),
        (v_prod_perfume, v_loc_main, 6, 0)
    ON CONFLICT (product_id, location_id) DO UPDATE
    SET current_stock = EXCLUDED.current_stock;

    -- 5. Seed Initial Inflow Transactions
    INSERT INTO public.stock_inflow_records (reference_no, flow_sub_type, product_id, location_id, quantity, unit_cost, total_amount, supplier_or_entity, status)
    VALUES
        ('SUP-001', 'Restocking', v_prod_gown, v_loc_main, 48, 140.00, 2450.00, 'Metro Supplies', 'Completed'),
        ('SUP-002', 'Restocking', v_prod_tote, v_loc_main, 35, 170.00, 1870.00, 'Daily Goods Co.', 'Completed'),
        ('SUP-003', 'Restocking', v_prod_pumps, v_loc_north, 60, 95.00, 3120.00, 'Prime Distributors', 'Pending'),
        ('SUP-004', 'Restocking', v_prod_cardigan, v_loc_wh, 22, 110.00, 980.00, 'Home Essentials', 'Completed'),
        ('RET-044', 'Returning', v_prod_minibag, v_loc_main, 2, 90.00, 210.00, 'Customer Return #440', 'Completed')
    ON CONFLICT (reference_no) DO NOTHING;

    -- 6. Seed Initial Outflow Transactions
    INSERT INTO public.stock_outflow_records (reference_no, flow_sub_type, product_id, location_id, quantity, unit_price, total_amount, destination_or_entity, status)
    VALUES
        ('POS-8921', 'POS Website', v_prod_gown, v_loc_main, 4, 280.00, 540.00, 'Lyans POS Online Store', 'Completed'),
        ('DAM-019', 'Damaged', v_prod_perfume, v_loc_main, 1, 135.00, 145.00, 'Boutique Shelf Audit', 'Written-Off'),
        ('RTV-008', 'Returned to Supplier', v_prod_earrings, v_loc_south, 6, 150.00, 720.00, 'Atelier Supplier Return', 'Completed')
    ON CONFLICT (reference_no) DO NOTHING;

    -- 7. Seed Initial Immutable Audit Ledger Entries (Tracks Stock Level at Every Time T)
    INSERT INTO public.inventory_ledger (transaction_code, movement_type, flow_sub_type, product_id, location_id, quantity_delta, balance_before, balance_after, unit_price, total_value, reference_table, notes)
    VALUES
        ('SUP-001', 'INFLOW', 'Restocking', v_prod_gown, v_loc_main, 48, 0, 48, 140.00, 2450.00, 'stock_inflow_records', 'Initial supplier shipment received'),
        ('SUP-002', 'INFLOW', 'Restocking', v_prod_tote, v_loc_main, 35, 0, 35, 170.00, 1870.00, 'stock_inflow_records', 'Initial batch from Daily Goods Co.'),
        ('POS-8921', 'OUTFLOW', 'POS Website', v_prod_gown, v_loc_main, -4, 49, 45, 280.00, 540.00, 'stock_outflow_records', 'Live checkout deduction via POS'),
        ('RET-044', 'INFLOW', 'Returning', v_prod_minibag, v_loc_main, 2, 33, 35, 90.00, 210.00, 'stock_inflow_records', 'Customer return inspection passed'),
        ('DAM-019', 'OUTFLOW', 'Damaged', v_prod_perfume, v_loc_main, -1, 7, 6, 135.00, 145.00, 'stock_outflow_records', 'Cracked bottle during shelf restock'),
        ('RTV-008', 'OUTFLOW', 'Returned to Supplier', v_prod_earrings, v_loc_south, -6, 15, 9, 150.00, 720.00, 'stock_outflow_records', 'RTV defective clasp batch')
    ON CONFLICT DO NOTHING;

END $$;
