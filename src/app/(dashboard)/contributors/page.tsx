export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TrendingUp, Wallet, ArrowRight } from "lucide-react";
import { getContributors, getContributorBalances } from "@/lib/data/queries";

function mvr(n: number) {
  return `MVR ${(n ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function ContributorsPage() {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Cached data ────────────────────────────────────────────────────────────
  const [contributors, balances] = await Promise.all([
    getContributors(),
    getContributorBalances(),
  ]);

  const balanceMap = Object.fromEntries(
    balances.map((b) => [b.contributor_id, b])
  );

  const activeContributors = contributors.filter((c) => c.status === "active");

  const totalOwed    = balances.reduce((s, b) => s + (b.balance_owed ?? 0), 0);
  const totalPaid    = balances.reduce((s, b) => s + (b.total_paid_out ?? 0), 0);
  const totalEarned  = balances.reduce((s, b) => s + (b.total_earned ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Contributors</h2>
        <p className="text-xs text-muted-foreground">Font designers and their payout tracking</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Earned (all time)",
            value: mvr(totalEarned),
            icon:  TrendingUp,
            color: "text-blue-600",
            bg:    "bg-blue-50",
          },
          {
            label: "Total Paid Out",
            value: mvr(totalPaid),
            icon:  Wallet,
            color: "text-emerald-600",
            bg:    "bg-emerald-50",
          },
          {
            label: "Outstanding Balance",
            value: mvr(totalOwed),
            icon:  ArrowRight,
            color: "text-amber-600",
            bg:    "bg-amber-50",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-card p-5 flex items-center gap-4"
            >
              <div className={`rounded-lg p-2.5 ${s.bg}`}>
                <Icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contributors table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {["Contributor", "Default Split", "Total Earned", "Paid Out", "Balance Owed", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left text-xs font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {activeContributors.map((c) => {
              const bal  = balanceMap[c.id];
              const owed = bal?.balance_owed ?? 0;
              return (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors cursor-pointer">
                  <td>
                    <Link href={`/contributors/${c.id}`} className="block px-5 py-4">
                      <p className="font-medium text-foreground">{c.name}</p>
                      {c.contact_email && (
                        <p className="text-xs text-muted-foreground">{c.contact_email}</p>
                      )}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/contributors/${c.id}`} className="block px-5 py-4 text-xs text-muted-foreground">
                      {c.share_percentage}% contributor / {100 - c.share_percentage}% Akuru Type
                    </Link>
                  </td>
                  <td>
                    <Link href={`/contributors/${c.id}`} className="block px-5 py-4 text-sm font-medium">
                      {mvr(bal?.total_earned ?? 0)}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/contributors/${c.id}`} className="block px-5 py-4 text-sm text-emerald-700">
                      {mvr(bal?.total_paid_out ?? 0)}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/contributors/${c.id}`} className="block px-5 py-4">
                      <span className={`text-sm font-semibold ${owed > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {mvr(owed)}
                      </span>
                    </Link>
                  </td>
                  <td>
                    <Link href={`/contributors/${c.id}`} className="flex items-center gap-1 px-5 py-4 text-xs text-primary">
                      View <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
