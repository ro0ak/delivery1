-- =====================================================================
-- ROCK Delivery System — ERP phase 2
-- Apply after delivery_migration.sql.
-- =====================================================================

-- Branch managers can create staff records for their own branch.
DROP POLICY IF EXISTS "profiles_manager_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_manager_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_manager_delete" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_delete" ON public.profiles;

CREATE POLICY "profiles_manager_insert" ON public.profiles
  FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'branch_manager'
    AND branch_id = public.get_my_branch_id()
    AND role IN ('branch_employee', 'driver', 'accountant', 'operations')
  );

CREATE POLICY "profiles_manager_update" ON public.profiles
  FOR UPDATE
  USING (
    public.get_my_role() = 'branch_manager'
    AND branch_id = public.get_my_branch_id()
    AND role IN ('branch_manager', 'branch_employee', 'driver', 'accountant', 'operations')
  )
  WITH CHECK (
    public.get_my_role() = 'branch_manager'
    AND branch_id = public.get_my_branch_id()
    AND role IN ('branch_manager', 'branch_employee', 'driver', 'accountant', 'operations')
  );

CREATE POLICY "profiles_manager_delete" ON public.profiles
  FOR DELETE
  USING (
    public.get_my_role() = 'branch_manager'
    AND branch_id = public.get_my_branch_id()
    AND role IN ('branch_employee', 'driver', 'accountant', 'operations')
  );

CREATE POLICY "profiles_admin_delete" ON public.profiles
  FOR DELETE
  USING (public.get_my_role() = 'super_admin');

-- Collections need delete support for full CRUD.
DROP POLICY IF EXISTS "collections_delete" ON public.collections;

CREATE POLICY "collections_delete" ON public.collections
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

-- Expenses need update support for full CRUD.
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;

CREATE POLICY "expenses_update" ON public.expenses
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
