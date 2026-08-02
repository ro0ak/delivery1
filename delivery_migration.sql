-- =====================================================================
-- ROCK Delivery System — Migration
-- Run this in Supabase SQL Editor to create all delivery system tables,
-- RLS policies, and helper functions.
-- Safe to re-run: uses CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 0. Helper functions for RLS (SECURITY DEFINER to avoid recursion)
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'user'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_branch_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 1. BRANCHES
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.branches (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code         TEXT NOT NULL,
    name         TEXT NOT NULL,
    phone        TEXT,
    email        TEXT,
    governorate  TEXT,
    wilaya       TEXT,
    address      TEXT,
    manager_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    opening_balance NUMERIC DEFAULT 0,
    is_active    BOOLEAN DEFAULT true NOT NULL,
    notes        TEXT,
    created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT branches_code_unique UNIQUE (code)
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branches_select_authenticated"  ON public.branches;
DROP POLICY IF EXISTS "branches_all_super_admin"        ON public.branches;

-- All authenticated users can read branches (needed for dropdowns)
CREATE POLICY "branches_select_authenticated" ON public.branches
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only super_admin can write branches
CREATE POLICY "branches_all_super_admin" ON public.branches
  FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────
-- 2. PROFILES — add missing delivery-system columns
-- ─────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'vehicle_number'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN vehicle_number TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Drop old permissive profile policies and replace with scoped ones
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Users can always read their own profile
CREATE POLICY IF NOT EXISTS "profiles_own_select" ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Super admin can read all profiles
CREATE POLICY IF NOT EXISTS "profiles_admin_select" ON public.profiles
  FOR SELECT
  USING (public.get_my_role() = 'super_admin');

-- Branch managers can read profiles in their branch
CREATE POLICY IF NOT EXISTS "profiles_manager_select" ON public.profiles
  FOR SELECT
  USING (
    public.get_my_role() = 'branch_manager'
    AND branch_id = public.get_my_branch_id()
  );

-- Users can update their own profile
CREATE POLICY IF NOT EXISTS "profiles_own_update" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Super admin can update any profile
CREATE POLICY IF NOT EXISTS "profiles_admin_update" ON public.profiles
  FOR UPDATE
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- Profiles are inserted by auth trigger or super admin
CREATE POLICY IF NOT EXISTS "profiles_insert" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id
    OR public.get_my_role() = 'super_admin'
  );

-- ─────────────────────────────────────────────────────────────────────
-- 3. SHIPMENTS
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shipments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number         TEXT UNIQUE,
    origin_branch_id        UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    destination_branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    current_branch_id       UUID REFERENCES public.branches(id) ON DELETE SET NULL,

    -- Detailed status used by office operations (ShipmentOperationsPage)
    current_status_code     TEXT NOT NULL DEFAULT 'created',

    -- Simplified assignment status used by DriversPage / delivery flow
    -- Values: pending | assigned | on_delivery | out_for_delivery | delivered | returned | cancelled
    status                  TEXT NOT NULL DEFAULT 'pending',

    service_type            TEXT DEFAULT 'standard',
    sender_type             TEXT DEFAULT 'individual',
    sender_name             TEXT NOT NULL DEFAULT '',
    sender_phone            TEXT NOT NULL DEFAULT '',
    recipient_name          TEXT NOT NULL DEFAULT '',
    recipient_phone         TEXT NOT NULL DEFAULT '',
    recipient_governorate   TEXT,
    recipient_wilaya        TEXT,
    recipient_address       TEXT,
    recipient_location_url  TEXT,
    item_description        TEXT,
    pieces_count            INTEGER DEFAULT 1,
    weight_kg               NUMERIC,
    product_value           NUMERIC,
    collection_required     BOOLEAN DEFAULT false,
    collection_amount       NUMERIC DEFAULT 0,
    shipping_fee            NUMERIC DEFAULT 0,
    shipping_payment_method TEXT DEFAULT 'prepaid',
    shipping_fee_paid       BOOLEAN DEFAULT false,
    sender_paid_amount      NUMERIC DEFAULT 0,
    recipient_due_amount    NUMERIC DEFAULT 0,
    employee_notes          TEXT,
    driver_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delivered_at            TIMESTAMP WITH TIME ZONE,
    created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Auto-generate tracking number via trigger
