"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BuyerType } from "@/types/database";

// ── Create a buyer ─────────────────────────────────────────────────────────────
export async function createBuyer(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Normalize name
  const rawName = (formData.get("name") as string).trim();
  const name = rawName
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  const payload = {
    name,
    email: (formData.get("email") as string).trim() || null,
    organization: (formData.get("organization") as string).trim() || null,
    buyer_type: (formData.get("buyer_type") as BuyerType) ?? "individual",
    notes: (formData.get("notes") as string).trim() || null,
  };

  const { data, error } = await supabase
    .from("buyers")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/buyers");
  redirect(`/buyers/${data.id}`);
}

// ── Update a buyer ─────────────────────────────────────────────────────────────
export async function updateBuyer(buyerId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const rawName = (formData.get("name") as string).trim();
  const name = rawName
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  const { error } = await supabase
    .from("buyers")
    .update({
      name,
      email: (formData.get("email") as string).trim() || null,
      organization: (formData.get("organization") as string).trim() || null,
      buyer_type: formData.get("buyer_type") as BuyerType,
      notes: (formData.get("notes") as string).trim() || null,
    })
    .eq("id", buyerId);

  if (error) throw new Error(error.message);

  revalidatePath(`/buyers/${buyerId}`);
  revalidatePath("/buyers");
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
export async function mergeBuyers(targetId: string, sourceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

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
  if (error) throw new Error(error.message);

  revalidatePath("/buyers");
  revalidatePath(`/buyers/${targetId}`);
  redirect(`/buyers/${targetId}`);
}

// ── Delete a buyer (admin only) ────────────────────────────────────────────────
export async function deleteBuyer(buyerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Admin access required");

  const { error } = await supabase.from("buyers").delete().eq("id", buyerId);
  if (error) throw new Error(error.message);

  revalidatePath("/buyers");
  redirect("/buyers");
}
