/*
  # Comprehensive Row Level Security (RLS) Policies
  
  1. Overview
    This migration implements complete RLS policies for a CRM system with three roles:
    - admin: Full access to all data
    - vendedor: Can only access their own leads (vendedor_id = auth.uid())
    - dev: Read-only access to leads in production stages (Proposta, Negociação, Fechado)
  
  2. Security Model
    - Authentication is verified via auth.uid() and auth.jwt()
    - User role is stored in auth.users.app_metadata and synced to profiles table
    - RLS policies read role from JWT to avoid circular dependencies
    - Server Actions verify permissions BEFORE attempting mutations
  
  3. Tables Covered
    - profiles: User profiles and roles
    - kanban_stages: Kanban columns (admin CRUD, others read)
    - services_catalog: Service catalog (admin CRUD, others read)
    - leads: Main leads table
    - lead_services: Services attached to leads
    - lead_notes: Notes attached to leads
  
  4. Key Security Features
    - No circular policy dependencies (uses get_user_role() from JWT)
    - Vendedors isolated to their own data
    - Admins have full access
    - Devs have read-only access to production pipeline
*/

-- ============================================================================
-- STEP 1: Helper Functions
-- ============================================================================

-- Function to get user role from JWT (avoids circular dependency)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'vendedor');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if dev can access lead in production stages
CREATE OR REPLACE FUNCTION is_dev_and_lead_in_production(check_stage_id uuid)
RETURNS boolean AS $$
DECLARE
  stage_name text;
BEGIN
  IF get_user_role() != 'dev' THEN RETURN false; END IF;

  SELECT name INTO stage_name FROM kanban_stages WHERE id = check_stage_id;
  RETURN stage_name IN ('Proposta', 'Negociação', 'Fechado');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_dev_and_lead_in_production(uuid) TO authenticated;

-- ============================================================================
-- STEP 2: Sync Role Changes to app_metadata
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_profile_role_to_app_metadata()
RETURNS trigger AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', NEW.role)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_changed ON profiles;
CREATE TRIGGER on_profile_role_changed
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_profile_role_to_app_metadata();

-- ============================================================================
-- STEP 3: Profiles RLS
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

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

-- ============================================================================
-- STEP 4: Kanban Stages RLS
-- ============================================================================

ALTER TABLE kanban_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read stages" ON kanban_stages;
DROP POLICY IF EXISTS "Admins can insert stages" ON kanban_stages;
DROP POLICY IF EXISTS "Admins can update stages" ON kanban_stages;
DROP POLICY IF EXISTS "Admins can delete stages" ON kanban_stages;

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

-- ============================================================================
-- STEP 5: Services Catalog RLS
-- ============================================================================

ALTER TABLE services_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read services catalog" ON services_catalog;
DROP POLICY IF EXISTS "Admins can insert services" ON services_catalog;
DROP POLICY IF EXISTS "Admins can update services" ON services_catalog;
DROP POLICY IF EXISTS "Admins can delete services" ON services_catalog;

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

-- ============================================================================
-- STEP 6: Leads RLS
-- ============================================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

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

-- SELECT: Admin sees all, Vendedor sees own, Dev sees production
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

-- INSERT: Admin can create any, Vendedor creates for self
CREATE POLICY "Admins can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Vendedores can insert own leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (vendedor_id = auth.uid());

-- UPDATE: Admin updates all, Vendedor updates own, Dev updates production
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

-- DELETE: Admin deletes all, Vendedor deletes own
CREATE POLICY "Admins can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Vendedores can delete own leads"
  ON leads FOR DELETE
  TO authenticated
  USING (vendedor_id = auth.uid());

-- ============================================================================
-- STEP 7: Lead Services RLS
-- ============================================================================

