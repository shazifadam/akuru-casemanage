-- ============================================================
-- Migration 006: Seed data
-- Contributors (6) and Fonts (9) from the PRD catalog.
-- Run ONCE after all schema migrations.
-- ============================================================

-- ------------------------------------------------------------
-- Contributors
-- ------------------------------------------------------------
INSERT INTO contributors (id, name, contact_email, share_percentage, status) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Maumoon Foundation',     NULL, 60.00, 'active'),
  ('11111111-0000-0000-0000-000000000002', 'Abo (Dhivehi Type)',      NULL, 80.00, 'active'),
  ('11111111-0000-0000-0000-000000000003', 'Easa Shareef',           NULL, 80.00, 'active'),
  ('11111111-0000-0000-0000-000000000004', 'Ibrahim Shareef',        NULL, 80.00, 'active'),
  ('11111111-0000-0000-0000-000000000005', 'Hasan Shazil',           NULL, 80.00, 'active'),
  ('11111111-0000-0000-0000-000000000006', 'Hussain Waheedh (Huseyna)', NULL, 80.00, 'active');

-- ------------------------------------------------------------
-- Fonts
-- contributor_share_pct = the % the contributor receives of ex-GST revenue
--
-- Maumoon: 60% contributor / 40% Akuru Type  (inverted model)
-- All others: 80% contributor / 20% Akuru Type
-- ------------------------------------------------------------
INSERT INTO fonts (id, name, contributor_id, base_price, contributor_share_pct, commission_model, gst_rate, status) VALUES
  (
    '22222222-0000-0000-0000-000000000001',
    'Maumoon',
    '11111111-0000-0000-0000-000000000001',
    3000.00,
    60.00,                -- Maumoon special case: contributor gets 60%
    'akuru_designed',
    0.0800,
    'active'
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    'Roanu',
    '11111111-0000-0000-0000-000000000006',
    4050.00,
    80.00,
    'contributor_owned',
    0.0800,
    'active'
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    'Faslu',
    '11111111-0000-0000-0000-000000000002',
    1500.00,
    80.00,
    'contributor_owned',
    0.0800,
    'active'
  ),
  (
    '22222222-0000-0000-0000-000000000004',
    'Malas',
    '11111111-0000-0000-0000-000000000002',
    1500.00,
    80.00,
    'contributor_owned',
    0.0800,
    'active'
  ),
  (
    '22222222-0000-0000-0000-000000000005',
    'Easa Wondermarker',
    '11111111-0000-0000-0000-000000000003',
    1350.00,
    80.00,
    'contributor_owned',
    0.0800,
    'active'
  ),
  (
    '22222222-0000-0000-0000-000000000006',
    'Easa Zamaanee',
    '11111111-0000-0000-0000-000000000003',
    1350.00,
    80.00,
    'contributor_owned',
    0.0800,
    'active'
  ),
  (
    '22222222-0000-0000-0000-000000000007',
    'Easa Suruhee',
    '11111111-0000-0000-0000-000000000003',
    1350.00,
    80.00,
    'contributor_owned',
    0.0800,
    'active'
  ),
  (
    '22222222-0000-0000-0000-000000000008',
    'Dhi Nathu',
    '11111111-0000-0000-0000-000000000004',
    1280.00,
    80.00,
    'contributor_owned',
    0.0800,
    'active'
  ),
  (
    '22222222-0000-0000-0000-000000000009',
    'Sangu Suruhee Outline',
    '11111111-0000-0000-0000-000000000005',
    2700.00,
    80.00,
    'contributor_owned',
    0.0800,
    'active'
  );
