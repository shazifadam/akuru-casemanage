-- ============================================================
-- Migration 004: Users table + Row-Level Security
-- ============================================================

-- ------------------------------------------------------------
-- Users (extends Supabase auth.users)
-- ------------------------------------------------------------
CREATE TABLE users (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role      user_role NOT NULL DEFAULT 'enforcer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create a users row when a new auth.users record is inserted
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'enforcer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Now add the deferred FKs that reference users
ALTER TABLE cases
  ADD CONSTRAINT cases_identified_by_fk
  FOREIGN KEY (identified_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE case_activity_log
  ADD CONSTRAINT activity_user_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- Helper: check if the current user is an admin
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Row-Level Security
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fonts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases              ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_activity_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_payouts ENABLE ROW LEVEL SECURITY;

-- ---- users ----
-- Anyone authenticated can read their own row; admins can read all
CREATE POLICY "Users: read own or admin reads all" ON users
  FOR SELECT USING (id = auth.uid() OR is_admin());

-- Only admins can update roles; users can update their own full_name
CREATE POLICY "Users: update own" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users: admin full access" ON users
  FOR ALL USING (is_admin());

-- ---- contributors ----
-- All authenticated users can read; only admins can write
CREATE POLICY "Contributors: authenticated read" ON contributors
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Contributors: admin write" ON contributors
  FOR ALL USING (is_admin());

-- ---- fonts ----
CREATE POLICY "Fonts: authenticated read" ON fonts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Fonts: admin write" ON fonts
  FOR ALL USING (is_admin());

-- ---- buyers ----
-- All authenticated users can read and create buyers;
-- only admins can delete (merge is handled via update + delete)
CREATE POLICY "Buyers: authenticated read" ON buyers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Buyers: authenticated insert" ON buyers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Buyers: authenticated update" ON buyers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Buyers: admin delete" ON buyers
  FOR DELETE USING (is_admin());

-- ---- licenses ----
CREATE POLICY "Licenses: authenticated read" ON licenses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Licenses: authenticated insert" ON licenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Licenses: authenticated update" ON licenses
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Licenses: admin delete" ON licenses
  FOR DELETE USING (is_admin());

-- ---- cases ----
CREATE POLICY "Cases: authenticated read" ON cases
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Cases: authenticated insert" ON cases
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Cases: authenticated update" ON cases
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Cases: admin delete" ON cases
  FOR DELETE USING (is_admin());

-- ---- case_activity_log ----
-- All authenticated users can read and append; no updates or deletes (audit trail)
CREATE POLICY "Activity: authenticated read" ON case_activity_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Activity: authenticated insert" ON case_activity_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ---- contributor_payouts ----
-- Only admins can manage payouts
CREATE POLICY "Payouts: authenticated read" ON contributor_payouts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Payouts: admin write" ON contributor_payouts
  FOR ALL USING (is_admin());