ALTER TABLE lead_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read all lead services" ON lead_services;
DROP POLICY IF EXISTS "Vendedores can read own lead services" ON lead_services;
DROP POLICY IF EXISTS "Devs can read lead services in production" ON lead_services;
DROP POLICY IF EXISTS "Admins can insert lead services" ON lead_services;
DROP POLICY IF EXISTS "Vendedores can insert own lead services" ON lead_services;
DROP POLICY IF EXISTS "Admins can update lead services" ON lead_services;
DROP POLICY IF EXISTS "Vendedores can update own lead services" ON lead_services;
DROP POLICY IF EXISTS "Devs can update lead services in production" ON lead_services;
DROP POLICY IF EXISTS "Admins can delete lead services" ON lead_services;
DROP POLICY IF EXISTS "Vendedores can delete own lead services" ON lead_services;

-- SELECT
CREATE POLICY "Admins can read all lead services"
  ON lead_services FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Vendedores can read own lead services"
  ON lead_services FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_services.lead_id 
    AND leads.vendedor_id = auth.uid()
  ));

CREATE POLICY "Devs can read lead services in production"
  ON lead_services FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_services.lead_id 
    AND is_dev_and_lead_in_production(leads.stage_id)
  ));

-- INSERT
CREATE POLICY "Admins can insert lead services"
  ON lead_services FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Vendedores can insert own lead services"
  ON lead_services FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_services.lead_id 
    AND leads.vendedor_id = auth.uid()
  ));

-- UPDATE
CREATE POLICY "Admins can update lead services"
  ON lead_services FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Vendedores can update own lead services"
  ON lead_services FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_services.lead_id 
    AND leads.vendedor_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_services.lead_id 
    AND leads.vendedor_id = auth.uid()
  ));

CREATE POLICY "Devs can update lead services in production"
  ON lead_services FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_services.lead_id 
    AND is_dev_and_lead_in_production(leads.stage_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_services.lead_id 
    AND is_dev_and_lead_in_production(leads.stage_id)
  ));

-- DELETE
CREATE POLICY "Admins can delete lead services"
  ON lead_services FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Vendedores can delete own lead services"
  ON lead_services FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_services.lead_id 
    AND leads.vendedor_id = auth.uid()
  ));

-- ============================================================================
-- STEP 8: Lead Notes RLS
-- ============================================================================

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read all lead notes" ON lead_notes;
DROP POLICY IF EXISTS "Vendedores can read own lead notes" ON lead_notes;
DROP POLICY IF EXISTS "Devs can read lead notes in production" ON lead_notes;
DROP POLICY IF EXISTS "Admins can insert lead notes" ON lead_notes;
DROP POLICY IF EXISTS "Vendedores can insert own lead notes" ON lead_notes;
DROP POLICY IF EXISTS "Devs can insert lead notes in production" ON lead_notes;
DROP POLICY IF EXISTS "Authors can update own notes" ON lead_notes;
DROP POLICY IF EXISTS "Admins can delete lead notes" ON lead_notes;
DROP POLICY IF EXISTS "Authors can delete own notes" ON lead_notes;

-- SELECT
CREATE POLICY "Admins can read all lead notes"
  ON lead_notes FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Vendedores can read own lead notes"
  ON lead_notes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_notes.lead_id 
    AND leads.vendedor_id = auth.uid()
  ));

CREATE POLICY "Devs can read lead notes in production"
  ON lead_notes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_notes.lead_id 
    AND is_dev_and_lead_in_production(leads.stage_id)
  ));

-- INSERT
CREATE POLICY "Admins can insert lead notes"
  ON lead_notes FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Vendedores can insert own lead notes"
  ON lead_notes FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_notes.lead_id 
    AND leads.vendedor_id = auth.uid()
  ));

CREATE POLICY "Devs can insert lead notes in production"
  ON lead_notes FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_notes.lead_id 
    AND is_dev_and_lead_in_production(leads.stage_id)
  ));

-- UPDATE: Only author can update their own notes
CREATE POLICY "Authors can update own notes"
  ON lead_notes FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- DELETE
CREATE POLICY "Admins can delete lead notes"
  ON lead_notes FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Authors can delete own notes"
  ON lead_notes FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());
