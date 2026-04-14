import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { getBuyers, getLicenseCountsByBuyer } from "@/lib/data/queries";
import { BUYER_TYPE_LABELS } from "@/types/database";
import type { BuyerType } from "@/types/database";

interface PageProps {
  searchParams: Promise<{ q?: string; type?: string }>;
}

export default async function BuyersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // ── Auth check ─────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Cached data ────────────────────────────────────────────────────────────
  const [buyers, licenseCounts] = await Promise.all([
    getBuyers({ q: params.q, type: params.type }),
    getLicenseCountsByBuyer(),
  ]);

  const countMap = licenseCounts.reduce<Record<string, number>>((acc, l) => {
    acc[l.buyer_id] = (acc[l.buyer_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Buyer Directory</h2>
          <p className="text-xs text-muted-foreground">{buyers.length} contacts</p>
        </div>
        <Button asChild size="sm">
          <Link href="/buyers/new">
            <Plus className="h-4 w-4" />
            New Buyer
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          placeholder="Search by name..."
          defaultValue={params.q ?? ""}
          className="h-8 w-48 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <select
          name="type"
          defaultValue={params.type ?? ""}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All types</option>
          {(Object.entries(BUYER_TYPE_LABELS) as [BuyerType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          type="submit"
          className="h-8 rounded-md border border-input bg-background px-3 text-xs hover:bg-accent transition-colors"
        >
          Filter
        </button>
        {(params.q || params.type) && (
          <Link
            href="/buyers"
            className="h-8 flex items-center px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Grid */}
      {buyers.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No buyers found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Name", "Organization", "Type", "Email", "Licenses"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {buyers.map((b) => (
                <tr key={b.id} className="group hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-4">
                    <Link
                      href={`/buyers/${b.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    {b.organization ?? "—"}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {BUYER_TYPE_LABELS[b.buyer_type as BuyerType]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">{b.email ?? "—"}</td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    {countMap[b.id] ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
