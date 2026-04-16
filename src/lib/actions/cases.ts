"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  CaseStatus,
  CasePriority,
  UsageContext,
  ResolutionType,
} from "@/types/database";
import { z } from "zod";
import { CreateCaseSchema, UpdateCaseSchema, AddCommentSchema, AddEvidenceSchema } from "@/lib/validations";

type ActionResult = { success: true } | { success: false; error: string };

// ── Create a new case ─────────────────────────────────────────────────────────
// Uses redirect() after success — keep throw pattern for auth/validation only.
// Client form wraps this in try/catch but createCase redirects on success so
// only real errors (validation, DB) will surface via thrown error.
// HOWEVER: in Next.js 15 production, thrown errors are sanitized.
// So we convert this to return a result object too.
export async function createCase(
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    const parsed = CreateCaseSchema.safeParse({
      title:             formData.get("title"),
      font_id:           formData.get("font_id"),
      priority:          formData.get("priority") ?? "medium",
      identified_date:   (formData.get("identified_date") as string) || new Date().toISOString().split("T")[0],
      usage_context:     (formData.get("usage_context") as string) || null,
      usage_description: (formData.get("usage_description") as string) || null,
      constituency:      (formData.get("constituency") as string) || null,
      party:             (formData.get("party") as string) || null,
      buyer_id:          (formData.get("buyer_id") as string) || null,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path  = issue?.path?.join(".") ?? "unknown";
      const msg   = issue?.message ?? "Validation failed";
      console.error("[createCase] validation error:", path, msg);
      return { success: false, error: `${msg} (field: ${path})` };
    }

    const payload = {
      title: parsed.data.title,
      font_id: parsed.data.font_id,
      priority: parsed.data.priority as CasePriority,
      identified_date: parsed.data.identified_date,
      identified_by: user.id,
      usage_context: (parsed.data.usage_context as UsageContext) ?? null,
      usage_description: parsed.data.usage_description ?? null,
      constituency: parsed.data.constituency ?? null,
      party: parsed.data.party ?? null,
      buyer_id: parsed.data.buyer_id ?? null,
      status: "identified" as CaseStatus,
    };

    const { data, error } = await supabase
      .from("cases")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("[createCase] DB error:", error.message, error.code);
      return { success: false, error: `Could not create case: ${error.message}` };
    }

    // Log creation in activity log
    await supabase.from("case_activity_log").insert({
      case_id: data.id,
      user_id: user.id,
      activity_type: "status_change",
      old_value: null,
      new_value: "identified",
      comment: "Case created",
    });

    revalidatePath("/cases");
    revalidateTag("cases");
    redirect(`/cases/${data.id}`);
  } catch (err) {
    // redirect() throws internally — re-throw it so Next.js handles navigation
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    console.error("[createCase] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Update case metadata (not status) ─────────────────────────────────────────
export async function updateCase(caseId: string, formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    const parsed = UpdateCaseSchema.safeParse({
      title:             formData.get("title"),
      priority:          formData.get("priority"),
      usage_context:     (formData.get("usage_context") as string) || null,
      usage_description: (formData.get("usage_description") as string) || null,
      constituency:      (formData.get("constituency") as string) || null,
      party:             (formData.get("party") as string) || null,
      buyer_id:          (formData.get("buyer_id") as string) || null,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path  = issue?.path?.join(".") ?? "unknown";
      const msg   = issue?.message ?? "Validation failed";
      console.error("[updateCase] validation error:", path, msg);
      return { success: false, error: `${msg} (field: ${path})` };
    }

    const payload = {
      title: parsed.data.title,
      priority: parsed.data.priority as CasePriority,
      usage_context: (parsed.data.usage_context as UsageContext) ?? null,
      usage_description: parsed.data.usage_description ?? null,
      constituency: parsed.data.constituency ?? null,
      party: parsed.data.party ?? null,
      buyer_id: parsed.data.buyer_id ?? null,
    };

    const { error } = await supabase
      .from("cases")
      .update(payload)
      .eq("id", caseId);

    if (error) {
      console.error("[updateCase] DB error:", error.message, error.code);
      return { success: false, error: `Could not update case: ${error.message}` };
    }

    revalidatePath(`/cases/${caseId}`);
    revalidatePath("/cases");
    revalidateTag("cases");
    return { success: true };
  } catch (err) {
    console.error("[updateCase] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Transition case status with validation ────────────────────────────────────
export async function transitionCaseStatus(
  caseId: string,
  newStatus: CaseStatus,
  options?: {
    dismissalReason?: string;
    licenseId?: string;
    resolutionType?: ResolutionType;
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    // Validate: dismissed requires a reason
    if (newStatus === "dismissed" && !options?.dismissalReason) {
      return { success: false, error: "Dismissal reason is required." };
    }

    // Validate: converted/fined requires a license link
    if (
      (newStatus === "converted" || newStatus === "fined") &&
      !options?.licenseId
    ) {
      return { success: false, error: "A license record must be linked to resolve this case." };
    }

    const updatePayload: Record<string, unknown> = { status: newStatus };

    if (newStatus === "dismissed") {
      updatePayload.dismissal_reason = options!.dismissalReason;
      updatePayload.resolved_date = new Date().toISOString().split("T")[0];
      updatePayload.resolution_type = "dismissed";
    }

    if (newStatus === "converted" || newStatus === "fined") {
      updatePayload.license_id = options!.licenseId;
      updatePayload.resolved_date = new Date().toISOString().split("T")[0];
      updatePayload.resolution_type =
        options?.resolutionType ?? (newStatus === "fined" ? "fined" : "purchased");
    }

    const { error } = await supabase
      .from("cases")
      .update(updatePayload)
      .eq("id", caseId);

    if (error) {
      console.error("[transitionCaseStatus] DB error:", error.message, error.code);
      return { success: false, error: `Could not change status: ${error.message}` };
    }

    // Status change is auto-logged by the DB trigger (005_functions_and_triggers.sql)
    revalidatePath(`/cases/${caseId}`);
    revalidatePath("/cases");
    revalidateTag("cases");
    return { success: true };
  } catch (err) {
    console.error("[transitionCaseStatus] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Add a comment to the activity log ────────────────────────────────────────
export async function addCaseComment(caseId: string, comment: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    const parsed = AddCommentSchema.safeParse({ comment });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const msg   = issue?.message ?? "Validation failed";
      console.error("[addCaseComment] validation error:", msg);
      return { success: false, error: msg };
    }

    const { error } = await supabase.from("case_activity_log").insert({
      case_id: caseId,
      user_id: user.id,
      activity_type: "comment",
      comment: comment.trim(),
    });

    if (error) {
      console.error("[addCaseComment] DB error:", error.message, error.code);
      return { success: false, error: `Could not add comment: ${error.message}` };
    }

    revalidatePath(`/cases/${caseId}`);
    return { success: true };
  } catch (err) {
    console.error("[addCaseComment] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Upload evidence and log it ─────────────────────────────────────────────────
export async function addCaseEvidence(
  caseId: string,
  attachmentUrl: string,
  comment?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    const parsed = AddEvidenceSchema.safeParse({ attachmentUrl, comment });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const msg   = issue?.message ?? "Validation failed";
      console.error("[addCaseEvidence] validation error:", msg);
      return { success: false, error: msg };
    }

    const { error } = await supabase.from("case_activity_log").insert({
      case_id: caseId,
      user_id: user.id,
      activity_type: "evidence_added",
      attachment_url: attachmentUrl,
      comment: comment?.trim() || null,
    });

    if (error) {
      console.error("[addCaseEvidence] DB error:", error.message, error.code);
      return { success: false, error: `Could not log evidence: ${error.message}` };
    }

    revalidatePath(`/cases/${caseId}`);
    return { success: true };
  } catch (err) {
    console.error("[addCaseEvidence] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Link a buyer to a case ────────────────────────────────────────────────────
export async function linkBuyerToCase(caseId: string, buyerId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    const { error } = await supabase
      .from("cases")
      .update({ buyer_id: buyerId })
      .eq("id", caseId);

    if (error) {
      console.error("[linkBuyerToCase] DB error:", error.message, error.code);
      return { success: false, error: `Could not link buyer: ${error.message}` };
    }

    await supabase.from("case_activity_log").insert({
      case_id: caseId,
      user_id: user.id,
      activity_type: "buyer_linked",
      new_value: buyerId,
    });

    revalidatePath(`/cases/${caseId}`);
    return { success: true };
  } catch (err) {
    console.error("[linkBuyerToCase] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Delete a case (admin only) ────────────────────────────────────────────────
export async function deleteCase(caseId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return { success: false, error: "Admin access required." };
    }

    const { error } = await supabase.from("cases").delete().eq("id", caseId);
    if (error) {
      console.error("[deleteCase] DB error:", error.message, error.code);
      return { success: false, error: `Could not delete case: ${error.message}` };
    }

    revalidatePath("/cases");
    revalidateTag("cases");
    redirect("/cases");
  } catch (err) {
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    console.error("[deleteCase] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Bulk status update ────────────────────────────────────────────────────────
export async function bulkUpdateCaseStatus(
  caseIds: string[],
  newStatus: CaseStatus
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    const TERMINAL_STATUSES = ["converted", "fined", "dismissed"];

    if (caseIds.length === 0) return { success: false, error: "No cases selected." };
    if (caseIds.length > 100) return { success: false, error: "Maximum 100 cases per bulk operation." };

    // Validate all IDs are UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!caseIds.every((id) => uuidRegex.test(id))) {
      return { success: false, error: "Invalid case ID format." };
    }

    // Terminal status changes require admin
    if (TERMINAL_STATUSES.includes(newStatus)) {
      const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") {
        return { success: false, error: "Admin access required to bulk-apply terminal statuses." };
      }
    }

    const { error } = await supabase
      .from("cases")
      .update({ status: newStatus })
      .in("id", caseIds);

    if (error) {
      console.error("[bulkUpdateCaseStatus] DB error:", error.message, error.code);
      return { success: false, error: `Operation failed: ${error.message}` };
    }

    revalidatePath("/cases");
    revalidateTag("cases");
    return { success: true };
  } catch (err) {
    console.error("[bulkUpdateCaseStatus] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}
