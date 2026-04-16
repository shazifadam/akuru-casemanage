"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus, LicenseSource } from "@/types/database";
import { z } from "zod";
import { CreateLicenseSchema, UpdateLicenseSchema } from "@/lib/validations";

// ── Create a new license ───────────────────────────────────────────────────────
export async function createLicense(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const isFine = formData.get("is_fine") === "true";
  const invoiceAmount = parseFloat(formData.get("invoice_amount") as string);

  const parsed = CreateLicenseSchema.safeParse({
    buyer_id:       formData.get("buyer_id"),
    font_id:        formData.get("font_id"),
    purchase_date:  formData.get("purchase_date"),
    invoice_amount: invoiceAmount,
    payment_status: formData.get("payment_status") ?? "pending",
    is_fine:        isFine,
    source:         formData.get("source") ?? "direct_sale",
    case_id:        (formData.get("case_id") as string) || null,
  });
  if (!parsed.success) throw new Error(parsed.error.errors[0].message);

  const payload = {
    buyer_id: parsed.data.buyer_id,
    font_id: parsed.data.font_id,
    purchase_date: parsed.data.purchase_date,
    invoice_amount: parsed.data.invoice_amount,
    payment_status: parsed.data.payment_status as PaymentStatus,
    is_fine: parsed.data.is_fine,
    fine_amount: parsed.data.is_fine ? parsed.data.invoice_amount : null,
    case_id: parsed.data.case_id ?? null,
    source: parsed.data.source as LicenseSource,
    qb_synced: false,
    // gst_amount, akuru_share, contributor_share are auto-calculated by DB trigger
  };

  const { data, error } = await supabase
    .from("licenses")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("[createLicense] DB error:", error.message);
    throw new Error("Operation failed. Please try again.");
  }

  revalidatePath("/licenses");
  revalidateTag("licenses");
  redirect(`/licenses/${data.id}`);
}

// ── Update a license ───────────────────────────────────────────────────────────
export async function updateLicense(licenseId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const isFine = formData.get("is_fine") === "true";
  const invoiceAmount = parseFloat(formData.get("invoice_amount") as string);

  const parsed = UpdateLicenseSchema.safeParse({
    buyer_id:       formData.get("buyer_id"),
    purchase_date:  formData.get("purchase_date"),
    invoice_amount: invoiceAmount,
    payment_status: formData.get("payment_status"),
    is_fine:        isFine,
    source:         formData.get("source"),
  });
  if (!parsed.success) throw new Error(parsed.error.errors[0].message);

  const { error } = await supabase
    .from("licenses")
    .update({
      buyer_id: parsed.data.buyer_id,
      purchase_date: parsed.data.purchase_date,
      invoice_amount: parsed.data.invoice_amount,
      payment_status: parsed.data.payment_status as PaymentStatus,
      is_fine: parsed.data.is_fine,
      fine_amount: parsed.data.is_fine ? parsed.data.invoice_amount : null,
      source: parsed.data.source as LicenseSource,
    })
    .eq("id", licenseId);

  if (error) {
    console.error("[updateLicense] DB error:", error.message);
    throw new Error("Operation failed. Please try again.");
  }

  revalidatePath(`/licenses/${licenseId}`);
  revalidatePath("/licenses");
  revalidateTag("licenses");
}

// ── Toggle QB synced (admin only) ─────────────────────────────────────────────
export async function toggleQbSynced(licenseId: string, current: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Admin access required");

  const { error } = await supabase
    .from("licenses")
    .update({ qb_synced: !current })
    .eq("id", licenseId);

  if (error) throw new Error("Failed to update QB sync status");
  revalidatePath(`/licenses/${licenseId}`);
  revalidatePath("/licenses");
  revalidateTag("licenses");
}

// ── Update payment status (authenticated, logs change) ────────────────────────
export async function updatePaymentStatus(licenseId: string, status: PaymentStatus) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("licenses")
    .update({ payment_status: status })
    .eq("id", licenseId);

  if (error) throw new Error("Failed to update payment status");
  revalidatePath(`/licenses/${licenseId}`);
  revalidatePath("/licenses");
  revalidateTag("licenses");
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
  if (error) {
    console.error("[deleteLicense] DB error:", error.message);
    throw new Error("Operation failed. Please try again.");
  }

  revalidatePath("/licenses");
  revalidateTag("licenses");
  redirect("/licenses");
}