CREATE SEQUENCE IF NOT EXISTS public.shipment_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_tracking_number(
    p_origin_branch_id      UUID,
    p_destination_branch_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_origin_code TEXT;
    v_dest_code   TEXT;
    v_seq         BIGINT;
BEGIN
    SELECT code INTO v_origin_code FROM public.branches WHERE id = p_origin_branch_id;
    SELECT code INTO v_dest_code   FROM public.branches WHERE id = p_destination_branch_id;

    IF v_origin_code IS NULL THEN v_origin_code := 'UNK'; END IF;
    IF v_dest_code   IS NULL THEN v_dest_code   := 'UNK'; END IF;

    v_seq := nextval('public.shipment_seq');

    RETURN 'ROCK-' || upper(v_origin_code) || '-' || upper(v_dest_code) || '-' || lpad(v_seq::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shipment_tracking_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.tracking_number IS NULL OR NEW.tracking_number = '' THEN
        NEW.tracking_number := public.generate_tracking_number(
            NEW.origin_branch_id,
            NEW.destination_branch_id
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_shipment_tracking ON public.shipments;
CREATE TRIGGER trg_set_shipment_tracking
    BEFORE INSERT ON public.shipments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_shipment_tracking_number();

-- Sync status when current_status_code changes to delivered
CREATE OR REPLACE FUNCTION public.sync_shipment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.current_status_code = 'delivered' AND OLD.current_status_code <> 'delivered' THEN
        NEW.status := 'delivered';
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_shipment_status ON public.shipments;
CREATE TRIGGER trg_sync_shipment_status
    BEFORE UPDATE ON public.shipments
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_shipment_status();

-- RLS policies for shipments
DROP POLICY IF EXISTS "shipments_select"        ON public.shipments;
DROP POLICY IF EXISTS "shipments_insert"        ON public.shipments;
DROP POLICY IF EXISTS "shipments_update"        ON public.shipments;

CREATE POLICY "shipments_select" ON public.shipments
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      public.get_my_role() = 'super_admin'
      OR (
        public.get_my_role() IN (
          'branch_manager', 'branch_employee',
          'accountant', 'operations'
        )
        AND (
          origin_branch_id      = public.get_my_branch_id()
          OR destination_branch_id = public.get_my_branch_id()
          OR current_branch_id     = public.get_my_branch_id()
        )
      )
      OR (
        public.get_my_role() = 'driver'
        AND driver_id = auth.uid()
      )
    )
  );

CREATE POLICY "shipments_insert" ON public.shipments
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.get_my_role() IN (
      'super_admin', 'branch_manager',
      'branch_employee', 'operations'
    )
  );

CREATE POLICY "shipments_update" ON public.shipments
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      public.get_my_role() = 'super_admin'
      OR (
        public.get_my_role() IN (
          'branch_manager', 'branch_employee',
          'accountant', 'operations'
        )
        AND (
          current_branch_id    = public.get_my_branch_id()
          OR origin_branch_id  = public.get_my_branch_id()
        )
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      public.get_my_role() = 'super_admin'
      OR (
        public.get_my_role() IN (
          'branch_manager', 'branch_employee',
          'accountant', 'operations'
        )
        AND (
          current_branch_id    = public.get_my_branch_id()
          OR origin_branch_id  = public.get_my_branch_id()
        )
      )
    )
  );

-- Public tracking function (safe fields only, callable by anon)
CREATE OR REPLACE FUNCTION public.track_shipment(p_tracking_number TEXT)
RETURNS TABLE (
    tracking_number       TEXT,
    current_status_code   TEXT,
    service_type          TEXT,
    recipient_governorate TEXT,
    item_description      TEXT,
    pieces_count          INTEGER,
    created_at            TIMESTAMPTZ,
    updated_at            TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        s.tracking_number,
        s.current_status_code,
        s.service_type,
        s.recipient_governorate,
        s.item_description,
        s.pieces_count,
        s.created_at,
        s.updated_at
    FROM public.shipments s
    WHERE s.tracking_number = upper(trim(p_tracking_number))
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.track_shipment(TEXT) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. SHIPMENT STATUS HISTORY
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shipment_status_history (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id           UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
    previous_status_code  TEXT,
    new_status_code       TEXT NOT NULL,
    branch_id             UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    changed_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    public_note           TEXT,
    internal_note         TEXT,
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.shipment_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history_select" ON public.shipment_status_history;
DROP POLICY IF EXISTS "history_insert" ON public.shipment_status_history;

CREATE POLICY "history_select" ON public.shipment_status_history
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      public.get_my_role() = 'super_admin'
      OR branch_id = public.get_my_branch_id()
    )
  );

