-- ============================================================
-- Migration 002: Core tables — contributors, fonts, buyers
-- ============================================================

-- ------------------------------------------------------------
-- Contributors
-- ------------------------------------------------------------
CREATE TABLE contributors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  contact_email TEXT,
  -- Default share percentage (can be overridden per-font)
  share_percentage NUMERIC(5,2) NOT NULL DEFAULT 80.00,
  status        contributor_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Fonts
-- ------------------------------------------------------------
CREATE TABLE fonts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  contributor_id   UUID NOT NULL REFERENCES contributors(id) ON DELETE RESTRICT,
  base_price       NUMERIC(10,2) NOT NULL,
  -- Per-font split: contributor gets this %, platform gets (100 - contributor_share_pct) %
  -- This allows the Maumoon special case (60% contributor / 40% Akuru Type)
  contributor_share_pct NUMERIC(5,2) NOT NULL,
  commission_model commission_model NOT NULL,
  gst_rate         NUMERIC(5,4) NOT NULL DEFAULT 0.0800, -- 8%
  status           font_status NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Buyers (contact registry)
-- ------------------------------------------------------------
CREATE TABLE buyers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  email        TEXT,
  organization TEXT,
  buyer_type   buyer_type NOT NULL DEFAULT 'individual',
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fuzzy name search / dedup checks
CREATE INDEX buyers_name_idx ON buyers USING GIN (to_tsvector('english', name));
CREATE INDEX buyers_org_idx  ON buyers USING GIN (to_tsvector('english', COALESCE(organization, '')));

-- Triggers to keep updated_at current
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contributors_updated_at
  BEFORE UPDATE ON contributors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER fonts_updated_at
  BEFORE UPDATE ON fonts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER buyers_updated_at
  BEFORE UPDATE ON buyers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
