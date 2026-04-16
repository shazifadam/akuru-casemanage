"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CommissionModel, FontStatus, ContributorStatus } from "@/types/database";
import { z } from "zod";
import {
  CreateContributorSchema, UpdateContributorSchema,
  CreateFontSchema, UpdateFontSchema,
} from "@/lib/validations";

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin(): Promise<
  | { supabase: Awaited<ReturnType<typeof createClient>>; error: null }
  | { supabase: null; error: string }
> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { supabase: null, error: "Not authenticated. Please log in again." };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { supabase: null, error: "Admin access required." };
  return { supabase, error: null };
}

// ── Contributors ──────────────────────────────────────────────────────────────

export async function createContributor(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, error: adminError } = await requireAdmin();
    if (adminError) return { success: false, error: adminError };

    const parsed = CreateContributorSchema.safeParse({
      name:             (formData.get("name") as string)?.trim(),
      contact_email:    (formData.get("contact_email") as string)?.trim() || null,
      share_percentage: parseFloat(formData.get("share_percentage") as string) || 50,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path  = issue?.path?.join(".") ?? "unknown";
      const msg   = issue?.message ?? "Validation failed";
      console.error("[createContributor] validation error:", path, msg);
      return { success: false, error: `${msg} (field: ${path})` };
    }

    const { error } = await supabase!.from("contributors").insert({
      name: parsed.data.name,
      contact_email: parsed.data.contact_email ?? null,
      share_percentage: parsed.data.share_percentage,
      status: "active",
    });

    if (error) {
      console.error("[createContributor] DB error:", error.message, error.code);
      return { success: false, error: `Could not create contributor: ${error.message}` };
    }

    revalidatePath("/settings");
    revalidatePath("/contributors");
    revalidateTag("contributors");
    return { success: true };
  } catch (err) {
    console.error("[createContributor] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

export async function updateContributor(contributorId: string, formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, error: adminError } = await requireAdmin();
    if (adminError) return { success: false, error: adminError };

    const parsed = UpdateContributorSchema.safeParse({
      name:             (formData.get("name") as string)?.trim(),
      contact_email:    (formData.get("contact_email") as string)?.trim() || null,
      share_percentage: parseFloat(formData.get("share_percentage") as string) || 50,
      status:           formData.get("status"),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path  = issue?.path?.join(".") ?? "unknown";
      const msg   = issue?.message ?? "Validation failed";
      console.error("[updateContributor] validation error:", path, msg);
      return { success: false, error: `${msg} (field: ${path})` };
    }

    const { error } = await supabase!
      .from("contributors")
      .update({
        name: parsed.data.name,
        contact_email: parsed.data.contact_email ?? null,
        share_percentage: parsed.data.share_percentage,
        status: parsed.data.status as ContributorStatus,
      })
      .eq("id", contributorId);

    if (error) {
      console.error("[updateContributor] DB error:", error.message, error.code);
      return { success: false, error: `Could not save changes: ${error.message}` };
    }

    revalidatePath("/settings");
    revalidatePath("/contributors");
    revalidateTag("contributors");
    return { success: true };
  } catch (err) {
    console.error("[updateContributor] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

export async function deleteContributor(contributorId: string): Promise<ActionResult> {
  try {
    const { supabase, error: adminError } = await requireAdmin();
    if (adminError) return { success: false, error: adminError };

    const { error } = await supabase!
      .from("contributors")
      .delete()
      .eq("id", contributorId);

    if (error) {
      console.error("[deleteContributor] DB error:", error.message, error.code);
      return { success: false, error: `Could not delete contributor: ${error.message}` };
    }

    revalidatePath("/settings");
    revalidatePath("/contributors");
    revalidateTag("contributors");
    return { success: true };
  } catch (err) {
    console.error("[deleteContributor] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Fonts ─────────────────────────────────────────────────────────────────────

export async function createFont(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, error: adminError } = await requireAdmin();
    if (adminError) return { success: false, error: adminError };

    const parsed = CreateFontSchema.safeParse({
      name:                  (formData.get("name") as string)?.trim(),
      contributor_id:        formData.get("contributor_id"),
      base_price:            parseFloat(formData.get("base_price") as string),
      contributor_share_pct: parseFloat(formData.get("contributor_share_pct") as string),
      commission_model:      formData.get("commission_model") ?? "contributor_owned",
      gst_rate:              parseFloat(formData.get("gst_rate") as string),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path  = issue?.path?.join(".") ?? "unknown";
      const msg   = issue?.message ?? "Validation failed";
      console.error("[createFont] validation error:", path, msg);
      return { success: false, error: `${msg} (field: ${path})` };
    }

    const { error } = await supabase!.from("fonts").insert({
      name: parsed.data.name,
      contributor_id: parsed.data.contributor_id,
      base_price: parsed.data.base_price,
      contributor_share_pct: parsed.data.contributor_share_pct,
      commission_model: parsed.data.commission_model as CommissionModel,
      gst_rate: parsed.data.gst_rate,
      status: "active",
    });

    if (error) {
      console.error("[createFont] DB error:", error.message, error.code);
      return { success: false, error: `Could not create font: ${error.message}` };
    }

    revalidatePath("/settings");
    revalidatePath("/licenses/new");
    revalidatePath("/cases/new");
    revalidateTag("fonts");
    return { success: true };
  } catch (err) {
    console.error("[createFont] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

export async function updateFont(fontId: string, formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, error: adminError } = await requireAdmin();
    if (adminError) return { success: false, error: adminError };

    const parsed = UpdateFontSchema.safeParse({
      name:                  (formData.get("name") as string)?.trim(),
      contributor_id:        formData.get("contributor_id"),
      base_price:            parseFloat(formData.get("base_price") as string),
      contributor_share_pct: parseFloat(formData.get("contributor_share_pct") as string),
      commission_model:      formData.get("commission_model"),
      gst_rate:              parseFloat(formData.get("gst_rate") as string),
      status:                formData.get("status"),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path  = issue?.path?.join(".") ?? "unknown";
      const msg   = issue?.message ?? "Validation failed";
      console.error("[updateFont] validation error:", path, msg);
      return { success: false, error: `${msg} (field: ${path})` };
    }

    const { error } = await supabase!
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
      console.error("[updateFont] DB error:", error.message, error.code);
      return { success: false, error: `Could not save changes: ${error.message}` };
    }

    revalidatePath("/settings");
    revalidatePath("/licenses/new");
    revalidateTag("fonts");
    return { success: true };
  } catch (err) {
    console.error("[updateFont] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

export async function deleteFont(fontId: string): Promise<ActionResult> {
  try {
    const { supabase, error: adminError } = await requireAdmin();
    if (adminError) return { success: false, error: adminError };

    const { error } = await supabase!.from("fonts").delete().eq("id", fontId);

    if (error) {
      console.error("[deleteFont] DB error:", error.message, error.code);
      return { success: false, error: `Could not delete font: ${error.message}` };
    }

    revalidatePath("/settings");
    revalidatePath("/licenses/new");
    revalidateTag("fonts");
    return { success: true };
  } catch (err) {
    console.error("[deleteFont] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}
