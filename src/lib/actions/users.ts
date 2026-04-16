"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";
import { z } from "zod";
import { CreateUserSchema } from "@/lib/validations";

type ActionResult = { success: true } | { success: false; error: string };

// ── Guard: only admins may call these actions ──────────────────────────────────
async function requireAdmin(): Promise<
  | { user: { id: string }; error: null }
  | { user: null; error: string }
> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { user: null, error: "Not authenticated. Please log in again." };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { user: null, error: "Admin access required." };
  return { user, error: null };
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
  const { error: adminError } = await requireAdmin();
  if (adminError) throw new Error(adminError);

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
export async function createUser(
  formData: FormData
): Promise<{ success: true; tempPassword: string } | { success: false; error: string }> {
  try {
    const { error: adminError } = await requireAdmin();
    if (adminError) return { success: false, error: adminError };

    const admin = createAdminClient();

    const parsed = CreateUserSchema.safeParse({
      email:     (formData.get("email") as string)?.trim().toLowerCase(),
      full_name: (formData.get("full_name") as string)?.trim(),
      role:      formData.get("role") ?? "enforcer",
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path  = issue?.path?.join(".") ?? "unknown";
      const msg   = issue?.message ?? "Validation failed";
      console.error("[createUser] validation error:", path, msg);
      return { success: false, error: `${msg} (field: ${path})` };
    }

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
      return { success: false, error: `Could not create user: ${error.message}` };
    }

    // Upsert into public.users with desired role
    // (the trigger handle_new_user may have already created the row as 'enforcer')
    const supabase = await createClient();
    await supabase
      .from("users")
      .upsert({ id: data.user.id, full_name, role }, { onConflict: "id" });

    revalidatePath("/settings");
    return { success: true, tempPassword };
  } catch (err) {
    console.error("[createUser] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Update a user's role ───────────────────────────────────────────────────────
export async function updateUserRole(userId: string, role: UserRole): Promise<ActionResult> {
  try {
    const { user: currentUser, error: adminError } = await requireAdmin();
    if (adminError) return { success: false, error: adminError };

    if (userId === currentUser!.id) {
      return { success: false, error: "You cannot change your own role." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", userId);

    if (error) {
      console.error("[updateUserRole] DB error:", error.message, error.code);
      return { success: false, error: `Could not update role: ${error.message}` };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("[updateUserRole] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Update a user's display name ───────────────────────────────────────────────
export async function updateUserName(userId: string, full_name: string): Promise<ActionResult> {
  try {
    const { error: adminError } = await requireAdmin();
    if (adminError) return { success: false, error: adminError };

    const supabase = await createClient();
    const { error } = await supabase
      .from("users")
      .update({ full_name: full_name.trim() })
      .eq("id", userId);

    if (error) {
      console.error("[updateUserName] DB error:", error.message, error.code);
      return { success: false, error: `Could not update name: ${error.message}` };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("[updateUserName] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

// ── Delete a user ──────────────────────────────────────────────────────────────
export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    const { user: currentUser, error: adminError } = await requireAdmin();
    if (adminError) return { success: false, error: adminError };

    if (userId === currentUser!.id) {
      return { success: false, error: "You cannot delete your own account." };
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("[deleteUser] Auth error:", error.message);
      return { success: false, error: `Could not delete user: ${error.message}` };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("[deleteUser] unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}
