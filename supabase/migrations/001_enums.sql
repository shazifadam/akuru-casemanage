-- ============================================================
-- Migration 001: Enums
-- Run this first — all subsequent tables depend on these types.
-- ============================================================

-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'enforcer');

-- Font commission models
CREATE TYPE commission_model AS ENUM ('contributor_owned', 'akuru_designed');

-- Font status
CREATE TYPE font_status AS ENUM ('active', 'discontinued');

-- Contributor status
CREATE TYPE contributor_status AS ENUM ('active', 'inactive');

-- Buyer type
CREATE TYPE buyer_type AS ENUM ('individual', 'organization', 'government', 'political_party');

-- License payment status
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue');

-- License source
CREATE TYPE license_source AS ENUM ('direct_sale', 'enforcement', 'election_case');

-- Case status pipeline
CREATE TYPE case_status AS ENUM (
  'identified',
  'verify_license',
  'license_verified',
  'converted',
  'fined',
  'dismissed'
);

-- Case priority
CREATE TYPE case_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Usage context
CREATE TYPE usage_context AS ENUM (
  'social_media',
  'campaign_material',
  'government_doc',
  'commercial_product',
  'website',
  'print_media',
  'other'
);

-- Case resolution type
CREATE TYPE resolution_type AS ENUM (
  'purchased',
  'fined',
  'dismissed',
  'already_licensed'
);

-- Case activity type
CREATE TYPE activity_type AS ENUM (
  'status_change',
  'comment',
  'evidence_added',
  'buyer_linked',
  'license_issued',
  'assignment_change'
);