CREATE POLICY "history_insert" ON public.shipment_status_history
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.get_my_role() IN (
      'super_admin', 'branch_manager',
      'branch_employee', 'operations'
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- 5. COLLECTIONS
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.collections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    source      TEXT NOT NULL DEFAULT 'driver'
                    CHECK (source IN ('driver', 'merchant')),
    source_name TEXT NOT NULL DEFAULT '',
    amount      NUMERIC NOT NULL DEFAULT 0,
    date        DATE NOT NULL DEFAULT CURRENT_DATE,
    status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'verified', 'settled')),
    notes       TEXT,
    created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collections_select" ON public.collections;
DROP POLICY IF EXISTS "collections_insert" ON public.collections;
DROP POLICY IF EXISTS "collections_update" ON public.collections;

CREATE POLICY "collections_select" ON public.collections
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      public.get_my_role() = 'super_admin'
      OR branch_id = public.get_my_branch_id()
    )
  );

CREATE POLICY "collections_insert" ON public.collections
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      public.get_my_role() = 'super_admin'
      OR (
        public.get_my_role() IN ('branch_manager', 'accountant')
        AND branch_id = public.get_my_branch_id()
      )
    )
  );

CREATE POLICY "collections_update" ON public.collections
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      public.get_my_role() = 'super_admin'
      OR (
        public.get_my_role() IN ('branch_manager', 'accountant')
        AND branch_id = public.get_my_branch_id()
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      public.get_my_role() = 'super_admin'
      OR (
        public.get_my_role() IN ('branch_manager', 'accountant')
        AND branch_id = public.get_my_branch_id()
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- 6. EXPENSES
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.expenses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    category    TEXT NOT NULL DEFAULT 'other'
                    CHECK (category IN ('rent', 'fuel', 'maintenance', 'salary', 'utilities', 'other')),
    description TEXT NOT NULL DEFAULT '',
    amount      NUMERIC NOT NULL DEFAULT 0,
    date        DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;

CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      public.get_my_role() = 'super_admin'
      OR branch_id = public.get_my_branch_id()
    )
  );

CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      public.get_my_role() = 'super_admin'
      OR (
        public.get_my_role() IN ('branch_manager', 'accountant')
        AND branch_id = public.get_my_branch_id()
      )
    )
  );

CREATE POLICY "expenses_delete" ON public.expenses
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      public.get_my_role() = 'super_admin'
      OR (
        public.get_my_role() IN ('branch_manager', 'accountant')
        AND branch_id = public.get_my_branch_id()
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- 7. SYSTEM SETTINGS
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.system_settings (
    key        TEXT PRIMARY KEY,
    value      JSONB NOT NULL DEFAULT '{}',
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_authenticated" ON public.system_settings;
DROP POLICY IF EXISTS "settings_all_super_admin"      ON public.system_settings;

-- All authenticated users can read settings (needed for pricing, company name, etc.)
CREATE POLICY "settings_select_authenticated" ON public.system_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only super_admin can write settings
CREATE POLICY "settings_all_super_admin" ON public.system_settings
  FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- Insert default settings rows if they don't exist
INSERT INTO public.system_settings (key, value) VALUES
(
  'general',
  '{
    "companyName":   "ROCK Delivery",
    "domain":        "RO0CK.online",
    "supportEmail":  "support@ro0ck.online",
    "supportPhone":  "+968 90000000",
    "headquarters":  "Muscat, Oman"
  }'::jsonb
),
(
  'pricing',
  '{
    "baseRate":    "1.500",
    "perKgRate":   "0.250",
    "codFee":      "0.300",
    "vatPercent":  "5",
    "returnFee":   "1.000"
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 8. EMPLOYEE ACCOUNT CREATION — DOCUMENTED SECURE PROCESS
-- ─────────────────────────────────────────────────────────────────────
-- IMPORTANT: Creating Auth accounts for employees MUST NOT be done
-- from the frontend using the service_role key.
--
-- Secure options:
--
-- Option A — Supabase Dashboard (manual):
--   Authentication → Users → Invite user → fill email.
--   Then update their profiles row with role, branch_id, is_active.
--
-- Option B — Supabase Edge Function (recommended for production):
--   Deploy a server-side Edge Function that uses the service_role key
--   (kept in Supabase Secrets, never in frontend code) to call
--   supabase.auth.admin.createUser({ email, password, email_confirm: true }).
--   The frontend calls the Edge Function endpoint over HTTPS.
--
-- The EmployeesPage in this app updates profile metadata for EXISTING
-- auth users only. New auth account creation is left as an explicit
-- manual/Edge Function step per safeguard #4.
-- ─────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────
-- End of delivery_migration.sql
-- ─────────────────────────────────────────────────────────────────────
