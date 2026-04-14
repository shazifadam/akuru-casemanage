"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CommissionModel, FontStatus, ContributorStatus } from "@/types/database";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Admin access required");
  return supabase;
}

// ── Contributors ──────────────────────────────────────────────────────────────

export async function createContributor(formData: FormData) {
  const supabase = await requireAdmin();

  const { error } = await supabase.from("contributors").insert({
    name: (formData.get("name") as string).trim(),
    contact_email: (formData.get("contact_email") as string)?.trim() || null,
    share_percentage: parseFloat(formData.get("share_percentage") as string) || 50,
    status: "active",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/contributors");
  revalidateTag("contributors");
}

export async function updateContributor(contributorId: string, formData: FormData) {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("contributors")
    .update({
      name: (formData.get("name") as string).trim(),
      contact_email: (formData.get("contact_email") as string)?.trim() || null,
      share_percentage: parseFloat(formData.get("share_percentage") as string) || 50,
      status: formData.get("status") as ContributorStatus,
    })
    .eq("id", contributorId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/contributors");
  revalidateTag("contributors");
}

export async function deleteContributor(contributorId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("contributors")
    .delete()
    .eq("id", contributorId);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/contributors");
  revalidateTag("contributors");
}

// ── Fonts ─────────────────────────────────────────────────────────────────────

export async function createFont(formData: FormData) {
  const supabase = await requireAdmin();

  const { error } = await supabase.from("fonts").insert({
    name: (formData.get("name") as string).trim(),
    contributor_id: formData.get("contributor_id") as string,
    base_price: parseFloat(formData.get("base_price") as string) || 0,
    contributor_share_pct: parseFloat(formData.get("contributor_share_pct") as string) || 50,
    commission_model:
      (formData.get("commission_model") as CommissionModel) || "contributor_owned",
    gst_rate: parseFloat(formData.get("gst_rate") as string) || 0.08,
    status: "active",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/licenses/new");
  revalidatePath("/cases/new");
  revalidateTag("fonts");
}

export async function updateFont(fontId: string, formData: FormData) {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("fonts")
    .update({
      name: (formData.get("name") as string).trim(),
      contributor_id: formData.get("contributor_id") as string,
      base_price: parseFloat(formData.get("base_price") as string) || 0,
      contributor_share_pct:
        parseFloat(formData.get("contributor_share_pct") as string) || 50,
      commission_model: formData.get("commission_model") as CommissionModel,
      gst_rate: parseFloat(formData.get("gst_rate") as string) || 0.08,
      status: formData.get("status") as FontStatus,
    })
    .eq("id", fontId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/licenses/new");
  revalidateTag("fonts");
}

export async function deleteFont(fontId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("fonts").delete().eq("id", fontId);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/licenses/new");
  revalidateTag("fonts");
}
