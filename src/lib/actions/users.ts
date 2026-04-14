"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

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
  if (authError) throw new Error(authError.message);

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

  const email     = (formData.get("email") as string).trim().toLowerCase();
  const full_name = (formData.get("full_name") as string).trim();
  const role      = (formData.get("role") as UserRole) ?? "enforcer";

  if (!email) throw new Error("Email is required");
  if (!full_name) throw new Error("Full name is required");

  // Generate a secure temporary password
  const tempPassword =
    Math.random().toString(36).slice(2, 8).toUpperCase() +
    Math.random().toString(36).slice(2, 6) +
    "!2";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,        // skip email verification
    user_metadata: { full_name },
  });

  if (error) throw new Error(error.message);

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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}
