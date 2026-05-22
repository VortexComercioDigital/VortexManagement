/*
  # Fix infinite recursion in RLS policies

  1. Problem
    - All RLS policies that check "is this user an admin?" do so by querying
      the `profiles` table: `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`
    - When the `profiles` table itself has RLS policies that also query `profiles`,
      this creates an infinite recursion: evaluating the policy requires evaluating the policy.
    - Same issue cascades to `leads`, `lead_services`, `lead_notes`, `kanban_stages`, `services_catalog`
      which all check `profiles.role` in their policies.

  2. Solution
    - Store the user's role in `auth.users.raw_app_meta_data` (which is accessible via `auth.jwt()`)
    - Create a helper function `get_user_role()` that reads from `auth.jwt()` instead of querying `profiles`
    - Rewrite ALL policies to use `get_user_role()` instead of `EXISTS (SELECT ... FROM profiles WHERE role = ...)`
    - This breaks the recursion because `auth.jwt()` is available in the RLS context without querying any table.

  3. Changes
    - New function: `get_user_role()` returns the user's role from JWT app_metadata
    - Backfill: update existing users' app_metadata with their role from profiles
    - Drop ALL existing policies on all 6 tables
    - Recreate ALL policies using `get_user_role()` instead of subqueries on `profiles`
    - Update trigger `handle_new_user()` to also set app_metadata with the role
*/

-- ============================================
-- STEP 1: Helper function that reads role from JWT
-- ============================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'vendedor');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- STEP 2: Backfill app_metadata for existing users
-- ============================================
-- We need to update auth.users.app_metadata to include the role
-- This is done via the admin API, but we can also set it via a direct update
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT u.id, p.role FROM auth.users u JOIN profiles p ON p.id = u.id
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', user_record.role)
    WHERE id = user_record.id;
  END LOOP;
END $$;

-- ============================================
-- STEP 3: Update trigger to set app_metadata
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor')
  );
  
  -- Also set app_metadata with the role so RLS can read it via JWT
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor'))
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Drop ALL existing policies
-- ============================================

-- profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- kanban_stages
DROP POLICY IF EXISTS "Authenticated users can read stages" ON kanban_stages;
DROP POLICY IF EXISTS "Admins can insert stages" ON kanban_stages;
DROP POLICY IF EXISTS "Admins can update stages" ON kanban_stages;
DROP POLICY IF EXISTS "Admins can delete stages" ON kanban_stages;

-- services_catalog
DROP POLICY IF EXISTS "Authenticated users can read services catalog" ON services_catalog;
DROP POLICY IF EXISTS "Admins can insert services" ON services_catalog;
DROP POLICY IF EXISTS "Admins can update services" ON services_catalog;
DROP POLICY IF EXISTS "Admins can delete services" ON services_catalog;

-- leads
DROP POLICY IF EXISTS "Admins can read all leads" ON leads;
DROP POLICY IF EXISTS "Vendedores can read own leads" ON leads;
DROP POLICY IF EXISTS "Devs can read leads in production stages" ON leads;
DROP POLICY IF EXISTS "Admins can insert leads" ON leads;
DROP POLICY IF EXISTS "Vendedores can insert own leads" ON leads;
DROP POLICY IF EXISTS "Admins can update all leads" ON leads;
DROP POLICY IF EXISTS "Vendedores can update own leads" ON leads;
DROP POLICY IF EXISTS "Devs can update leads in production" ON leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON leads;
DROP POLICY IF EXISTS "Vendedores can delete own leads" ON leads;

-- lead_services
DROP POLICY IF EXISTS "Admins can read all lead services" ON lead_services;
DROP POLICY IF EXISTS "Vendedores can read own lead services" ON lead_services;
DROP POLICY IF EXISTS "Devs can read lead services in production" ON lead_services;
DROP POLICY IF EXISTS "Admins can insert lead services" ON lead_services;
DROP POLICY IF EXISTS "Admins can update lead services" ON lead_services;
DROP POLICY IF EXISTS "Vendedores can update own lead services" ON lead_services;
DROP POLICY IF EXISTS "Devs can update lead services in production" ON lead_services;
DROP POLICY IF EXISTS "Admins can delete lead services" ON lead_services;
DROP POLICY IF EXISTS "Vendedores can delete own lead services" ON lead_services;

