"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BuyerType } from "@/types/database";
import { z } from "zod";
import { CreateBuyerSchema, UpdateBuyerSchema } from "@/lib/validations";

type ActionResult = { success: true } | { success: false; error: string };

// ── Create a buyer ─────────────────────────────────────────────────────────────
// Uses redirect() on success — keep throw pattern but redirect signal is re-thrown.
export async function createBuyer(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    const parsed = CreateBuyerSchema.safeParse({
      name:         (formData.get("name") as string)?.trim(),
      email:        (formData.get("email") as string)?.trim() || null,
      organization: (formData.get("organization") as string)?.trim() || null,
      buyer_type:   formData.get("buyer_type"),
      notes:        (formData.get("notes") as string)?.trim() || null,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path  = issue?.path?.join(".") ?? "unknown";
      const msg   = issue?.message ?? "Validation failed";
      console.error("[createBuyer] validation error:", path, msg);
      return { success: false, error: `${msg} (field: ${path})` };
    }

    // Normalize name
    const rawName = parsed.data.name.trim();
    const name = rawName
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

    const payload = {
      name,
      email: parsed.data.email ?? null,
      organization: parsed.data.organization ?? null,
      buyer_type: parsed.data.buyer_type as BuyerType,
      notes: parsed.data.notes ?? null,
    };

    const { data, error } = await supabase
      .from("buyers")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("[createBuyer] DB error:", error.message, error.code);
      return { success: false, error: `Could not create buyer: ${error.message}` };
    }

    revalidatePath("/buyers");
    revalidateTag("buyers");
    redirect(`/buyers/${data.id}`);
  } catch (err) {
    // redirect() throws internally — re-throw it so Next.js handles navigation
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    console.error("[createBuyer] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Update a buyer ─────────────────────────────────────────────────────────────
export async function updateBuyer(buyerId: string, formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    const parsed = UpdateBuyerSchema.safeParse({
      name:         (formData.get("name") as string)?.trim(),
      email:        (formData.get("email") as string)?.trim() || null,
      organization: (formData.get("organization") as string)?.trim() || null,
      buyer_type:   formData.get("buyer_type"),
      notes:        (formData.get("notes") as string)?.trim() || null,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path  = issue?.path?.join(".") ?? "unknown";
      const msg   = issue?.message ?? "Validation failed";
      console.error("[updateBuyer] validation error:", path, msg);
      return { success: false, error: `${msg} (field: ${path})` };
    }

    const rawName = parsed.data.name.trim();
    const name = rawName
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

    const { error } = await supabase
      .from("buyers")
      .update({
        name,
        email: parsed.data.email ?? null,
        organization: parsed.data.organization ?? null,
        buyer_type: parsed.data.buyer_type as BuyerType,
        notes: parsed.data.notes ?? null,
      })
      .eq("id", buyerId);

    if (error) {
      console.error("[updateBuyer] DB error:", error.message, error.code);
      return { success: false, error: `Could not save changes: ${error.message}` };
    }

    revalidatePath(`/buyers/${buyerId}`);
    revalidatePath("/buyers");
    revalidateTag("buyers");
    return { success: true };
  } catch (err) {
    console.error("[updateBuyer] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Quick-create a buyer (name only, returns id) ───────────────────────────────
export async function quickCreateBuyer(
  name: string,
  buyerType: BuyerType = "individual"
): Promise<{ success: true; id: string; name: string } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    const normalized = name
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

    const { data, error } = await supabase
      .from("buyers")
      .insert({ name: normalized, buyer_type: buyerType })
      .select("id, name")
      .single();

    if (error) {
      console.error("[quickCreateBuyer] DB error:", error.message, error.code);
      return { success: false, error: `Could not create buyer: ${error.message}` };
    }

    revalidatePath("/buyers");
    revalidateTag("buyers");
    return { success: true, id: data.id, name: data.name };
  } catch (err) {
    console.error("[quickCreateBuyer] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Search for similar buyer names (fuzzy dedup) ───────────────────────────────
export async function searchSimilarBuyers(name: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("search_similar_buyers", {
    search_name: name,
  });

  if (error) return [];
  return data ?? [];
}

// ── Merge two buyer records ────────────────────────────────────────────────────
// Reassigns all licenses and cases from sourceId → targetId, then deletes source
// Uses redirect() — re-throws redirect signal.
export async function mergeBuyers(targetId: string, sourceId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated. Please log in again." };
    }

    // Merging buyers is irreversible — admin only
    const { data: profile } = await supabase
      .from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return { success: false, error: "Admin access required to merge buyers." };
    }

    // Reassign licenses
    await supabase
      .from("licenses")
      .update({ buyer_id: targetId })
      .eq("buyer_id", sourceId);

    // Reassign cases
    await supabase
      .from("cases")
      .update({ buyer_id: targetId })
      .eq("buyer_id", sourceId);

    // Delete the source buyer
    const { error } = await supabase.from("buyers").delete().eq("id", sourceId);
    if (error) {
      console.error("[mergeBuyers] DB error:", error.message, error.code);
      return { success: false, error: `Merge failed: ${error.message}` };
    }

    revalidatePath("/buyers");
    revalidatePath(`/buyers/${targetId}`);
    revalidateTag("buyers");
    redirect(`/buyers/${targetId}`);
  } catch (err) {
    // redirect() throws internally — re-throw it so Next.js handles navigation
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    console.error("[mergeBuyers] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Delete a buyer (admin only) ────────────────────────────────────────────────
export async function deleteBuyer(buyerId: string): Promise<ActionResult> {
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

    const { error } = await supabase.from("buyers").delete().eq("id", buyerId);
    if (error) {
      console.error("[deleteBuyer] DB error:", error.message, error.code);
      return { success: false, error: `Could not delete buyer: ${error.message}` };
    }

    revalidatePath("/buyers");
    revalidateTag("buyers");
    redirect("/buyers");
  } catch (err) {
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    console.error("[deleteBuyer] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}
