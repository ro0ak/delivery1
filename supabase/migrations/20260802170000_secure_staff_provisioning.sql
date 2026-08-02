-- Secure staff provisioning alignment.
-- Normalize emails before enforcing duplicate protection.
UPDATE public.profiles
SET email = lower(trim(email))
WHERE email IS NOT NULL
  AND email <> lower(trim(email));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_unique_idx
  ON public.profiles (lower(email));

CREATE OR REPLACE FUNCTION public.get_profile_role(profile_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = profile_id;
$$;

DROP POLICY IF EXISTS "profiles_manager_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_manager_update" ON public.profiles;

CREATE POLICY "profiles_manager_insert" ON public.profiles
  FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'branch_manager'
    AND branch_id = public.get_my_branch_id()
    AND role IN ('branch_employee', 'driver', 'operations')
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
    AND (
      role IN ('branch_employee', 'driver', 'operations')
      OR role = public.get_profile_role(id)
    )
  );
