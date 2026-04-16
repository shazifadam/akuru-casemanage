-- ============================================================
-- Migration 008: Fix contributor_balances view
--
-- The previous view joined contributors → fonts → licenses → payouts
-- in a single flat join. When a contributor has both multiple licenses
-- AND multiple payouts the Cartesian product inflates every SUM by the
-- wrong multiplier, producing incorrect totals.
--
-- Fix: pre-aggregate each side (earned vs paid-out) in separate
-- sub-selects before joining, so each row is counted exactly once.
-- ============================================================

CREATE OR REPLACE VIEW contributor_balances AS
SELECT
  c.id   AS contributor_id,
  c.name AS contributor_name,

  -- Total earned = sum of contributor_share on PAID licenses only
  COALESCE(earned.total_earned,   0) AS total_earned,

  -- Total paid out = sum of recorded payout amounts
  COALESCE(paid.total_paid_out,   0) AS total_paid_out,

  -- Balance owed = what has been earned but not yet paid out
  COALESCE(earned.total_earned, 0) - COALESCE(paid.total_paid_out, 0) AS balance_owed

FROM contributors c

-- Pre-aggregate license earnings per contributor
LEFT JOIN (
  SELECT
    f.contributor_id,
    SUM(l.contributor_share) AS total_earned
  FROM fonts f
  JOIN licenses l ON l.font_id = f.id
  WHERE l.payment_status = 'paid'
  GROUP BY f.contributor_id
) earned ON earned.contributor_id = c.id

-- Pre-aggregate payouts per contributor
LEFT JOIN (
  SELECT
    contributor_id,
    SUM(amount) AS total_paid_out
  FROM contributor_payouts
  GROUP BY contributor_id
) paid ON paid.contributor_id = c.id;
