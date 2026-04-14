-- ============================================================
-- Migration 005: Business logic functions and triggers
-- ============================================================

-- ------------------------------------------------------------
-- License number generator: AT-{YEAR}-{PADDED_SEQ}
-- Resets the sequence counter each new calendar year.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_license_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT := to_char(now(), 'YYYY');
  last_year    TEXT;
  next_seq     INT;
BEGIN
  -- Check if the last license was from a different year
  SELECT to_char(created_at, 'YYYY') INTO last_year
  FROM licenses
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_year IS DISTINCT FROM current_year THEN
    -- New year — reset sequence
    ALTER SEQUENCE license_seq RESTART WITH 1;
  END IF;

  next_seq := nextval('license_seq');
  NEW.license_number := 'AT-' || current_year || '-' || LPAD(next_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_license_insert
  BEFORE INSERT ON licenses
  FOR EACH ROW
  WHEN (NEW.license_number IS NULL OR NEW.license_number = '')
  EXECUTE FUNCTION generate_license_number();

-- ------------------------------------------------------------
-- Case number generator: CASE-{YEAR}-{PADDED_SEQ}
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT := to_char(now(), 'YYYY');
  last_year    TEXT;
  next_seq     INT;
BEGIN
  SELECT to_char(created_at, 'YYYY') INTO last_year
  FROM cases
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_year IS DISTINCT FROM current_year THEN
    ALTER SEQUENCE case_seq RESTART WITH 1;
  END IF;

  next_seq := nextval('case_seq');
  NEW.case_number := 'CASE-' || current_year || '-' || LPAD(next_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_case_insert
  BEFORE INSERT ON cases
  FOR EACH ROW
  WHEN (NEW.case_number IS NULL OR NEW.case_number = '')
  EXECUTE FUNCTION generate_case_number();

-- ------------------------------------------------------------
-- Financial auto-calculation on license insert/update
-- Derives gst_amount, akuru_share, contributor_share from the
-- font's configuration and the invoice_amount.
-- Fine amounts are treated as GST-inclusive (back-calculated).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_license_financials()
RETURNS TRIGGER AS $$
DECLARE
  v_gst_rate           NUMERIC;
  v_contributor_pct    NUMERIC;
  v_base_excl_gst      NUMERIC;
BEGIN
  -- Fetch font financial config
  SELECT gst_rate, contributor_share_pct
  INTO v_gst_rate, v_contributor_pct
  FROM fonts
  WHERE id = NEW.font_id;

  -- invoice_amount is always GST-inclusive (whether standard or fine)
  -- Back-calculate the ex-GST base
  v_base_excl_gst := NEW.invoice_amount / (1 + v_gst_rate);

  NEW.gst_amount        := NEW.invoice_amount - v_base_excl_gst;
  NEW.contributor_share := v_base_excl_gst * (v_contributor_pct / 100);
  NEW.akuru_share       := v_base_excl_gst * ((100 - v_contributor_pct) / 100);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_license_financials
  BEFORE INSERT OR UPDATE OF invoice_amount, font_id ON licenses
  FOR EACH ROW EXECUTE FUNCTION calculate_license_financials();

-- ------------------------------------------------------------
-- Auto-log status changes on cases to the activity log
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_case_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO case_activity_log (
      case_id,
      user_id,
      activity_type,
      old_value,
      new_value
    ) VALUES (
      NEW.id,
      auth.uid(),
      'status_change',
      OLD.status::TEXT,
      NEW.status::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_case_status_change
  AFTER UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION log_case_status_change();

-- ------------------------------------------------------------
-- Buyer search function: fuzzy name match for dedup warnings
-- Returns buyers whose names are similar to the input.
-- Called from the UI before saving a new buyer.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_similar_buyers(search_name TEXT)
RETURNS TABLE (
  id           UUID,
  name         TEXT,
  organization TEXT,
  buyer_type   buyer_type,
  similarity   REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.organization,
    b.buyer_type,
    similarity(lower(b.name), lower(search_name)) AS similarity
  FROM buyers b
  WHERE similarity(lower(b.name), lower(search_name)) > 0.3
  ORDER BY similarity DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable the pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ------------------------------------------------------------
-- License registry lookup: given a buyer and font, find
-- any existing active licenses — used in Verify License step.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION find_buyer_licenses(
  p_buyer_id UUID,
  p_font_id  UUID DEFAULT NULL
)
RETURNS TABLE (
  license_id     UUID,
  license_number TEXT,
  font_name      TEXT,
  purchase_date  DATE,
  invoice_amount NUMERIC,
  payment_status payment_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.license_number,
    f.name,
    l.purchase_date,
    l.invoice_amount,
    l.payment_status
  FROM licenses l
  JOIN fonts f ON f.id = l.font_id
  WHERE l.buyer_id = p_buyer_id
    AND (p_font_id IS NULL OR l.font_id = p_font_id)
  ORDER BY l.purchase_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- Contributor balance view:
-- outstanding amount owed to each contributor
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW contributor_balances AS
SELECT
  c.id AS contributor_id,
  c.name AS contributor_name,
  COALESCE(SUM(l.contributor_share) FILTER (WHERE l.payment_status = 'paid'), 0) AS total_earned,
  COALESCE(SUM(p.amount), 0) AS total_paid_out,
  COALESCE(SUM(l.contributor_share) FILTER (WHERE l.payment_status = 'paid'), 0)
    - COALESCE(SUM(p.amount), 0) AS balance_owed
FROM contributors c
LEFT JOIN fonts f ON f.contributor_id = c.id
LEFT JOIN licenses l ON l.font_id = f.id
LEFT JOIN contributor_payouts p ON p.contributor_id = c.id
GROUP BY c.id, c.name;
