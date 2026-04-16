/**
 * Zod schemas for all server action inputs.
 * Import the schema you need in the relevant action file and call .parse() or .safeParse().
 */

import { z } from "zod";

// ── Shared primitives ─────────────────────────────────────────────────────────

// NOTE: z.string().uuid() in Zod v4 applies stricter version-bit checks that
// can reject valid PostgreSQL gen_random_uuid() output. Use explicit regex instead.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = z.string().regex(UUID_RE, "Invalid ID format");
const optionalUuid = z.string().regex(UUID_RE, "Invalid ID format").nullable().optional();
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");
const positiveNumber = z.number().positive("Must be greater than zero");
const percentageField = z
  .number()
  .min(0, "Cannot be negative")
  .max(100, "Cannot exceed 100%");
const httpsUrl = z
  .string()
  .url("Must be a valid URL")
  .refine((u) => u.startsWith("https://"), "URL must use HTTPS");

// ── Licenses ──────────────────────────────────────────────────────────────────

export const CreateLicenseSchema = z.object({
  buyer_id:       uuid,
  font_id:        uuid,
  purchase_date:  isoDate,
  invoice_amount: positiveNumber,
  payment_status: z.enum(["pending", "paid", "overdue"]),
  is_fine:        z.boolean(),
  source:         z.enum(["direct_sale", "enforcement", "election_case"]),
  case_id:        optionalUuid,
});

export const UpdateLicenseSchema = z.object({
  buyer_id:       uuid,
  purchase_date:  isoDate,
  invoice_amount: positiveNumber,
  payment_status: z.enum(["pending", "paid", "overdue"]),
  is_fine:        z.boolean(),
  source:         z.enum(["direct_sale", "enforcement", "election_case"]),
});

// ── Contributor payouts ───────────────────────────────────────────────────────

export const RecordPayoutSchema = z.object({
  contributor_id:     uuid,
  amount:             positiveNumber,
  payout_date:        isoDate,
  period_description: z.string().min(1, "Period description is required").max(500),
  invoice_number:     z.string().max(100).nullable().optional(),
  notes:              z.string().max(2000).nullable().optional(),
});

// ── Buyers ────────────────────────────────────────────────────────────────────

const BuyerTypeEnum = z.enum([
  "individual", "business", "government", "ngo", "media", "political_party", "other",
]);

export const CreateBuyerSchema = z.object({
  name:         z.string().min(1, "Name is required").max(200),
  email:        z.string().email("Invalid email").max(200).nullable().optional(),
  organization: z.string().max(200).nullable().optional(),
  buyer_type:   BuyerTypeEnum,
  notes:        z.string().max(2000).nullable().optional(),
});

export const UpdateBuyerSchema = CreateBuyerSchema;

// ── Cases ─────────────────────────────────────────────────────────────────────

const CasePriorityEnum  = z.enum(["low", "medium", "high", "critical"]);
const UsageContextEnum  = z.enum([
  "print", "digital", "broadcast", "web", "social_media", "election_material", "other",
]).nullable().optional();

export const CreateCaseSchema = z.object({
  title:             z.string().min(1, "Title is required").max(500),
  font_id:           uuid,
  priority:          CasePriorityEnum,
  identified_date:   isoDate,
  usage_context:     UsageContextEnum,
  usage_description: z.string().max(2000).nullable().optional(),
  constituency:      z.string().max(200).nullable().optional(),
  party:             z.string().max(200).nullable().optional(),
  buyer_id:          optionalUuid,
});

export const UpdateCaseSchema = z.object({
  title:             z.string().min(1, "Title is required").max(500),
  priority:          CasePriorityEnum,
  usage_context:     UsageContextEnum,
  usage_description: z.string().max(2000).nullable().optional(),
  constituency:      z.string().max(200).nullable().optional(),
  party:             z.string().max(200).nullable().optional(),
  buyer_id:          optionalUuid,
});

export const AddCommentSchema = z.object({
  comment: z.string().min(1, "Comment cannot be empty").max(5000),
});

export const AddEvidenceSchema = z.object({
  attachmentUrl: httpsUrl,
  comment:       z.string().max(2000).nullable().optional(),
});

// ── Contributors & Fonts ──────────────────────────────────────────────────────

const ContributorStatusEnum = z.enum(["active", "inactive"]);
const CommissionModelEnum   = z.enum(["contributor_owned", "work_for_hire", "split"]);
const FontStatusEnum        = z.enum(["active", "inactive", "archived"]);

export const CreateContributorSchema = z.object({
  name:             z.string().min(1, "Name is required").max(200),
  contact_email:    z.string().email("Invalid email").max(200).nullable().optional(),
  share_percentage: percentageField,
});

export const UpdateContributorSchema = CreateContributorSchema.extend({
  status: ContributorStatusEnum,
});

export const CreateFontSchema = z.object({
  name:                  z.string().min(1, "Name is required").max(200),
  contributor_id:        uuid,
  base_price:            positiveNumber,
  contributor_share_pct: percentageField,
  commission_model:      CommissionModelEnum,
  gst_rate:              z
    .number()
    .min(0, "Cannot be negative")
    .max(0.99, "GST rate must be less than 1"),
});

export const UpdateFontSchema = CreateFontSchema.extend({
  status: FontStatusEnum,
});

// ── Users ─────────────────────────────────────────────────────────────────────

const UserRoleEnum = z.enum(["admin", "enforcer"]);

export const CreateUserSchema = z.object({
  email:     z.string().email("Invalid email").max(200),
  full_name: z.string().min(1, "Full name is required").max(200),
  role:      UserRoleEnum,
});

export const UpdateUserNameSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(200),
});
