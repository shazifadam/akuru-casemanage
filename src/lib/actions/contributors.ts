"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RecordPayoutSchema } from "@/lib/validations";

// ── Record a contributor payout ────────────────────────────────────────────────
// Returns { success: true } or { success: false; error: string }
// so callers always get a meaningful message — even in production builds
// where Next.js sanitises thrown errors to a generic string.
export async function recordPayout(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
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

    // ── Inputs ───────────────────────────────────────────────────────────────
    const contributorId     = formData.get("contributor_id") as string;
    const amountRaw         = formData.get("amount") as string;
    const payoutDate        = formData.get("payout_date") as string;
    const periodDescription = formData.get("period_description") as string;
    const invoiceNumberRaw  = formData.get("invoice_number");
    const notesRaw          = formData.get("notes");

    const amount        = parseFloat(amountRaw);
    const invoiceNumber = invoiceNumberRaw ? String(invoiceNumberRaw).trim() || null : null;
    const notes         = notesRaw         ? String(notesRaw).trim()         || null : null;

    // ── Validation ───────────────────────────────────────────────────────────
    const parsed = RecordPayoutSchema.safeParse({
      contributor_id:     contributorId,
      amount,
      payout_date:        payoutDate,
      period_description: periodDescription,
      invoice_number:     invoiceNumber,
      notes,
    });

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Validation failed";
      return { success: false, error: msg };
    }

    // ── Insert payout ────────────────────────────────────────────────────────
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

    // ── Mark licenses as paid to contributor ─────────────────────────────────
    const { data: fonts } = await supabase
      .from("fonts")
      .select("id")
      .eq("contributor_id", contributorId);

    if (fonts && fonts.length > 0) {
      const fontIds = fonts.map((f) => f.id);
      const { error: updateError } = await supabase
        .from("licenses")
        .update({ paid_to_contributor: true, payout_id: payout.id })
        .in("font_id", fontIds)
        .eq("payment_status", "paid")
        .eq("paid_to_contributor", false);

      if (updateError) {
        // Non-fatal: payout was recorded; license marking failed
        console.error("[recordPayout] license update error:", updateError.message);
      }
    }

    revalidatePath(`/contributors/${contributorId}`);
    revalidatePath("/contributors");
    revalidatePath("/dashboard");
    revalidateTag("contributors");

    return { success: true };
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
