-- ============================================================================
-- LYANS WOMAN INVENTORY MANAGEMENT SYSTEM
-- Migration: 20261002000001_bootstrap_super_admin.sql
-- Description: Designates and guarantees Super Admin status for
--              ijeomalilianuba@gmail.com across auth.users, profiles,
--              future signups, and immutable protection guards.
-- Author: Lyans Woman Engineering
-- Version: PostgreSQL 17.x / Supabase Enterprise
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SYSTEM SUPER ADMIN CONFIGURATION TABLE (Allowlist & Guard)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_super_admin_allowlist (
    email VARCHAR(255) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    designated_title VARCHAR(120) NOT NULL DEFAULT 'Super Administrator (Executive Owner)',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the primary Super Admin email
INSERT INTO public.system_super_admin_allowlist (email, full_name, designated_title)
VALUES ('ijeomalilianuba@gmail.com', 'Ijeoma Lilian Uba', 'Super Administrator (Executive Owner)')
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    designated_title = EXCLUDED.designated_title;

-- Restrict allowlist table access
ALTER TABLE public.system_super_admin_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allowlist viewable only by Super Admins"
    ON public.system_super_admin_allowlist FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

-- ----------------------------------------------------------------------------
-- 2. UPDATE handle_new_user() TRIGGER TO AUTO-ASSIGN SUPER ADMIN
-- Automatically grants Super Admin role if email matches allowlist
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
    v_title TEXT := 'Inventory Staff';
    v_initials VARCHAR(4) := 'IU';
    v_is_super BOOLEAN := false;
    v_allowlist_title TEXT;
    v_allowlist_name TEXT;
BEGIN
    -- Check if email is in the system Super Admin allowlist
    SELECT true, designated_title, full_name
    INTO v_is_super, v_allowlist_title, v_allowlist_name
    FROM public.system_super_admin_allowlist
    WHERE LOWER(email) = LOWER(NEW.email);

    IF v_is_super IS TRUE THEN
        v_role := 'super_admin';
        v_full_name := COALESCE(v_allowlist_name, 'Ijeoma Lilian Uba');
        v_title := COALESCE(v_allowlist_title, 'Super Administrator (Executive Owner)');
        v_initials := 'IU';
    ELSIF NEW.raw_user_meta_data->>'role' = 'super_admin' THEN
        v_role := 'super_admin';
        v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
        v_title := COALESCE(NEW.raw_user_meta_data->>'title', 'Super Administrator');
        v_initials := UPPER(SUBSTRING(v_full_name, 1, 2));
    ELSIF NEW.raw_user_meta_data->>'role' = 'admin' THEN
        v_role := 'admin';
        v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
        v_title := COALESCE(NEW.raw_user_meta_data->>'title', 'Store Admin');
        v_initials := UPPER(SUBSTRING(v_full_name, 1, 2));
    ELSE
        v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
        v_title := COALESCE(NEW.raw_user_meta_data->>'title', 'Inventory Staff');
        v_initials := UPPER(SUBSTRING(v_full_name, 1, 2));
    END IF;

    -- Upsert profile record
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
        v_title,
        'Active',
        v_initials
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = CASE WHEN v_is_super IS TRUE THEN 'Ijeoma Lilian Uba' ELSE EXCLUDED.full_name END,
        role = CASE WHEN v_is_super IS TRUE THEN 'super_admin'::user_role ELSE EXCLUDED.role END,
        title = CASE WHEN v_is_super IS TRUE THEN 'Super Administrator (Executive Owner)' ELSE EXCLUDED.title END,
        status = 'Active',
        updated_at = now();

    -- Also synchronize raw_app_meta_data role for native Supabase JWT claims if Super Admin
    IF v_is_super IS TRUE THEN
        UPDATE auth.users
        SET raw_app_meta_data = jsonb_set(
                COALESCE(raw_app_meta_data, '{}'::jsonb),
                '{role}',
                '"super_admin"'::jsonb
            ),
            raw_user_meta_data = jsonb_set(
                COALESCE(raw_user_meta_data, '{}'::jsonb),
                '{role}',
                '"super_admin"'::jsonb
            )
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. RETROACTIVE PROMOTION FOR EXISTING USER (If already signed up)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check if user exists in auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE LOWER(email) = 'ijeomalilianuba@gmail.com'
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- 1. Update auth metadata
        UPDATE auth.users
        SET raw_app_meta_data = jsonb_set(
                COALESCE(raw_app_meta_data, '{}'::jsonb),
                '{role}',
                '"super_admin"'::jsonb
            ),
            raw_user_meta_data = jsonb_set(
                COALESCE(raw_user_meta_data, '{}'::jsonb),
                '{role}',
                '"super_admin"'::jsonb
            )
        WHERE id = v_user_id;

        -- 2. Upsert profile
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
            v_user_id,
            'ijeomalilianuba@gmail.com',
            'Ijeoma Lilian Uba',
            'super_admin',
            'Super Administrator (Executive Owner)',
            'Active',
            'IU'
        )
        ON CONFLICT (id) DO UPDATE
        SET role = 'super_admin',
            full_name = 'Ijeoma Lilian Uba',
            title = 'Super Administrator (Executive Owner)',
            status = 'Active',
            avatar_initials = 'IU',
            updated_at = now();

        RAISE NOTICE 'User ijeomalilianuba@gmail.com successfully promoted to Super Admin.';
    ELSE
        RAISE NOTICE 'User ijeomalilianuba@gmail.com not yet registered in auth.users. The handle_new_user trigger will automatically assign Super Admin status upon initial registration.';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. IMMUTABLE PROTECTION TRIGGER
-- Prevents accidental deletion, deactivation, or demotion of Primary Super Admin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_primary_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Guard against deactivation or demotion
    IF LOWER(OLD.email) = 'ijeomalilianuba@gmail.com' THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Cannot delete the Primary Super Admin account: %', OLD.email;
        END IF;

        IF NEW.role != 'super_admin' THEN
            RAISE EXCEPTION 'Cannot demote the Primary Super Admin account: %', OLD.email;
        END IF;

        IF NEW.status != 'Active' THEN
            RAISE EXCEPTION 'Cannot deactivate the Primary Super Admin account: %', OLD.email;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_primary_super_admin ON public.profiles;
CREATE TRIGGER trg_protect_primary_super_admin
    BEFORE UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_primary_super_admin();
