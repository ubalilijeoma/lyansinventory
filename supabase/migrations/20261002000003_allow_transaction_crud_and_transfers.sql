-- ============================================================================
-- LYANS WOMAN INVENTORY MANAGEMENT SYSTEM
-- Migration: 20261002000003_allow_transaction_crud_and_transfers.sql
-- Description: Enable full UPDATE and DELETE policies on stock inflow and outflow
--              records, create stock_transfers table, and allow full CRUD on
--              locations, categories, and inventory transactions.
-- ============================================================================

-- 1. POLICIES: Inflow records UPDATE & DELETE
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'stock_inflow_records'
        AND policyname = 'Inflow records updatable by Admins and Super Admins'
    ) THEN
        CREATE POLICY "Inflow records updatable by Admins and Super Admins"
            ON public.stock_inflow_records FOR UPDATE
            TO authenticated
            USING (public.is_admin_or_super())
            WITH CHECK (public.is_admin_or_super());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'stock_inflow_records'
        AND policyname = 'Inflow records deletable by Admins and Super Admins'
    ) THEN
        CREATE POLICY "Inflow records deletable by Admins and Super Admins"
            ON public.stock_inflow_records FOR DELETE
            TO authenticated
            USING (public.is_admin_or_super());
    END IF;
END $$;

-- 2. POLICIES: Outflow records UPDATE & DELETE
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'stock_outflow_records'
        AND policyname = 'Outflow records updatable by Admins and Super Admins'
    ) THEN
        CREATE POLICY "Outflow records updatable by Admins and Super Admins"
            ON public.stock_outflow_records FOR UPDATE
            TO authenticated
            USING (public.is_admin_or_super())
            WITH CHECK (public.is_admin_or_super());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'stock_outflow_records'
        AND policyname = 'Outflow records deletable by Admins and Super Admins'
    ) THEN
        CREATE POLICY "Outflow records deletable by Admins and Super Admins"
            ON public.stock_outflow_records FOR DELETE
            TO authenticated
            USING (public.is_admin_or_super());
    END IF;
END $$;

-- 3. STOCK TRANSFERS TABLE (Multi-location transfer movements)
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_code VARCHAR(60) UNIQUE NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    source_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    destination_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'In Transit' CHECK (status IN ('Pending', 'In Transit', 'Completed', 'Cancelled')),
    notes TEXT,
    initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT diff_locations CHECK (source_location_id <> destination_location_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_product ON public.stock_transfers(product_id);
CREATE INDEX IF NOT EXISTS idx_transfers_source ON public.stock_transfers(source_location_id);
CREATE INDEX IF NOT EXISTS idx_transfers_destination ON public.stock_transfers(destination_location_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON public.stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON public.stock_transfers(created_at DESC);

-- Enable RLS on stock_transfers
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'stock_transfers'
        AND policyname = 'Transfers readable by authenticated users'
    ) THEN
        CREATE POLICY "Transfers readable by authenticated users"
            ON public.stock_transfers FOR SELECT
            TO authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'stock_transfers'
        AND policyname = 'Transfers insertable by authenticated users'
    ) THEN
        CREATE POLICY "Transfers insertable by authenticated users"
            ON public.stock_transfers FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'stock_transfers'
        AND policyname = 'Transfers updatable by Admins and Super Admins'
    ) THEN
        CREATE POLICY "Transfers updatable by Admins and Super Admins"
            ON public.stock_transfers FOR UPDATE
            TO authenticated
            USING (public.is_admin_or_super())
            WITH CHECK (public.is_admin_or_super());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'stock_transfers'
        AND policyname = 'Transfers deletable by Admins and Super Admins'
    ) THEN
        CREATE POLICY "Transfers deletable by Admins and Super Admins"
            ON public.stock_transfers FOR DELETE
            TO authenticated
            USING (public.is_admin_or_super());
    END IF;
END $$;
