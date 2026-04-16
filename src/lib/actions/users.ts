"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";
import { z } from "zod";
import { CreateUserSchema } from "@/lib/validations";

// ── Guard: only admins may call these actions ──────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Admin access required");
  return user;
}

// ── List all users ─────────────────────────────────────────────────────────────
export async function listUsers(): Promise<{
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
}[]> {
  await requireAdmin();
  const admin = createAdminClient();

  // Get auth users (email, last_sign_in_at)
  const { data: authData, error: authError } = await admin.auth.admin.listUsers();
  if (authError) {
    console.error("[listUsers] Auth error:", authError.message);
    throw new Error("Operation failed. Please try again.");
  }

  // Get public.users (full_name, role)
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("users")
    .select("id, full_name, role, created_at");

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p])
  );

  return (authData.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    full_name: profileMap[u.id]?.full_name ?? null,
    role: (profileMap[u.id]?.role ?? "enforcer") as UserRole,
    created_at: profileMap[u.id]?.created_at ?? u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
  }));
}

// ── Create a new user ──────────────────────────────────────────────────────────
export async function createUser(formData: FormData): Promise<{ tempPassword: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const parsed = CreateUserSchema.safeParse({
    email:     (formData.get("email") as string)?.trim().toLowerCase(),
    full_name: (formData.get("full_name") as string)?.trim(),
    role:      formData.get("role") ?? "enforcer",
  });
  if (!parsed.success) throw new Error(parsed.error.errors[0].message);
  const email     = parsed.data.email;
  const full_name = parsed.data.full_name;
  const role      = parsed.data.role;

  // Generate a secure temporary password
  const { randomBytes } = await import("crypto");
  const tempPassword =
    randomBytes(9).toString("base64url") + // ~12 chars, URL-safe
    "!A1"; // guaranteed special char + digit + uppercase for password policy

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,        // skip email verification
    user_metadata: { full_name },
  });

  if (error) {
    console.error("[createUser] Auth error:", error.message);
    throw new Error("Operation failed. Please try again.");
  }

  // Upsert into public.users with desired role
  // (the trigger handle_new_user may have already created the row as 'enforcer')
  const supabase = await createClient();
  await supabase
    .from("users")
    .upsert({ id: data.user.id, full_name, role }, { onConflict: "id" });

  revalidatePath("/settings");
  return { tempPassword };
}

// ── Update a user's role ───────────────────────────────────────────────────────
export async function updateUserRole(userId: string, role: UserRole) {
  const currentUser = await requireAdmin();

  if (userId === currentUser.id) {
    throw new Error("You cannot change your own role");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId);

  if (error) {
    console.error("[updateUserRole] DB error:", error.message);
    throw new Error("Operation failed. Please try again.");
  }
  revalidatePath("/settings");
}

// ── Update a user's display name ───────────────────────────────────────────────
export async function updateUserName(userId: string, full_name: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ full_name: full_name.trim() })
    .eq("id", userId);

  if (error) {
    console.error("[updateUserName] DB error:", error.message);
    throw new Error("Operation failed. Please try again.");
  }
  revalidatePath("/settings");
}

// ── Delete a user ──────────────────────────────────────────────────────────────
export async function deleteUser(userId: string) {
  const currentUser = await requireAdmin();

  if (userId === currentUser.id) {
    throw new Error("You cannot delete your own account");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[deleteUser] Auth error:", error.message);
    throw new Error("Operation failed. Please try again.");
  }

  revalidatePath("/settings");
}
