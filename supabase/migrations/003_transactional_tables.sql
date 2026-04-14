-- ============================================================
-- Migration 003: Transactional tables
-- licenses, cases, case_activity_log, contributor_payouts
-- ============================================================

-- ------------------------------------------------------------
-- License number sequence — AT-{YEAR}-{SEQUENCE}
-- Resets each calendar year via the trigger below.
-- ------------------------------------------------------------
CREATE SEQUENCE license_seq START 1;

-- ------------------------------------------------------------
-- Licenses
-- ------------------------------------------------------------
CREATE TABLE licenses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_number    TEXT NOT NULL UNIQUE,       -- AT-2026-0001
  buyer_id          UUID NOT NULL REFERENCES buyers(id) ON DELETE RESTRICT,
  font_id           UUID NOT NULL REFERENCES fonts(id) ON DELETE RESTRICT,
  purchase_date     DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Financials — all stored in MVR
  invoice_amount    NUMERIC(12,2) NOT NULL,     -- Total incl. GST
  gst_amount        NUMERIC(12,2) NOT NULL,     -- Auto-calculated
  akuru_share       NUMERIC(12,2) NOT NULL,     -- Platform's cut excl. GST
  contributor_share NUMERIC(12,2) NOT NULL,     -- Contributor's cut excl. GST

  payment_status    payment_status NOT NULL DEFAULT 'pending',

  -- Fine fields
  is_fine           BOOLEAN NOT NULL DEFAULT false,
  fine_amount       NUMERIC(12,2),              -- NULL unless is_fine = true

  -- Linkage
  case_id           UUID,                       -- FK added after cases table exists
  qb_synced         BOOLEAN NOT NULL DEFAULT false,
  source            license_source NOT NULL DEFAULT 'direct_sale',

  -- Payout tracking
  paid_to_contributor BOOLEAN NOT NULL DEFAULT false,
  payout_id           UUID,                    -- FK added after payouts table exists

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX licenses_buyer_idx    ON licenses(buyer_id);
CREATE INDEX licenses_font_idx     ON licenses(font_id);
CREATE INDEX licenses_case_idx     ON licenses(case_id);
CREATE INDEX licenses_date_idx     ON licenses(purchase_date DESC);
CREATE INDEX licenses_source_idx   ON licenses(source);

CREATE TRIGGER licenses_updated_at
  BEFORE UPDATE ON licenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Case number sequence — CASE-{YEAR}-{SEQUENCE}
-- ------------------------------------------------------------
CREATE SEQUENCE case_seq START 1;

-- ------------------------------------------------------------
-- Cases
-- ------------------------------------------------------------
CREATE TABLE cases (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number      TEXT NOT NULL UNIQUE,        -- CASE-2026-0001
  title            TEXT NOT NULL,
  status           case_status NOT NULL DEFAULT 'identified',
  priority         case_priority NOT NULL DEFAULT 'medium',

  identified_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  identified_by    UUID,                        -- FK → users added after users table

  buyer_id         UUID REFERENCES buyers(id) ON DELETE SET NULL,
  font_id          UUID NOT NULL REFERENCES fonts(id) ON DELETE RESTRICT,

  usage_context    usage_context,
  usage_description TEXT,

  -- Election case fields
  constituency     TEXT,
  party            TEXT,

  -- Resolution
  resolution_type  resolution_type,
  resolved_date    DATE,
  dismissal_reason TEXT,                        -- Mandatory when status = dismissed
  license_id       UUID REFERENCES licenses(id) ON DELETE SET NULL,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cases_status_idx   ON cases(status);
CREATE INDEX cases_font_idx     ON cases(font_id);
CREATE INDEX cases_buyer_idx    ON cases(buyer_id);
CREATE INDEX cases_date_idx     ON cases(identified_date DESC);
CREATE INDEX cases_priority_idx ON cases(priority);
CREATE INDEX cases_party_idx    ON cases(party);

-- Full-text search across title and description
CREATE INDEX cases_search_idx ON cases
  USING GIN (to_tsvector('english', title || ' ' || COALESCE(usage_description, '')));

CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Case Activity Log
-- ------------------------------------------------------------
CREATE TABLE case_activity_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id        UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id        UUID,                          -- FK → users added after users table
  activity_type  activity_type NOT NULL,
  old_value      TEXT,
  new_value      TEXT,
  comment        TEXT,
  attachment_url TEXT,                          -- Supabase Storage URL for evidence
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX activity_case_idx ON case_activity_log(case_id);
CREATE INDEX activity_user_idx ON case_activity_log(user_id);
CREATE INDEX activity_date_idx ON case_activity_log(created_at DESC);

-- ------------------------------------------------------------
-- Contributor Payouts
-- ------------------------------------------------------------
CREATE TABLE contributor_payouts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id      UUID NOT NULL REFERENCES contributors(id) ON DELETE RESTRICT,
  payout_date         DATE NOT NULL,
  amount              NUMERIC(12,2) NOT NULL,
  period_description  TEXT NOT NULL,            -- e.g. "January 2026", "Nov-Dec 2025"
  invoice_number      TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payouts_contributor_idx ON contributor_payouts(contributor_id);
CREATE INDEX payouts_date_idx        ON contributor_payouts(payout_date DESC);

-- Now that both tables exist, add the cross-FK from licenses → payouts
ALTER TABLE licenses
  ADD CONSTRAINT licenses_payout_fk
  FOREIGN KEY (payout_id) REFERENCES contributor_payouts(id) ON DELETE SET NULL;
