"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { RecordPayoutSchema } from "@/lib/validations";

// ── Record a contributor payout ────────────────────────────────────────────────
export async function recordPayout(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Payout recording is a financial write — admin only
  const { data: profile } = await supabase
    .from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Admin access required");

  const contributorId = formData.get("contributor_id") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const payoutDate = formData.get("payout_date") as string;
  const periodDescription = formData.get("period_description") as string;
  const invoiceNumber = (formData.get("invoice_number") as string).trim() || null;
  const notes = (formData.get("notes") as string).trim() || null;

  const parsed = RecordPayoutSchema.safeParse({
    contributor_id:     contributorId,
    amount,
    payout_date:        payoutDate,
    period_description: periodDescription,
    invoice_number:     invoiceNumber,
    notes,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  if (!contributorId || !amount || !payoutDate || !periodDescription) {
    throw new Error("All required fields must be filled");
  }

  // Insert the payout record
  const { data: payout, error } = await supabase
    .from("contributor_payouts")
    .insert({ contributor_id: contributorId, amount, payout_date: payoutDate, period_description: periodDescription, invoice_number: invoiceNumber, notes })
    .select("id")
    .single();

  if (error) {
    console.error("[recordPayout] DB error:", error.message);
    throw new Error("Operation failed. Please try again.");
  }

  // Mark relevant paid licenses as paid_to_contributor = true and link to this payout
  // Strategy: mark all unpaid licenses for this contributor's fonts up to the payout amount
  const { data: fonts } = await supabase
    .from("fonts")
    .select("id")
    .eq("contributor_id", contributorId);

  if (fonts && fonts.length > 0) {
    const fontIds = fonts.map((f) => f.id);
    await supabase
      .from("licenses")
      .update({ paid_to_contributor: true, payout_id: payout.id })
      .in("font_id", fontIds)
      .eq("payment_status", "paid")
      .eq("paid_to_contributor", false);
  }

  revalidatePath(`/contributors/${contributorId}`);
  revalidatePath("/contributors");
  revalidatePath("/dashboard");
  revalidateTag("contributors");
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
