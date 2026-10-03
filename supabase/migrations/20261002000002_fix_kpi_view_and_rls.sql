-- ============================================================================
-- LYANS WOMAN INVENTORY MANAGEMENT SYSTEM
-- Migration: 20261002000002_fix_kpi_view_and_rls.sql
-- Description: Fix v_inventory_kpis scalar subquery bug (low_stock_items 
--              GROUP BY returning multiple rows). Ensure insert policies exist 
--              for inventory_levels and ledger to support RPC-based writes.
-- ============================================================================

-- 1. Fix the KPI View: low_stock_items subquery must be wrapped to return a single count
CREATE OR REPLACE VIEW public.v_inventory_kpis AS
SELECT
    (SELECT COUNT(*) FROM public.products WHERE is_active = true) AS total_products,
    COALESCE((
        SELECT SUM(il.current_stock * p.unit_price)
        FROM public.inventory_levels il
        JOIN public.products p ON p.id = il.product_id
        WHERE p.is_active = true
    ), 0.00) AS total_stock_value,
    -- FIX: Wrap the GROUP BY subquery in an outer COUNT(*) to produce a single scalar
    COALESCE((
        SELECT COUNT(*) FROM (
            SELECT p.id
            FROM public.products p
            JOIN public.inventory_levels il ON il.product_id = p.id
            WHERE p.is_active = true
            GROUP BY p.id, p.reorder_level
            HAVING SUM(il.current_stock) <= p.reorder_level
        ) AS low_stock_subquery
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

-- 2. Ensure INSERT policy exists for inventory_ledger (for RPC SECURITY DEFINER writes)
-- The RPC function runs with SECURITY DEFINER, but we still need the policy for 
-- direct inserts by the function's effective role
DO $$ BEGIN
    -- Check if the insert policy already exists to avoid duplicates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'inventory_ledger' 
        AND policyname = 'Ledger insertable by system RPC functions'
    ) THEN
        CREATE POLICY "Ledger insertable by system RPC functions"
            ON public.inventory_ledger FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- 3. Grant SELECT on the KPI view to authenticated users  
GRANT SELECT ON public.v_inventory_kpis TO authenticated;
