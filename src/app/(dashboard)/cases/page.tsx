import Link from "next/link";
import { Plus, LayoutList, Kanban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CaseTable } from "@/components/cases/case-table";
import { CaseFilters } from "@/components/cases/case-filters";
import { CaseKanban } from "@/components/cases/case-kanban";
import type { CaseWithRelations, CaseStatus, CasePriority } from "@/types/database";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    font?: string;
    party?: string;
    q?: string;
    view?: string;
  }>;
}

export default async function CasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Fetch current user role
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user!.id)
    .single();
  const isAdmin = profile?.role === "admin";

  // Fetch fonts for filter dropdown
  const { data: fonts } = await supabase
    .from("fonts")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  // Build cases query with joins
  let query = supabase
    .from("cases")
    .select(`
      *,
      font:fonts(id, name),
      buyer:buyers(id, name, organization),
      identified_by_user:users(id, full_name)
    `)
    .order("created_at", { ascending: false });

  // Apply filters
  if (params.status) query = query.eq("status", params.status as CaseStatus);
  if (params.priority) query = query.eq("priority", params.priority as CasePriority);
  if (params.font) query = query.eq("font_id", params.font);
  if (params.party) query = query.ilike("party", `%${params.party}%`);
  if (params.q) {
    query = query.or(
      `title.ilike.%${params.q}%,usage_description.ilike.%${params.q}%,constituency.ilike.%${params.q}%`
    );
  }

  const { data: cases } = await query;

  const isKanban = params.view === "kanban";

  // Pipeline counts for the status bar
  const statusCounts: Partial<Record<CaseStatus, number>> = {};
  (cases ?? []).forEach((c) => {
    statusCounts[c.status as CaseStatus] = (statusCounts[c.status as CaseStatus] ?? 0) + 1;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Cases</h2>
          <p className="text-xs text-muted-foreground">
            {cases?.length ?? 0} case{cases?.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/cases/new">
            <Plus className="h-4 w-4" />
            New Case
          </Link>
        </Button>
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CaseFilters fonts={fonts ?? []} />
        <div className="flex items-center gap-1 rounded-md border border-border p-1">
          <Link
            href={`/cases?${new URLSearchParams({ ...params, view: "table" }).toString()}`}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${
              !isKanban
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Table
          </Link>
          <Link
            href={`/cases?${new URLSearchParams({ ...params, view: "kanban" }).toString()}`}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${
              isKanban
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            Kanban
          </Link>
        </div>
      </div>

      {/* View */}
      {isKanban ? (
        <CaseKanban cases={(cases ?? []) as CaseWithRelations[]} />
      ) : (
        <CaseTable cases={(cases ?? []) as CaseWithRelations[]} isAdmin={isAdmin} />
      )}
    </div>
  );
}
