"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// ── Validation schema for the new flow ────────────────────────────────────────
// Use explicit regex instead of z.string().uuid() — Zod v4's built-in UUID
// checker has stricter version-bit requirements that can reject valid PG UUIDs.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid    = z.string().regex(UUID_RE, "Invalid ID format");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

const RecordPayoutFlowSchema = z.object({
  contributorId: uuid,
  licenseIds:    z
    .array(uuid)
    .min(1, "At least one license must be selected")
    .max(500, "Cannot select more than 500 licenses at once"),
  payoutDate:    isoDate,
  invoiceNumber: z.string().max(100).nullable(),
  notes:         z.string().max(2000).nullable(),
});

// ── Record a contributor payout ────────────────────────────────────────────────
// Accepts a plain object (not FormData) since the new component is fully client-side.
// Returns { success: true; amount: number } or { success: false; error: string }.
export async function recordPayout(input: {
  contributorId: string;
  licenseIds: string[];
  payoutDate: string;
  invoiceNumber: string | null;
  notes: string | null;
}): Promise<{ success: true; amount: number } | { success: false; error: string }> {
  try {
    const supabase = await createClient();

    // ── Auth ─────────────────────────────────────────────────────────────────
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[recordPayout] profile query error:", profileError.message, profileError.code);
      return { success: false, error: "Could not verify your permissions. Please try again." };
    }

    if (profile?.role !== "admin") {
      return { success: false, error: "Admin access required to record payouts." };
    }

    // ── Validation ───────────────────────────────────────────────────────────
    console.error("[recordPayout] input received:", JSON.stringify({
      contributorId: input.contributorId,
      licenseIds:    input.licenseIds?.slice(0, 3),
      payoutDate:    input.payoutDate,
    }));

    const parsed = RecordPayoutFlowSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path  = issue?.path?.join(".") ?? "unknown";
      const msg   = issue?.message ?? "Validation failed";
      console.error("[recordPayout] validation error:", path, msg);
      return { success: false, error: `${msg} (field: ${path})` };
    }

    const { contributorId, licenseIds, payoutDate, invoiceNumber, notes } = parsed.data;

    // ── Fetch selected licenses from DB (never trust client-side total) ───────
    const { data: selectedLicenses, error: licensesFetchError } = await supabase
      .from("licenses")
      .select("id, contributor_share, purchase_date, font:fonts(contributor_id)")
      .in("id", licenseIds);

    if (licensesFetchError) {
      console.error("[recordPayout] licenses fetch error:", licensesFetchError.message, licensesFetchError.code);
      return { success: false, error: "Could not fetch license details. Please try again." };
    }

    if (!selectedLicenses || selectedLicenses.length === 0) {
      return { success: false, error: "None of the selected licenses were found." };
    }

    // ── Security: verify all licenses belong to this contributor's fonts ──────
    const invalidLicenses = selectedLicenses.filter((l: any) => {
      const fontContributorId = Array.isArray(l.font) ? l.font[0]?.contributor_id : l.font?.contributor_id;
      return fontContributorId !== contributorId;
    });

    if (invalidLicenses.length > 0) {
      console.error("[recordPayout] security violation — licenses not belonging to contributor:", invalidLicenses.map((l: any) => l.id));
      return { success: false, error: "One or more selected licenses do not belong to this contributor." };
    }

    // ── Sum contributor_share from DB (server-calculated total) ──────────────
    const amount = selectedLicenses.reduce((sum: number, l: any) => {
      const share = typeof l.contributor_share === "number" ? l.contributor_share : 0;
      return sum + share;
    }, 0);

    if (amount <= 0) {
      return { success: false, error: "Total payout amount must be greater than zero." };
    }

    // ── Auto-generate period_description from license dates ───────────────────
    // e.g. "Apr 2026", "Apr – Aug 2026", "Dec 2025 – Apr 2026"
    const dates = selectedLicenses
      .map((l: any) => l.purchase_date as string)
      .filter(Boolean)
      .sort();
    const fmt = (iso: string) => {
      const [y, m] = iso.split("-");
      const month = new Date(Number(y), Number(m) - 1, 1)
        .toLocaleString("en-US", { month: "short" });
      return `${month} ${y}`;
    };
    const periodDescription =
      dates.length === 0
        ? "Payout"
        : dates[0] === dates[dates.length - 1]
        ? fmt(dates[0])
        : `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;

    // ── Insert payout record ──────────────────────────────────────────────────
    const { data: payout, error: insertError } = await supabase
      .from("contributor_payouts")
      .insert({
        contributor_id:     contributorId,
        amount,
        payout_date:        payoutDate,
        period_description: periodDescription,
        invoice_number:     invoiceNumber,
        notes,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[recordPayout] insert error:", insertError.message, insertError.code, insertError.details);
      return { success: false, error: `Could not record payout: ${insertError.message}` };
    }

    if (!payout?.id) {
      console.error("[recordPayout] insert returned no id");
      return { success: false, error: "Payout was not saved. Please try again." };
    }

    // ── Update selected licenses: mark paid and link to payout ────────────────
    const { error: updateError } = await supabase
      .from("licenses")
      .update({ paid_to_contributor: true, payout_id: payout.id })
      .in("id", licenseIds);

    if (updateError) {
      // Non-fatal: payout was recorded; license marking failed
      console.error("[recordPayout] license update error:", updateError.message);
    }

    revalidatePath(`/contributors/${contributorId}`);
    revalidatePath("/contributors");
    revalidatePath("/dashboard");
    revalidateTag("contributors");

    return { success: true, amount };
  } catch (err) {
    // Unexpected throw — log full details server-side
    console.error("[recordPayout] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Payout calculator: given desired payout amount → listing price ─────────────
export async function calculatePayoutPrice(
  contributorSharePct: number,
  desiredPayout: number,
  gstRate: number = 0.08
): Promise<{ baseExclGst: number; invoiceAmount: number; gstAmount: number; akuruShare: number }> {
  const baseExclGst = desiredPayout / (contributorSharePct / 100);
  const invoiceAmount = baseExclGst * (1 + gstRate);
  const gstAmount = invoiceAmount - baseExclGst;
  const akuruShare = baseExclGst * ((100 - contributorSharePct) / 100);
  return { baseExclGst, invoiceAmount, gstAmount, akuruShare };
}
