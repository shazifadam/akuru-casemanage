"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AdjustmentTarget    = "revenue" | "gst" | "contributor_share" | "akuru_share";
export type AdjustmentDirection = "add" | "subtract";

export interface FinancialAdjustment {
  id:         string;
  amount:     number;
  direction:  AdjustmentDirection;
  target:     AdjustmentTarget;
  reason:     string;
  entry_date: string;
  created_at: string;
}

type ActionResult = { success: true } | { success: false; error: string };

// ── Create adjustment ─────────────────────────────────────────────────────────
export async function createAdjustment(input: {
  amount:    number;
  direction: AdjustmentDirection;
  target:    AdjustmentTarget;
  reason:    string;
  entry_date: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Not authenticated." };

    const { data: profile } = await supabase
      .from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { success: false, error: "Admin access required." };

    if (!input.reason?.trim())    return { success: false, error: "Reason is required." };
    if (!input.amount || input.amount <= 0) return { success: false, error: "Amount must be greater than zero." };

    const validTargets:    AdjustmentTarget[]    = ["revenue", "gst", "contributor_share", "akuru_share"];
    const validDirections: AdjustmentDirection[] = ["add", "subtract"];
    if (!validTargets.includes(input.target))       return { success: false, error: "Invalid target." };
    if (!validDirections.includes(input.direction)) return { success: false, error: "Invalid direction." };

    const { error } = await supabase.from("financial_adjustments").insert({
      amount:     input.amount,
      direction:  input.direction,
      target:     input.target,
      reason:     input.reason.trim(),
      entry_date: input.entry_date,
      created_by: user.id,
    });

    if (error) {
      console.error("[createAdjustment] DB error:", error.message);
      return { success: false, error: `Could not save adjustment: ${error.message}` };
    }

    revalidatePath("/reports");
    return { success: true };
  } catch (err) {
    console.error("[createAdjustment] unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ── Delete adjustment (admin only) ────────────────────────────────────────────
export async function deleteAdjustment(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Not authenticated." };

    const { data: profile } = await supabase
      .from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { success: false, error: "Admin access required." };

    const { error } = await supabase
      .from("financial_adjustments").delete().eq("id", id);

    if (error) {
      console.error("[deleteAdjustment] DB error:", error.message);
      return { success: false, error: `Could not delete adjustment: ${error.message}` };
    }

    revalidatePath("/reports");
    return { success: true };
  } catch (err) {
    console.error("[deleteAdjustment] unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}
