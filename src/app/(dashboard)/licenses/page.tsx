import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LicensePaymentBadge } from "@/components/licenses/license-payment-badge";
import { LicenseSourceBadge } from "@/components/licenses/license-source-badge";
import { getLicenses, getActiveFonts } from "@/lib/data/queries";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { FilterBar } from "@/components/ui/filter-bar";
import { SortableHeader } from "@/components/ui/sortable-header";
import type { PaymentStatus, LicenseSource } from "@/types/database";

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
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <SortableHeader column="license_number" label="License #" />
                <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Buyer</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Font</th>
                <SortableHeader column="purchase_date" label="Date" />
                <SortableHeader column="invoice_amount" label="Amount" />
                <SortableHeader column="payment_status" label="Status" />
                <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Source</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">QB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {licenses.map((l) => (
                <tr
                  key={l.id}
                  className="group hover:bg-muted/20 transition-colors cursor-pointer"
                >
                  <td>
                    <Link href={`/licenses/${l.id}`} className="flex items-center gap-1.5 px-4 py-4">
                      <span className="font-mono text-xs font-medium text-primary">
                        {l.license_number}
                      </span>
                      {l.is_fine && (
                        <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-700">
                          FINE
                        </span>
                      )}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/licenses/${l.id}`} className="block px-4 py-4">
                      <div className="text-xs font-medium">{(l.buyer as any)?.name ?? "—"}</div>
                      {(l.buyer as any)?.organization && (
                        <div className="text-[10px] text-muted-foreground">
                          {(l.buyer as any).organization}
                        </div>
                      )}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/licenses/${l.id}`} className="block px-4 py-4 text-xs text-muted-foreground">
                      {(l.font as any)?.name ?? "—"}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/licenses/${l.id}`} className="block px-4 py-4 text-xs text-muted-foreground">
                      {l.purchase_date}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/licenses/${l.id}`} className="block px-4 py-4 text-xs font-medium">
                      {mvr(l.invoice_amount)}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/licenses/${l.id}`} className="block px-4 py-4">
                      <LicensePaymentBadge status={l.payment_status as PaymentStatus} />
                    </Link>
                  </td>
                  <td>
                    <Link href={`/licenses/${l.id}`} className="block px-4 py-4">
                      <LicenseSourceBadge source={l.source as LicenseSource} />
                    </Link>
                  </td>
                  <td>
                    <Link href={`/licenses/${l.id}`} className="block px-4 py-4">
                      <span className={`text-xs ${l.qb_synced ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {l.qb_synced ? "✓" : "—"}
                      </span>
                    </Link>
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
