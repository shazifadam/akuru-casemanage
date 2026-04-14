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

// ── Create a new case ─────────────────────────────────────────────────────────
export async function createCase(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const payload = {
    title: formData.get("title") as string,
    font_id: formData.get("font_id") as string,
    priority: (formData.get("priority") as CasePriority) ?? "medium",
    identified_date:
      (formData.get("identified_date") as string) ||
      new Date().toISOString().split("T")[0],
    identified_by: user.id,
    usage_context: (formData.get("usage_context") as UsageContext) || null,
    usage_description: (formData.get("usage_description") as string) || null,
    constituency: (formData.get("constituency") as string) || null,
    party: (formData.get("party") as string) || null,
    buyer_id: (formData.get("buyer_id") as string) || null,
    status: "identified" as CaseStatus,
  };

  const { data, error } = await supabase
    .from("cases")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Log creation in activity log
  await supabase.from("case_activity_log").insert({
    case_id: data.id,
    user_id: user.id,
    activity_type: "status_change",
    old_value: null,
    new_value: "identified",
    comment: "Case created",
  });

  redirect(`/cases/${data.id}`);
}

// ── Update case metadata (not status) ─────────────────────────────────────────
export async function updateCase(caseId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const payload = {
    title: formData.get("title") as string,
    priority: formData.get("priority") as CasePriority,
    usage_context: (formData.get("usage_context") as UsageContext) || null,
    usage_description: (formData.get("usage_description") as string) || null,
    constituency: (formData.get("constituency") as string) || null,
    party: (formData.get("party") as string) || null,
    buyer_id: (formData.get("buyer_id") as string) || null,
  };

  const { error } = await supabase
    .from("cases")
    .update(payload)
    .eq("id", caseId);

  if (error) throw new Error(error.message);

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidateTag("cases");
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
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Validate: dismissed requires a reason
  if (newStatus === "dismissed" && !options?.dismissalReason) {
    throw new Error("Dismissal reason is required");
  }

  // Validate: converted/fined requires a license link
  if (
    (newStatus === "converted" || newStatus === "fined") &&
    !options?.licenseId
  ) {
    throw new Error("A license record must be linked to resolve this case");
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

  if (error) throw new Error(error.message);

  // Status change is auto-logged by the DB trigger (005_functions_and_triggers.sql)
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidateTag("cases");
}

// ── Add a comment to the activity log ────────────────────────────────────────
export async function addCaseComment(caseId: string, comment: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!comment.trim()) throw new Error("Comment cannot be empty");

  const { error } = await supabase.from("case_activity_log").insert({
    case_id: caseId,
    user_id: user.id,
    activity_type: "comment",
    comment: comment.trim(),
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/cases/${caseId}`);
}

// ── Upload evidence and log it ─────────────────────────────────────────────────
export async function addCaseEvidence(
  caseId: string,
  attachmentUrl: string,
  comment?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("case_activity_log").insert({
    case_id: caseId,
    user_id: user.id,
    activity_type: "evidence_added",
    attachment_url: attachmentUrl,
    comment: comment?.trim() || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/cases/${caseId}`);
}

// ── Link a buyer to a case ────────────────────────────────────────────────────
export async function linkBuyerToCase(caseId: string, buyerId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("cases")
    .update({ buyer_id: buyerId })
    .eq("id", caseId);

  if (error) throw new Error(error.message);

  await supabase.from("case_activity_log").insert({
    case_id: caseId,
    user_id: user.id,
    activity_type: "buyer_linked",
    new_value: buyerId,
  });

  revalidatePath(`/cases/${caseId}`);
}

// ── Delete a case (admin only) ────────────────────────────────────────────────
export async function deleteCase(caseId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user!.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Admin access required");

  const { error } = await supabase.from("cases").delete().eq("id", caseId);
  if (error) throw new Error(error.message);

  revalidatePath("/cases");
  revalidateTag("cases");
  redirect("/cases");
}

// ── Bulk status update ────────────────────────────────────────────────────────
export async function bulkUpdateCaseStatus(
  caseIds: string[],
  newStatus: CaseStatus
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("cases")
    .update({ status: newStatus })
    .in("id", caseIds);

  if (error) throw new Error(error.message);

  revalidatePath("/cases");
  revalidateTag("cases");
}
