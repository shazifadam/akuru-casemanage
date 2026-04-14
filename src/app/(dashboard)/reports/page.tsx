import { createClient } from "@/lib/supabase/server";
import { ReportsClient } from "@/components/reports/reports-client";
import type {
  MonthlyRow,
  FontRow,
  ContributorRow,
  EnforcementRow,
  ReportsData,
} from "@/components/reports/reports-client";

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleString("en-MV", { month: "short", year: "numeric" });
}

export default async function ReportsPage() {
  const supabase = await createClient();

  // ── Fetch all licenses with relations ─────────────────────────────────────
  const { data: licenses } = await supabase
    .from("licenses")
    .select(
      `id, license_number, purchase_date, invoice_amount, gst_amount,
       contributor_share, akuru_share, payment_status, is_fine, fine_amount, source, case_id,
       font:fonts(id, name, contributor:contributors(id, name)),
       buyer:buyers(id, name)`
    )
    .order("purchase_date", { ascending: false });

  // Only paid licenses count as revenue
  const paid = (licenses ?? []).filter((l) => l.payment_status === "paid");

  // ── Monthly aggregation ───────────────────────────────────────────────────
  const monthMap = new Map<string, MonthlyRow>();
  for (const l of paid) {
    const ym = l.purchase_date.slice(0, 7); // "2025-11"
    if (!monthMap.has(ym)) {
      monthMap.set(ym, {
        month: ym,
        label: monthLabel(ym),
        licenseCount: 0,
        totalRevenue: 0,
        gstAmount: 0,
        contributorShare: 0,
        akuruShare: 0,
        enforcementRevenue: 0,
      });
    }
    const row = monthMap.get(ym)!;
    row.licenseCount += 1;
    row.totalRevenue += l.invoice_amount ?? 0;
    row.gstAmount += l.gst_amount ?? 0;
    row.contributorShare += l.contributor_share ?? 0;
    row.akuruShare += l.akuru_share ?? 0;
    if (l.source === "enforcement" || l.source === "election_case" || l.is_fine) {
      row.enforcementRevenue += l.invoice_amount ?? 0;
    }
  }
  const monthly: MonthlyRow[] = [...monthMap.values()].sort((a, b) =>
    b.month.localeCompare(a.month)
  );

  // ── By font aggregation ───────────────────────────────────────────────────
  const fontMap = new Map<string, FontRow>();
  for (const l of paid) {
    const font = l.font as any;
    if (!font) continue;
    if (!fontMap.has(font.id)) {
      fontMap.set(font.id, {
        fontId: font.id,
        fontName: font.name,
        licenseCount: 0,
        totalRevenue: 0,
        gstAmount: 0,
        contributorShare: 0,
        akuruShare: 0,
      });
    }
    const row = fontMap.get(font.id)!;
    row.licenseCount += 1;
    row.totalRevenue += l.invoice_amount ?? 0;
    row.gstAmount += l.gst_amount ?? 0;
    row.contributorShare += l.contributor_share ?? 0;
    row.akuruShare += l.akuru_share ?? 0;
  }
  const byFont: FontRow[] = [...fontMap.values()].sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  );

  // ── By contributor (from contributor_balances view + license counts) ──────
  const { data: balancesRaw } = await supabase
    .from("contributor_balances")
    .select("*")
    .order("total_earned", { ascending: false });

  // Count licenses per contributor
  const contribLicCount: Record<string, number> = {};
  for (const l of paid) {
    const font = l.font as any;
    const contribId = font?.contributor?.id;
    if (contribId) {
      contribLicCount[contribId] = (contribLicCount[contribId] ?? 0) + 1;
    }
  }

  const byContributor: ContributorRow[] = (balancesRaw ?? []).map((b) => ({
    contributorId: b.contributor_id,
    contributorName: (b as any).contributor_name ?? "—",
    totalEarned: b.total_earned ?? 0,
    totalPaidOut: b.total_paid_out ?? 0,
    balanceOwed: b.balance_owed ?? 0,
    licenseCount: contribLicCount[b.contributor_id] ?? 0,
  }));

  // ── Enforcement licenses ──────────────────────────────────────────────────
  const enforcementLicenses = (licenses ?? []).filter(
    (l) => l.source === "enforcement" || l.source === "election_case" || l.is_fine
  );

  // Fetch case numbers for enforcement licenses
  const enfCaseIds = [
    ...new Set(enforcementLicenses.map((l) => l.case_id).filter(Boolean)),
  ] as string[];
  const { data: caseData } =
    enfCaseIds.length > 0
      ? await supabase
          .from("cases")
          .select("id, case_number")
          .in("id", enfCaseIds)
      : { data: [] };
  const caseNumberMap = Object.fromEntries(
    (caseData ?? []).map((c) => [c.id, c.case_number])
  );

  const enforcement: EnforcementRow[] = enforcementLicenses.map((l) => ({
    licenseNumber: l.license_number,
    caseReference: l.case_id ? (caseNumberMap[l.case_id] ?? null) : null,
    buyerName: (l.buyer as any)?.name ?? "—",
    fontName: (l.font as any)?.name ?? "—",
    purchaseDate: l.purchase_date,
    invoiceAmount: l.invoice_amount ?? 0,
    isFine: l.is_fine ?? false,
    fineAmount: l.fine_amount ?? null,
    paymentStatus: l.payment_status,
  }));

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalRevenue = paid.reduce((s, l) => s + (l.invoice_amount ?? 0), 0);
  const totalGst = paid.reduce((s, l) => s + (l.gst_amount ?? 0), 0);
  const totalContributorShare = paid.reduce((s, l) => s + (l.contributor_share ?? 0), 0);
  const totalAkuruShare = paid.reduce((s, l) => s + (l.akuru_share ?? 0), 0);

  const reportsData: ReportsData = {
    monthly,
    byFont,
    byContributor,
    enforcement,
    totalRevenue,
    totalGst,
    totalAkuruShare,
    totalContributorShare,
    allTimeCount: paid.length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Financial Reports</h2>
        <p className="text-xs text-muted-foreground">
          Revenue analysis across {paid.length} paid license{paid.length !== 1 ? "s" : ""}
        </p>
      </div>
      <ReportsClient data={reportsData} />
    </div>
  );
}
