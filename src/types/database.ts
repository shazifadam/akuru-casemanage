// Auto-maintained TypeScript types matching the Supabase schema.
// Update these when migrations change the schema.

export type UserRole = "admin" | "enforcer";
export type CommissionModel = "contributor_owned" | "akuru_designed";
export type FontStatus = "active" | "discontinued";
export type ContributorStatus = "active" | "inactive";
export type BuyerType = "individual" | "organization" | "government" | "political_party";
export type PaymentStatus = "pending" | "paid" | "overdue";
export type LicenseSource = "direct_sale" | "enforcement" | "election_case";
export type CaseStatus =
  | "identified"
  | "verify_license"
  | "license_verified"
  | "converted"
  | "fined"
  | "dismissed";
export type CasePriority = "low" | "medium" | "high" | "critical";
export type UsageContext =
  | "social_media"
  | "campaign_material"
  | "government_doc"
  | "commercial_product"
  | "website"
  | "print_media"
  | "other";
export type ResolutionType = "purchased" | "fined" | "dismissed" | "already_licensed";
export type ActivityType =
  | "status_change"
  | "comment"
  | "evidence_added"
  | "buyer_linked"
  | "license_issued"
  | "assignment_change";

// ---- Table row types ----

export interface DbUser {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface DbContributor {
  id: string;
  name: string;
  contact_email: string | null;
  share_percentage: number;
  status: ContributorStatus;
  created_at: string;
  updated_at: string;
}

export interface DbFont {
  id: string;
  name: string;
  contributor_id: string;
  base_price: number;
  contributor_share_pct: number;
  commission_model: CommissionModel;
  gst_rate: number;
  status: FontStatus;
  created_at: string;
  updated_at: string;
}

export interface DbBuyer {
  id: string;
  name: string;
  email: string | null;
  organization: string | null;
  buyer_type: BuyerType;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbLicense {
  id: string;
  license_number: string;
  buyer_id: string;
  font_id: string;
  purchase_date: string;
  invoice_amount: number;
  gst_amount: number;
  akuru_share: number;
  contributor_share: number;
  payment_status: PaymentStatus;
  is_fine: boolean;
  fine_amount: number | null;
  case_id: string | null;
  qb_synced: boolean;
  source: LicenseSource;
  paid_to_contributor: boolean;
  payout_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCase {
  id: string;
  case_number: string;
  title: string;
  status: CaseStatus;
  priority: CasePriority;
  identified_date: string;
  identified_by: string | null;
  buyer_id: string | null;
  font_id: string;
  usage_context: UsageContext | null;
  usage_description: string | null;
  constituency: string | null;
  party: string | null;
  resolution_type: ResolutionType | null;
  resolved_date: string | null;
  dismissal_reason: string | null;
  license_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCaseActivityLog {
  id: string;
  case_id: string;
  user_id: string | null;
  activity_type: ActivityType;
  old_value: string | null;
  new_value: string | null;
  comment: string | null;
  attachment_url: string | null;
  created_at: string;
}

export interface DbContributorPayout {
  id: string;
  contributor_id: string;
  payout_date: string;
  amount: number;
  period_description: string;
  invoice_number: string | null;
  notes: string | null;
  created_at: string;
}

// ---- Joined / enriched types used in the UI ----

export interface LicenseWithRelations extends DbLicense {
  buyer: Pick<DbBuyer, "id" | "name" | "organization">;
  font: Pick<DbFont, "id" | "name" | "contributor_id">;
  contributor: Pick<DbContributor, "id" | "name">;
}

export interface CaseWithRelations extends DbCase {
  font: Pick<DbFont, "id" | "name">;
  buyer: Pick<DbBuyer, "id" | "name" | "organization"> | null;
  identified_by_user: Pick<DbUser, "id" | "full_name"> | null;
}

export interface ActivityLogWithUser extends DbCaseActivityLog {
  user: Pick<DbUser, "id" | "full_name"> | null;
}

// ---- Calculated types ----

export interface LicenseFinancialPreview {
  base_price: number;       // Invoice rate incl. GST (what buyer pays)
  invoice_amount: number;   // Same as base_price — the GST-inclusive total
  gst_amount: number;
  contributor_share: number;
  akuru_share: number;
  contributor_share_pct: number;
}

/** Front-end utility: given a font and optional override amount, calculate financials.
 *  base_price is stored as the GST-inclusive invoice rate.
 *  GST is back-calculated: gst = invoiceAmount * rate / (1 + rate)
 */
export function calculateLicenseFinancials(
  font: Pick<DbFont, "base_price" | "contributor_share_pct" | "gst_rate">,
  overrideAmount?: number
): LicenseFinancialPreview {
  // base_price is already GST-inclusive; override (if any) is also GST-inclusive
  const invoiceAmount = overrideAmount ?? font.base_price;
  const baseExclGst = invoiceAmount / (1 + font.gst_rate);
  const gstAmount = invoiceAmount - baseExclGst;
  const contributorShare = baseExclGst * (font.contributor_share_pct / 100);
  const akuruShare = baseExclGst * ((100 - font.contributor_share_pct) / 100);

  return {
    base_price: font.base_price,
    invoice_amount: invoiceAmount,
    gst_amount: gstAmount,
    contributor_share: contributorShare,
    akuru_share: akuruShare,
    contributor_share_pct: font.contributor_share_pct,
  };
}

// ---- Human-readable label maps ----

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  identified: "Identified",
  verify_license: "Verify License",
  license_verified: "License Verified",
  converted: "Converted",
  fined: "Fined",
  dismissed: "Dismissed",
};

export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const USAGE_CONTEXT_LABELS: Record<UsageContext, string> = {
  social_media: "Social Media",
  campaign_material: "Campaign Material",
  government_doc: "Government Document",
  commercial_product: "Commercial Product",
  website: "Website",
  print_media: "Print Media",
  other: "Other",
};

export const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  individual: "Individual",
  organization: "Organization",
  government: "Government",
  political_party: "Political Party",
};

// Pipeline order for the Kanban view
export const CASE_STATUS_ORDER: CaseStatus[] = [
  "identified",
  "verify_license",
  "license_verified",
  "converted",
  "fined",
  "dismissed",
];
