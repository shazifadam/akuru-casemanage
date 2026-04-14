import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { AppUser } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile from our users table
  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  const appUser: AppUser = {
    id: user.id,
    email: user.email!,
    role: profile?.role ?? "enforcer",
    full_name: profile?.full_name ?? null,
  };

  return (
    <DashboardShell user={appUser}>
      {children}
    </DashboardShell>
  );
}
