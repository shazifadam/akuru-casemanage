"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CommissionModel, FontStatus, ContributorStatus } from "@/types/database";
import { z } from "zod";
import {
  CreateContributorSchema, UpdateContributorSchema,
  CreateFontSchema, UpdateFontSchema,
} from "@/lib/validations";

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

  const parsed = CreateContributorSchema.safeParse({
    name:             (formData.get("name") as string)?.trim(),
    contact_email:    (formData.get("contact_email") as string)?.trim() || null,
    share_percentage: parseFloat(formData.get("share_percentage") as string) || 50,
  });
  if (!parsed.success) throw new Error(parsed.error.errors[0].message);

  const { error } = await supabase.from("contributors").insert({
    name: parsed.data.name,
    contact_email: parsed.data.contact_email ?? null,
    share_percentage: parsed.data.share_percentage,
    status: "active",
  });

  if (error) {
    console.error("[createContributor] DB error:", error.message);
    throw new Error("Operation failed. Please try again.");
  }
  revalidatePath("/settings");
  revalidatePath("/contributors");
  revalidateTag("contributors");
}

export async function updateContributor(contributorId: string, formData: FormData) {
  const supabase = await requireAdmin();

  const parsed = UpdateContributorSchema.safeParse({
    name:             (formData.get("name") as string)?.trim(),
    contact_email:    (formData.get("contact_email") as string)?.trim() || null,
    share_percentage: parseFloat(formData.get("share_percentage") as string) || 50,
    status:           formData.get("status"),
  });
  if (!parsed.success) throw new Error(parsed.error.errors[0].message);

  const { error } = await supabase
    .from("contributors")
    .update({
      name: parsed.data.name,
      contact_email: parsed.data.contact_email ?? null,
      share_percentage: parsed.data.share_percentage,
      status: parsed.data.status as ContributorStatus,
    })
    .eq("id", contributorId);

  if (error) {
    console.error("[updateContributor] DB error:", error.message);
    throw new Error("Operation failed. Please try again.");
  }
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
  if (error) {
    console.error("[deleteContributor] DB error:", error.message);
    throw new Error("Operation failed. Please try again.");
  }
  revalidatePath("/settings");
  revalidatePath("/contributors");
  revalidateTag("contributors");
}

// ── Fonts ─────────────────────────────────────────────────────────────────────

export async function createFont(formData: FormData) {
  const supabase = await requireAdmin();

  const parsed = CreateFontSchema.safeParse({
    name:                  (formData.get("name") as string)?.trim(),
    contributor_id:        formData.get("contributor_id"),
    base_price:            parseFloat(formData.get("base_price") as string),
    contributor_share_pct: parseFloat(formData.get("contributor_share_pct") as string),
    commission_model:      formData.get("commission_model") ?? "contributor_owned",
    gst_rate:              parseFloat(formData.get("gst_rate") as string),
  });
  if (!parsed.success) throw new Error(parsed.error.errors[0].message);

  const { error } = await supabase.from("fonts").insert({
    name: parsed.data.name,
    contributor_id: parsed.data.contributor_id,
    base_price: parsed.data.base_price,
    contributor_share_pct: parsed.data.contributor_share_pct,
    commission_model: parsed.data.commission_model as CommissionModel,
    gst_rate: parsed.data.gst_rate,
    status: "active",
  });

  if (error) {
    console.error("[createFont] DB error:", error.message);
    throw new Error("Operation failed. Please try again.");
  }
  revalidatePath("/settings");
  revalidatePath("/licenses/new");
  revalidatePath("/cases/new");
  revalidateTag("fonts");
}

export async function updateFont(fontId: string, formData: FormData) {
  const supabase = await requireAdmin();

  const parsed = UpdateFontSchema.safeParse({
    name:                  (formData.get("name") as string)?.trim(),
    contributor_id:        formData.get("contributor_id"),
    base_price:            parseFloat(formData.get("base_price") as string),
    contributor_share_pct: parseFloat(formData.get("contributor_share_pct") as string),
    commission_model:      formData.get("commission_model"),
    gst_rate:              parseFloat(formData.get("gst_rate") as string),
    status:                formData.get("status"),
  });
  if (!parsed.success) throw new Error(parsed.error.errors[0].message);

  const { error } = await supabase
    .from("fonts")
    .update({
      name: parsed.data.name,
      contributor_id: parsed.data.contributor_id,
      base_price: parsed.data.base_price,
      contributor_share_pct: parsed.data.contributor_share_pct,
      commission_model: parsed.data.commission_model as CommissionModel,
      gst_rate: parsed.data.gst_rate,
      status: parsed.data.status as FontStatus,
    })
    .eq("id", fontId);

  if (error) {
    console.error("[updateFont] DB error:", error.message);
    throw new Error("Operation failed. Please try again.");
  }
  revalidatePath("/settings");
  revalidatePath("/licenses/new");
  revalidateTag("fonts");
}

export async function deleteFont(fontId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("fonts").delete().eq("id", fontId);
  if (error) {
    console.error("[deleteFont] DB error:", error.message);
    throw new Error("Operation failed. Please try again.");
  }
  revalidatePath("/settings");
  revalidatePath("/licenses/new");
  revalidateTag("fonts");
}
