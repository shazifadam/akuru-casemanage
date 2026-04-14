"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus, LicenseSource } from "@/types/database";

// ── Create a new license ───────────────────────────────────────────────────────
export async function createLicense(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const isFine = formData.get("is_fine") === "true";
  const invoiceAmount = parseFloat(formData.get("invoice_amount") as string);

  const payload = {
    buyer_id: formData.get("buyer_id") as string,
    font_id: formData.get("font_id") as string,
    purchase_date: formData.get("purchase_date") as string,
    invoice_amount: invoiceAmount,
    payment_status: (formData.get("payment_status") as PaymentStatus) ?? "pending",
    is_fine: isFine,
    fine_amount: isFine ? invoiceAmount : null,
    case_id: (formData.get("case_id") as string) || null,
    source: (formData.get("source") as LicenseSource) ?? "direct_sale",
    qb_synced: false,
    // gst_amount, akuru_share, contributor_share are auto-calculated by DB trigger
  };

  if (!payload.buyer_id || !payload.font_id) {
    throw new Error("Buyer and font are required");
  }

  const { data, error } = await supabase
    .from("licenses")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/licenses");
  redirect(`/licenses/${data.id}`);
}

// ── Update a license ───────────────────────────────────────────────────────────
export async function updateLicense(licenseId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const isFine = formData.get("is_fine") === "true";
  const invoiceAmount = parseFloat(formData.get("invoice_amount") as string);

  const { error } = await supabase
    .from("licenses")
    .update({
      buyer_id: formData.get("buyer_id") as string,
      purchase_date: formData.get("purchase_date") as string,
      invoice_amount: invoiceAmount,
      payment_status: formData.get("payment_status") as PaymentStatus,
      is_fine: isFine,
      fine_amount: isFine ? invoiceAmount : null,
      source: formData.get("source") as LicenseSource,
    })
    .eq("id", licenseId);

  if (error) throw new Error(error.message);

  revalidatePath(`/licenses/${licenseId}`);
  revalidatePath("/licenses");
}

// ── Toggle QB synced ───────────────────────────────────────────────────────────
export async function toggleQbSynced(licenseId: string, current: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("licenses")
    .update({ qb_synced: !current })
    .eq("id", licenseId);

  if (error) throw new Error(error.message);
  revalidatePath(`/licenses/${licenseId}`);
  revalidatePath("/licenses");
}

// ── Toggle payment status ──────────────────────────────────────────────────────
export async function updatePaymentStatus(licenseId: string, status: PaymentStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("licenses")
    .update({ payment_status: status })
    .eq("id", licenseId);

  if (error) throw new Error(error.message);
  revalidatePath(`/licenses/${licenseId}`);
  revalidatePath("/licenses");
}

// ── Delete a license (admin only) ──────────────────────────────────────────────
export async function deleteLicense(licenseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Admin access required");

  const { error } = await supabase.from("licenses").delete().eq("id", licenseId);
  if (error) throw new Error(error.message);

  revalidatePath("/licenses");
  redirect("/licenses");
}
