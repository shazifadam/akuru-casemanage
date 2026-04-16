export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listUsers } from "@/lib/actions/users";
import { UserList } from "@/components/settings/user-list";
import { InviteUserForm } from "@/components/settings/invite-user-form";
import { ContributorsSection } from "@/components/settings/contributors-section";
import { FontsSection } from "@/components/settings/fonts-section";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

const TABS = [
  { key: "contributors", label: "Contributors" },
  { key: "fonts",        label: "Fonts" },
  { key: "users",        label: "Users" },
];

export default async function SettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = params.tab ?? "contributors";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">System settings — Admin only.</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">You need admin privileges to access settings.</p>
        </div>
      </div>
    );
  }

  const serviceKeyConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  let users: Awaited<ReturnType<typeof listUsers>> = [];
  let fetchError: string | null = null;

  if (serviceKeyConfigured && tab === "users") {
    try {
      users = await listUsers();
    } catch (err) {
      fetchError = err instanceof Error ? err.message : "Failed to load users";
    }
  }

  // Contributors & Fonts data (loaded only when needed)
  const [{ data: contributors }, { data: fonts }] = await Promise.all([
    tab === "contributors" || tab === "fonts"
      ? supabase
          .from("contributors")
          .select("id, name, contact_email, share_percentage, status, created_at, updated_at")
          .order("name")
      : { data: [] },
    tab === "fonts"
      ? supabase
          .from("fonts")
          .select(
            "id, name, contributor_id, base_price, contributor_share_pct, commission_model, gst_rate, status, created_at, updated_at, contributor:contributors(name)"
          )
          .order("name")
      : { data: [] },
  ]);

  // For the fonts section we also always need contributors list (for the contributor select)
  const { data: allContributors } = await supabase
    .from("contributors")
    .select("id, name, share_percentage")
    .eq("status", "active")
    .order("name");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-xs text-muted-foreground">Manage team, contributors, and fonts</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border pb-0">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/settings?tab=${t.key}`}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* ── Users tab ───────────────────────────────────────────────────────── */}
      {tab === "users" && (
        <div className="space-y-6">
          {!serviceKeyConfigured && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-2">
              <div className="flex gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-900">Service role key required</p>
                  <p className="text-xs text-amber-700">
                    Add{" "}
                    <code className="rounded bg-amber-100 px-1 font-mono">
                      SUPABASE_SERVICE_ROLE_KEY
                    </code>{" "}
                    to{" "}
                    <code className="rounded bg-amber-100 px-1 font-mono">.env.local</code> to
                    enable user management.
                  </p>
                  <p className="text-xs text-amber-600">
                    Find it in: Supabase Dashboard → Project Settings → API →{" "}
                    <strong>service_role</strong> (secret key)
                  </p>
                </div>
              </div>
            </div>
          )}

          {fetchError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">{fetchError}</p>
            </div>
          )}

          {serviceKeyConfigured && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-1">
                <InviteUserForm />
              </div>
              <div className="xl:col-span-2">
                {users.length > 0 ? (
                  <UserList users={users} currentUserId={user.id} />
                ) : (
                  <div className="rounded-xl border border-border bg-card p-8 text-center">
                    <p className="text-sm text-muted-foreground">No users found.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Contributors tab ─────────────────────────────────────────────────── */}
      {tab === "contributors" && (
        <ContributorsSection contributors={(contributors ?? []) as any} />
      )}

      {/* ── Fonts tab ────────────────────────────────────────────────────────── */}
      {tab === "fonts" && (
        <FontsSection
          fonts={(fonts ?? []) as any}
          contributors={allContributors ?? []}
        />
      )}
    </div>
  );
}
