-- ============================================================
-- Migration 009: Security hardening
-- ============================================================
-- Fixes:
--   1. Self-role escalation via "Users: update own" RLS policy
--   2. Financial column CHECK constraints
--   3. License audit log + trigger
--   4. contributor_balances view with security_invoker
--   5. fine_amount / is_fine consistency constraint
--   6. Unique buyer/contributor email (nullable-aware)
-- ============================================================

-- ── 1. Fix self-role-escalation RLS policy ────────────────────────────────────
-- The old policy had no WITH CHECK and no column restriction,
-- allowing any user to UPDATE their own role to 'admin'.

DROP POLICY IF EXISTS "Users: update own" ON users;

CREATE POLICY "Users: update own profile" ON users
  FOR UPDATE
  USING  (id = auth.uid())
  WITH CHECK (
    -- User can only update their own row…
    id = auth.uid()
    -- …and the role column must not change
    AND role = (SELECT role FROM users WHERE id = auth.uid())
  );

-- ── 2. Financial column CHECK constraints ─────────────────────────────────────

-- fonts
ALTER TABLE fonts
  ADD CONSTRAINT fonts_contributor_share_pct_range
    CHECK (contributor_share_pct >= 0 AND contributor_share_pct <= 100),
  ADD CONSTRAINT fonts_gst_rate_range
    CHECK (gst_rate >= 0 AND gst_rate < 1),
  ADD CONSTRAINT fonts_base_price_positive
    CHECK (base_price > 0);

-- contributors
ALTER TABLE contributors
  ADD CONSTRAINT contributors_share_pct_range
    CHECK (share_percentage >= 0 AND share_percentage <= 100);

-- licenses
ALTER TABLE licenses
  ADD CONSTRAINT licenses_invoice_positive
    CHECK (invoice_amount > 0),
  ADD CONSTRAINT licenses_fine_consistency
    CHECK (
      (is_fine = true  AND fine_amount IS NOT NULL AND fine_amount > 0)
      OR
      (is_fine = false AND fine_amount IS NULL)
    );

-- contributor_payouts
ALTER TABLE contributor_payouts
  ADD CONSTRAINT payouts_amount_positive
    CHECK (amount > 0);

-- ── 3. License audit log table & trigger ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS license_audit_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id   UUID        NOT NULL,
  changed_by   UUID,                    -- auth.uid() at the time of change
  operation    TEXT        NOT NULL,    -- INSERT | UPDATE | DELETE
  old_data     JSONB,
  new_data     JSONB,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only: no UPDATE or DELETE on audit rows
ALTER TABLE license_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit: admin read" ON license_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- No INSERT policy via PostgREST — only the trigger (SECURITY DEFINER) writes here.

CREATE OR REPLACE FUNCTION audit_license_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO license_audit_log (license_id, changed_by, operation, old_data, new_data)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS license_audit ON licenses;
CREATE TRIGGER license_audit
  AFTER INSERT OR UPDATE OR DELETE ON licenses
  FOR EACH ROW EXECUTE FUNCTION audit_license_change();

-- Also audit contributor_payouts (financial writes)
CREATE TABLE IF NOT EXISTS payout_audit_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id      UUID        NOT NULL,
  changed_by     UUID,
  operation      TEXT        NOT NULL,
  old_data       JSONB,
  new_data       JSONB,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payout_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payout audit: admin read" ON payout_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION audit_payout_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO payout_audit_log (payout_id, changed_by, operation, old_data, new_data)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS payout_audit ON contributor_payouts;
CREATE TRIGGER payout_audit
  AFTER INSERT OR UPDATE OR DELETE ON contributor_payouts
  FOR EACH ROW EXECUTE FUNCTION audit_payout_change();

-- ── 4. contributor_balances view — enforce security_invoker ───────────────────
-- Rebuild the view with SECURITY INVOKER so RLS on underlying tables applies
-- to the querying user, not the view owner.

DROP VIEW IF EXISTS contributor_balances;

CREATE VIEW contributor_balances
  WITH (security_invoker = true)
AS
SELECT
  c.id               AS contributor_id,
  c.name             AS contributor_name,
  COALESCE(earned.total_earned,    0) AS total_earned,
  COALESCE(paid.total_paid_out,    0) AS total_paid_out,
  COALESCE(earned.total_earned, 0)
    - COALESCE(paid.total_paid_out, 0) AS balance_owed
FROM contributors c
LEFT JOIN (
  SELECT
    f.contributor_id,
    SUM(l.contributor_share) AS total_earned
  FROM fonts f
  JOIN licenses l ON l.font_id = f.id
  WHERE l.payment_status = 'paid'
  GROUP BY f.contributor_id
) earned ON earned.contributor_id = c.id
LEFT JOIN (
  SELECT
    contributor_id,
    SUM(amount) AS total_paid_out
  FROM contributor_payouts
  GROUP BY contributor_id
) paid ON paid.contributor_id = c.id;

-- ── 5. Unique email constraints (nullable-aware) ──────────────────────────────
-- PostgreSQL treats each NULL as distinct, so a partial unique index
-- (WHERE email IS NOT NULL) gives uniqueness only on non-null values.

CREATE UNIQUE INDEX IF NOT EXISTS buyers_email_unique
  ON buyers (email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contributors_email_unique
  ON contributors (contact_email)
  WHERE contact_email IS NOT NULL;

-- ── 6. SECURITY DEFINER functions: lock down search_path ─────────────────────
-- Prevent search_path injection on existing trigger functions.

ALTER FUNCTION handle_new_user()            SET search_path = public;
ALTER FUNCTION log_case_status_change()     SET search_path = public;
ALTER FUNCTION before_license_financials()  SET search_path = public;
