import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { getLicenses, getActiveFonts } from "@/lib/data/queries";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { FilterBar } from "@/components/ui/filter-bar";
import { LicenseTable } from "@/components/licenses/license-table";

interface PageProps {
  searchParams: Promise<{
    font?:   string;
    status?: string;
    source?: string;
    q?:      string;
    from?:   string;
    to?:     string;
    sort?:   string;
    order?:  string;
  }>;
}

function mvr(amount: number) {
  return `MVR ${amount.toLocaleString("en-MV", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function LicensesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // ── Auth check ─────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Cached data ────────────────────────────────────────────────────────────
  const [licenses, fonts] = await Promise.all([
    getLicenses({
      font:   params.font,
      status: params.status,
      source: params.source,
      q:      params.q,
      from:   params.from,
      to:     params.to,
      sort:   params.sort,
      order:  params.order,
    }),
    getActiveFonts(),
  ]);

  const totalRevenue = licenses.reduce((sum, l) => sum + (l.invoice_amount ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">License Registry</h2>
          <p className="text-xs text-muted-foreground">
            {licenses.length} license{licenses.length !== 1 ? "s" : ""} · Total: {mvr(totalRevenue)}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/licenses/new">
            <Plus className="h-4 w-4" />
            New License
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <FilterBar>
        <Input
          name="q"
          placeholder="Search license #..."
          className="h-8 w-40 text-xs"
          defaultValue={params.q ?? ""}
        />
        <select
          name="font"
          defaultValue={params.font ?? ""}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All fonts</option>
          {fonts.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <select
          name="source"
          defaultValue={params.source ?? ""}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All sources</option>
          <option value="direct_sale">Direct Sale</option>
          <option value="enforcement">Enforcement</option>
          <option value="election_case">Election Case</option>
        </select>
        <DateRangePicker fromParam="from" toParam="to" />
        <button
          type="submit"
          className="h-8 rounded-md border border-input bg-background px-3 text-xs hover:bg-accent transition-colors group-[.is-dirty]:bg-primary group-[.is-dirty]:text-primary-foreground group-[.is-dirty]:border-primary"
        >
          Filter
        </button>
        {(params.font || params.status || params.source || params.q || params.from || params.to) && (
          <Link
            href="/licenses"
            className="h-8 flex items-center px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </FilterBar>

      {/* Table */}
      {licenses.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No licenses found.</p>
        </div>
      ) : (
        <LicenseTable licenses={licenses as any} />
      )}
    </div>
  );
}
