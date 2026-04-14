import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={appUser.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={appUser} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