-- lead_notes
DROP POLICY IF EXISTS "Admins can read all lead notes" ON lead_notes;
DROP POLICY IF EXISTS "Vendedores can read own lead notes" ON lead_notes;
DROP POLICY IF EXISTS "Devs can read lead notes in production" ON lead_notes;
DROP POLICY IF EXISTS "Admins can insert lead notes" ON lead_notes;
DROP POLICY IF EXISTS "Authors can update own notes" ON lead_notes;
DROP POLICY IF EXISTS "Admins can delete lead notes" ON lead_notes;
DROP POLICY IF EXISTS "Authors can delete own notes" ON lead_notes;

-- ============================================
-- STEP 5: Recreate ALL policies using get_user_role()
-- ============================================

-- ---- PROFILES ----
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ---- KANBAN STAGES ----
CREATE POLICY "Authenticated users can read stages"
  ON kanban_stages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert stages"
  ON kanban_stages FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update stages"
  ON kanban_stages FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can delete stages"
  ON kanban_stages FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- ---- SERVICES CATALOG ----
CREATE POLICY "Authenticated users can read services catalog"
  ON services_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert services"
  ON services_catalog FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update services"
  ON services_catalog FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can delete services"
  ON services_catalog FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- ---- LEADS ----
CREATE POLICY "Admins can read all leads"
  ON leads FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Vendedores can read own leads"
  ON leads FOR SELECT
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Devs can read leads in production stages"
  ON leads FOR SELECT
  TO authenticated
  USING (get_user_role() = 'dev' AND is_dev_and_lead_in_production(stage_id));

CREATE POLICY "Admins can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Vendedores can insert own leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "Admins can update all leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Vendedores can update own leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (vendedor_id = auth.uid())
  WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "Devs can update leads in production"
  ON leads FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'dev' AND is_dev_and_lead_in_production(stage_id))
  WITH CHECK (get_user_role() = 'dev' AND is_dev_and_lead_in_production(stage_id));

CREATE POLICY "Admins can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Vendedores can delete own leads"
  ON leads FOR DELETE
  TO authenticated
  USING (vendedor_id = auth.uid());

-- ---- LEAD SERVICES ----
CREATE POLICY "Admins can read all lead services"
  ON lead_services FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Vendedores can read own lead services"
  ON lead_services FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_services.lead_id AND leads.vendedor_id = auth.uid())
  );

CREATE POLICY "Devs can read lead services in production"
  ON lead_services FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_services.lead_id AND is_dev_and_lead_in_production(leads.stage_id))
  );

CREATE POLICY "Admins can insert lead services"
  ON lead_services FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Vendedores can insert own lead services"
  ON lead_services FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_services.lead_id AND leads.vendedor_id = auth.uid())
  );

CREATE POLICY "Admins can update lead services"
  ON lead_services FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Vendedores can update own lead services"
  ON lead_services FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_services.lead_id AND leads.vendedor_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_services.lead_id AND leads.vendedor_id = auth.uid())
  );

CREATE POLICY "Devs can update lead services in production"
  ON lead_services FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_services.lead_id AND is_dev_and_lead_in_production(leads.stage_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_services.lead_id AND is_dev_and_lead_in_production(leads.stage_id))
  );

CREATE POLICY "Admins can delete lead services"
  ON lead_services FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Vendedores can delete own lead services"
  ON lead_services FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_services.lead_id AND leads.vendedor_id = auth.uid())
  );

-- ---- LEAD NOTES ----
CREATE POLICY "Admins can read all lead notes"
  ON lead_notes FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Vendedores can read own lead notes"
  ON lead_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_notes.lead_id AND leads.vendedor_id = auth.uid())
  );

CREATE POLICY "Devs can read lead notes in production"
  ON lead_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_notes.lead_id AND is_dev_and_lead_in_production(leads.stage_id))
  );

CREATE POLICY "Admins can insert lead notes"
  ON lead_notes FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Vendedores can insert own lead notes"
  ON lead_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_notes.lead_id AND leads.vendedor_id = auth.uid())
  );

CREATE POLICY "Devs can insert lead notes in production"
  ON lead_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_notes.lead_id AND is_dev_and_lead_in_production(leads.stage_id))
  );

CREATE POLICY "Authors can update own notes"
  ON lead_notes FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Admins can delete lead notes"
  ON lead_notes FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Authors can delete own notes"
  ON lead_notes FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());
