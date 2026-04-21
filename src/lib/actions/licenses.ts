"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus, LicenseSource, CaseStatus } from "@/types/database";
import { CreateLicenseSchema, UpdateLicenseSchema } from "@/lib/validations";

type ActionResult = { success: true } | { success: false; error: string };

// ── Create a new license ───────────────────────────────────────────────────────
export async function createLicense(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

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
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path  = issue?.path?.join(".") ?? "unknown";
      const msg   = issue?.message ?? "Validation failed";
      console.error("[createLicense] validation error:", path, msg);
      return { success: false, error: `${msg} (field: ${path})` };
    }

    const payload = {
      buyer_id:       parsed.data.buyer_id,
      font_id:        parsed.data.font_id,
      purchase_date:  parsed.data.purchase_date,
      invoice_amount: parsed.data.invoice_amount,
      payment_status: parsed.data.payment_status as PaymentStatus,
      is_fine:        parsed.data.is_fine,
      fine_amount:    parsed.data.is_fine ? parsed.data.invoice_amount : null,
      case_id:        parsed.data.case_id ?? null,
      source:         parsed.data.source as LicenseSource,
      qb_synced:      false,
    };

    const { data, error } = await supabase
      .from("licenses")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("[createLicense] DB error:", error.message, error.code);
      return { success: false, error: `Could not create license: ${error.message}` };
    }

    // If created from a case, auto-transition the case status and redirect back there
    if (parsed.data.case_id) {
      const newStatus: CaseStatus = parsed.data.is_fine ? "fined" : "converted";
      await supabase.from("cases").update({
        status: newStatus,
        license_id: data.id,
        resolved_date: new Date().toISOString().split("T")[0],
        resolution_type: parsed.data.is_fine ? "fined" : "purchased",
      }).eq("id", parsed.data.case_id);

      revalidatePath("/licenses");
      revalidatePath("/cases");
      revalidateTag("licenses");
      revalidateTag("cases");
      redirect(`/cases/${parsed.data.case_id}`);
    }

    revalidatePath("/licenses");
    revalidateTag("licenses");
    redirect(`/licenses/${data.id}`);
  } catch (err) {
    // redirect() throws internally — re-throw it so Next.js handles navigation
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    console.error("[createLicense] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Update a license ───────────────────────────────────────────────────────────
// Returns a result object so the client always gets the real error message.
export async function updateLicense(
  licenseId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    const isFine         = formData.get("is_fine") === "true";
    const invoiceAmount  = parseFloat(formData.get("invoice_amount") as string);
    const purchaseDate   = formData.get("purchase_date") as string;
    const buyerId        = formData.get("buyer_id") as string;
    const paymentStatus  = formData.get("payment_status") as string;
    const source         = formData.get("source") as string;

    // Log received values for debugging
    console.error("[updateLicense] input:", JSON.stringify({
      licenseId, buyerId, purchaseDate, invoiceAmount, paymentStatus, source, isFine,
    }));

    const parsed = UpdateLicenseSchema.safeParse({
      buyer_id:       buyerId,
      purchase_date:  purchaseDate,
      invoice_amount: invoiceAmount,
      payment_status: paymentStatus,
      is_fine:        isFine,
      source,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path  = issue?.path?.join(".") ?? "unknown";
      const msg   = issue?.message ?? "Validation failed";
      console.error("[updateLicense] validation error:", path, msg);
      return { success: false, error: `${msg} (field: ${path})` };
    }

    const { error } = await supabase
      .from("licenses")
      .update({
        buyer_id:       parsed.data.buyer_id,
        purchase_date:  parsed.data.purchase_date,
        invoice_amount: parsed.data.invoice_amount,
        payment_status: parsed.data.payment_status as PaymentStatus,
        is_fine:        parsed.data.is_fine,
        fine_amount:    parsed.data.is_fine ? parsed.data.invoice_amount : null,
        source:         parsed.data.source as LicenseSource,
      })
      .eq("id", licenseId);

    if (error) {
      console.error("[updateLicense] DB error:", error.message, error.code, error.details);
      return { success: false, error: `Could not save changes: ${error.message}` };
    }

    revalidatePath(`/licenses/${licenseId}`);
    revalidatePath("/licenses");
    revalidateTag("licenses");

    return { success: true };
  } catch (err) {
    console.error("[updateLicense] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Toggle QB synced (admin only) ─────────────────────────────────────────────
export async function toggleQbSynced(licenseId: string, current: boolean): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: profile } = await supabase
      .from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { success: false, error: "Admin access required" };

    const { error } = await supabase
      .from("licenses")
      .update({ qb_synced: !current })
      .eq("id", licenseId);

    if (error) {
      console.error("[toggleQbSynced] DB error:", error.message);
      return { success: false, error: "Failed to update QB sync status" };
    }

    revalidatePath(`/licenses/${licenseId}`);
    revalidatePath("/licenses");
    revalidateTag("licenses");
    return { success: true };
  } catch (err) {
    console.error("[toggleQbSynced] unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ── Update payment status ─────────────────────────────────────────────────────
export async function updatePaymentStatus(licenseId: string, status: PaymentStatus): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("licenses")
      .update({ payment_status: status })
      .eq("id", licenseId);

    if (error) {
      console.error("[updatePaymentStatus] DB error:", error.message);
      return { success: false, error: "Failed to update payment status" };
    }

    revalidatePath(`/licenses/${licenseId}`);
    revalidatePath("/licenses");
    revalidateTag("licenses");
    return { success: true };
  } catch (err) {
    console.error("[updatePaymentStatus] unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ── Bulk toggle QB synced (admin only) ────────────────────────────────────────
export async function bulkToggleQbSynced(ids: string[], value: boolean): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: profile } = await supabase
      .from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { success: false, error: "Admin access required" };

    if (!ids.length || ids.length > 200) return { success: false, error: "Invalid selection" };
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!ids.every((id) => uuidRegex.test(id))) return { success: false, error: "Invalid ID format" };

    const { error } = await supabase
      .from("licenses")
      .update({ qb_synced: value })
      .in("id", ids);

    if (error) {
      console.error("[bulkToggleQbSynced] DB error:", error.message);
      return { success: false, error: "Operation failed. Please try again." };
    }

    revalidatePath("/licenses");
    revalidateTag("licenses");
    return { success: true };
  } catch (err) {
    console.error("[bulkToggleQbSynced] unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ── Delete a license (admin only) ──────────────────────────────────────────────
export async function deleteLicense(licenseId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    const { data: profile } = await supabase
      .from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return { success: false, error: "Admin access required." };
    }

    const { error } = await supabase.from("licenses").delete().eq("id", licenseId);
    if (error) {
      console.error("[deleteLicense] DB error:", error.message, error.code);
      return { success: false, error: `Could not delete license: ${error.message}` };
    }

    revalidatePath("/licenses");
    revalidateTag("licenses");
    redirect("/licenses");
  } catch (err) {
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    console.error("[deleteLicense] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}
