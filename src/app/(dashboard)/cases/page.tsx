import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, LayoutList, Kanban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CaseTable } from "@/components/cases/case-table";
import { CaseFilters } from "@/components/cases/case-filters";
import { CaseKanban } from "@/components/cases/case-kanban";
import { getCases, getActiveFonts } from "@/lib/data/queries";
import type { CaseWithRelations, CaseStatus } from "@/types/database";

interface PageProps {
  searchParams: Promise<{
    status?:   string;
    priority?: string;
    font?:     string;
    party?:    string;
    q?:        string;
    view?:     string;
  }>;
}

export default async function CasesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // ── Auth check (always dynamic — needs cookies) ───────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  // ── Cached data queries ───────────────────────────────────────────────────
  const [cases, fonts] = await Promise.all([
    getCases({
      status:   params.status,
      priority: params.priority,
      font:     params.font,
      party:    params.party,
      q:        params.q,
    }),
    getActiveFonts(),
  ]);

  const isKanban = params.view === "kanban";

  const statusCounts: Partial<Record<CaseStatus, number>> = {};
  cases.forEach((c) => {
    statusCounts[c.status as CaseStatus] = (statusCounts[c.status as CaseStatus] ?? 0) + 1;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Cases</h2>
          <p className="text-xs text-muted-foreground">
            {cases.length} case{cases.length !== 1 ? "s" : ""} found
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
        <CaseFilters fonts={fonts.map((f) => ({ id: f.id, name: f.name }))} />
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
        <CaseKanban cases={cases as unknown as CaseWithRelations[]} />
      ) : (
        <CaseTable cases={cases as unknown as CaseWithRelations[]} isAdmin={isAdmin} />
      )}
    </div>
  );
}
