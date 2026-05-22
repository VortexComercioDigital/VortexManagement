/*
  # Create CRM Database Schema

  1. New Tables
    - `profiles` - Extends auth.users with role-based access (admin, vendedor, dev)
    - `kanban_stages` - Pipeline stages for the Kanban board (Prospecção, Reunião, Proposta, Negociação, Fechado, Perdido)
    - `services_catalog` - Catalog of digital services offered (Sites, Landing Pages, Design, Sistemas, etc.)
    - `leads` - Prospected clients with contact info, assigned vendedor, and current stage
    - `lead_services` - Pivot table linking leads to services with negotiated pricing and delivery status
    - `lead_notes` - Interaction notes/meeting history for each lead

  2. Security
    - Enable RLS on ALL tables
    - Profiles: users can read/update own profile; admins can read all
    - Kanban stages: readable by all authenticated users; writable by admins only
    - Services catalog: readable by all authenticated; writable by admins only
    - Leads: admins see all; vendedores see own leads; devs see leads in production stages
    - Lead services: same access as parent lead
    - Lead notes: same access as parent lead

  3. Important Notes
    - Default kanban stages are seeded automatically
    - Profiles are auto-created via trigger when a new user signs up
    - All timestamps use timestamptz with DEFAULT now()
*/

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'vendedor' CHECK (role IN ('admin', 'vendedor', 'dev')),
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- KANBAN STAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS kanban_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6b7280',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE kanban_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stages"
  ON kanban_stages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert stages"
  ON kanban_stages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update stages"
  ON kanban_stages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete stages"
  ON kanban_stages FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed default stages
INSERT INTO kanban_stages (name, position, color) VALUES
  ('Prospecção', 1, '#3b82f6'),
  ('Reunião', 2, '#f59e0b'),
  ('Proposta', 3, '#8b5cf6'),
  ('Negociação', 4, '#f97316'),
  ('Fechado', 5, '#10b981'),
  ('Perdido', 6, '#ef4444')
ON CONFLICT DO NOTHING;

-- ============================================
-- SERVICES CATALOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS services_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'outros' CHECK (category IN ('site', 'landing_page', 'design', 'sistema', 'seo', 'social_media', 'outros')),
  base_price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE services_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read services catalog"
  ON services_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert services"
  ON services_catalog FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update services"
  ON services_catalog FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete services"
  ON services_catalog FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed default services
INSERT INTO services_catalog (name, description, category, base_price) VALUES
  ('Site Institucional', 'Site completo com até 5 páginas', 'site', 3500.00),
  ('Landing Page', 'Página de conversão otimizada', 'landing_page', 1800.00),
  ('Design de Identidade Visual', 'Logo + manual de marca', 'design', 2500.00),
  ('Sistema Web', 'Sistema sob medida com painel admin', 'sistema', 8000.00),
  ('SEO Otimização', 'Otimização para mecanismos de busca', 'seo', 1200.00),
  ('Gestão de Redes Sociais', 'Planejamento e criação de conteúdo', 'social_media', 1500.00)
ON CONFLICT DO NOTHING;

-- ============================================
-- LEADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  stage_id uuid NOT NULL REFERENCES kanban_stages(id) ON DELETE RESTRICT,
  vendedor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  value numeric(10,2) DEFAULT 0,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is dev and lead is in production stage
CREATE OR REPLACE FUNCTION is_dev_and_lead_in_production(check_stage_id uuid)
RETURNS boolean AS $$
DECLARE
  user_role text;
  stage_name text;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
  IF user_role != 'dev' THEN RETURN false; END IF;

  SELECT name INTO stage_name FROM kanban_stages WHERE id = check_stage_id;
  RETURN stage_name IN ('Proposta', 'Negociação', 'Fechado');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY "Admins can read all leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Vendedores can read own leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    vendedor_id = auth.uid()
  );

CREATE POLICY "Devs can read leads in production stages"
  ON leads FOR SELECT
  TO authenticated
  USING (
    is_dev_and_lead_in_production(stage_id)
  );

CREATE POLICY "Admins can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Vendedores can insert own leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    vendedor_id = auth.uid()
  );

CREATE POLICY "Admins can update all leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Vendedores can update own leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (vendedor_id = auth.uid())
  WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "Devs can update leads in production"
  ON leads FOR UPDATE
  TO authenticated
  USING (is_dev_and_lead_in_production(stage_id))
  WITH CHECK (is_dev_and_lead_in_production(stage_id));

CREATE POLICY "Admins can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Vendedores can delete own leads"
  ON leads FOR DELETE
  TO authenticated
  USING (vendedor_id = auth.uid());

-- ============================================
-- LEAD SERVICES TABLE (Pivot)
-- ============================================
CREATE TABLE IF NOT EXISTS lead_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services_catalog(id) ON DELETE RESTRICT,
  negotiated_price numeric(10,2) NOT NULL DEFAULT 0,
  delivery_status text NOT NULL DEFAULT 'pendente' CHECK (delivery_status IN ('pendente', 'em_desenvolvimento', 'em_revisao', 'concluido', 'cancelado')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, service_id)
);

ALTER TABLE lead_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all lead services"
  ON lead_services FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

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
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_services.lead_id AND leads.vendedor_id = auth.uid())
  );

CREATE POLICY "Admins can update lead services"
  ON lead_services FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

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
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Vendedores can delete own lead services"
  ON lead_services FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_services.lead_id AND leads.vendedor_id = auth.uid())
  );

-- ============================================
-- LEAD NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  content text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all lead notes"
  ON lead_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

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
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_notes.lead_id AND leads.vendedor_id = auth.uid())
    OR is_dev_and_lead_in_production((SELECT stage_id FROM leads WHERE leads.id = lead_notes.lead_id))
  );

CREATE POLICY "Authors can update own notes"
  ON lead_notes FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Admins can delete lead notes"
  ON lead_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authors can delete own notes"
  ON lead_notes FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_vendedor_id ON leads(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_lead_services_lead_id ON lead_services(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_services_service_id ON lead_services(service_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_leads ON leads;
CREATE TRIGGER set_updated_at_leads
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_lead_services ON lead_services;
CREATE TRIGGER set_updated_at_lead_services
  BEFORE UPDATE ON lead_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_services_catalog ON services_catalog;
CREATE TRIGGER set_updated_at_services_catalog
  BEFORE UPDATE ON services_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
