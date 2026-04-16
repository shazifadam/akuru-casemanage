"use client";

import { useState } from "react";
import { Download, BarChart2, PieChart, Users, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

function mvr(n: number) {
  return `MVR ${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function downloadCsv(filename: string, rows: string[][], headers: string[]) {
  const escape = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = [headers, ...rows].map((r) => r.map(escape).join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface MonthlyRow {
  month: string;          // "2025-11"
  label: string;          // "Nov 2025"
  licenseCount: number;
  totalRevenue: number;
  gstAmount: number;
  contributorShare: number;
  akuruShare: number;
  enforcementRevenue: number;
}

export interface FontRow {
  fontId: string;
  fontName: string;
  licenseCount: number;
  totalRevenue: number;
  gstAmount: number;
  contributorShare: number;
  akuruShare: number;
}

export interface ContributorRow {
  contributorId: string;
  contributorName: string;
  totalEarned: number;
  totalPaidOut: number;
  balanceOwed: number;
  licenseCount: number;
}

export interface EnforcementRow {
  licenseNumber: string;
  caseReference: string | null;
  buyerName: string;
  fontName: string;
  purchaseDate: string;
  invoiceAmount: number;
  isFine: boolean;
  fineAmount: number | null;
  paymentStatus: string;
}

export interface ReportsData {
  monthly: MonthlyRow[];
  byFont: FontRow[];
  byContributor: ContributorRow[];
  enforcement: EnforcementRow[];
  totalRevenue: number;
  totalGst: number;
  totalAkuruShare: number;
  totalContributorShare: number;
  allTimeCount: number;
}

// ── Tab components ────────────────────────────────────────────────────────────

function MonthlyTab({ data }: { data: MonthlyRow[] }) {
  const exportCsv = () =>
    downloadCsv(
      "revenue-by-month.csv",
      data.map((r) => [
        r.label,
        r.licenseCount.toString(),
        r.totalRevenue.toFixed(2),
        r.gstAmount.toFixed(2),
        r.contributorShare.toFixed(2),
        r.akuruShare.toFixed(2),
        r.enforcementRevenue.toFixed(2),
      ]),
      ["Month", "Licenses", "Total Revenue (MVR)", "GST (MVR)", "Contributor Share (MVR)", "Akuru Share (MVR)", "Enforcement Revenue (MVR)"]
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Monthly revenue breakdown for all paid licenses</p>
        <Button variant="outline" size="sm" onClick={exportCsv} className="h-7 text-xs gap-1.5">
          <Download className="h-3 w-3" /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Month", "Licenses", "Total Revenue", "GST", "Contributor Share", "Akuru Share", "Enforcement"].map((h) => (
                <th key={h} className="pb-2 text-left text-xs font-medium text-muted-foreground pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr><td colSpan={7} className="py-4 text-sm text-muted-foreground">No paid licenses yet.</td></tr>
            ) : data.map((r) => (
              <tr key={r.month} className="hover:bg-muted/20">
                <td className="py-2.5 pr-4 text-xs font-medium">{r.label}</td>
                <td className="py-2.5 pr-4 text-xs text-muted-foreground tabular-nums">{r.licenseCount}</td>
                <td className="py-2.5 pr-4 text-xs font-semibold tabular-nums">{mvr(r.totalRevenue)}</td>
                <td className="py-2.5 pr-4 text-xs text-muted-foreground tabular-nums">{mvr(r.gstAmount)}</td>
                <td className="py-2.5 pr-4 text-xs text-emerald-700 tabular-nums">{mvr(r.contributorShare)}</td>
                <td className="py-2.5 pr-4 text-xs text-blue-700 tabular-nums">{mvr(r.akuruShare)}</td>
                <td className="py-2.5 pr-4 text-xs text-violet-700 tabular-nums">{mvr(r.enforcementRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ByFontTab({ data }: { data: FontRow[] }) {
  const exportCsv = () =>
    downloadCsv(
      "revenue-by-font.csv",
      data.map((r) => [
        r.fontName,
        r.licenseCount.toString(),
        r.totalRevenue.toFixed(2),
        r.gstAmount.toFixed(2),
        r.contributorShare.toFixed(2),
        r.akuruShare.toFixed(2),
      ]),
      ["Font", "Licenses", "Total Revenue (MVR)", "GST (MVR)", "Contributor Share (MVR)", "Akuru Share (MVR)"]
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Revenue breakdown per font (all paid licenses)</p>
        <Button variant="outline" size="sm" onClick={exportCsv} className="h-7 text-xs gap-1.5">
          <Download className="h-3 w-3" /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Font", "Licenses", "Total Revenue", "GST", "Contributor Share", "Akuru Share"].map((h) => (
                <th key={h} className="pb-2 text-left text-xs font-medium text-muted-foreground pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr><td colSpan={6} className="py-4 text-sm text-muted-foreground">No data yet.</td></tr>
            ) : data.map((r) => (
              <tr key={r.fontId} className="hover:bg-muted/20">
                <td className="py-2.5 pr-4 text-xs font-medium">{r.fontName}</td>
                <td className="py-2.5 pr-4 text-xs text-muted-foreground tabular-nums">{r.licenseCount}</td>
                <td className="py-2.5 pr-4 text-xs font-semibold tabular-nums">{mvr(r.totalRevenue)}</td>
                <td className="py-2.5 pr-4 text-xs text-muted-foreground tabular-nums">{mvr(r.gstAmount)}</td>
                <td className="py-2.5 pr-4 text-xs text-emerald-700 tabular-nums">{mvr(r.contributorShare)}</td>
                <td className="py-2.5 pr-4 text-xs text-blue-700 tabular-nums">{mvr(r.akuruShare)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ByContributorTab({ data }: { data: ContributorRow[] }) {
  const exportCsv = () =>
    downloadCsv(
      "revenue-by-contributor.csv",
      data.map((r) => [
        r.contributorName,
        r.licenseCount.toString(),
        r.totalEarned.toFixed(2),
        r.totalPaidOut.toFixed(2),
        r.balanceOwed.toFixed(2),
      ]),
      ["Contributor", "Licenses", "Total Earned (MVR)", "Total Paid Out (MVR)", "Balance Owed (MVR)"]
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Contributor earnings and payout status</p>
        <Button variant="outline" size="sm" onClick={exportCsv} className="h-7 text-xs gap-1.5">
          <Download className="h-3 w-3" /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Contributor", "Licenses", "Total Earned", "Total Paid Out", "Balance Owed"].map((h) => (
                <th key={h} className="pb-2 text-left text-xs font-medium text-muted-foreground pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr><td colSpan={5} className="py-4 text-sm text-muted-foreground">No data yet.</td></tr>
            ) : data.map((r) => (
              <tr key={r.contributorId} className="hover:bg-muted/20">
                <td className="py-2.5 pr-4 text-xs font-medium">{r.contributorName}</td>
                <td className="py-2.5 pr-4 text-xs text-muted-foreground tabular-nums">{r.licenseCount}</td>
                <td className="py-2.5 pr-4 text-xs font-semibold tabular-nums">{mvr(r.totalEarned)}</td>
                <td className="py-2.5 pr-4 text-xs text-emerald-700 tabular-nums">{mvr(r.totalPaidOut)}</td>
                <td className="py-2.5 pr-4">
                  <span className={`text-xs tabular-nums font-semibold ${r.balanceOwed > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {mvr(r.balanceOwed)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EnforcementTab({ data }: { data: EnforcementRow[] }) {
  const exportCsv = () =>
    downloadCsv(
      "enforcement-revenue.csv",
      data.map((r) => [
        r.licenseNumber,
        r.caseReference ?? "",
        r.buyerName,
        r.fontName,
        r.purchaseDate,
        r.invoiceAmount.toFixed(2),
        r.isFine ? "Fine" : "Enforcement Sale",
        (r.fineAmount ?? 0).toFixed(2),
        r.paymentStatus,
      ]),
      ["License #", "Case Ref", "Buyer", "Font", "Date", "Invoice Amount (MVR)", "Type", "Fine Amount (MVR)", "Payment Status"]
    );

  const total = data.reduce((s, r) => s + r.invoiceAmount, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Licenses issued through enforcement cases · Total: <span className="font-semibold text-foreground">{mvr(total)}</span>
        </p>
        <Button variant="outline" size="sm" onClick={exportCsv} className="h-7 text-xs gap-1.5">
          <Download className="h-3 w-3" /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["License #", "Case", "Buyer", "Font", "Date", "Invoice", "Type", "Status"].map((h) => (
                <th key={h} className="pb-2 text-left text-xs font-medium text-muted-foreground pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr><td colSpan={8} className="py-4 text-sm text-muted-foreground">No enforcement licenses yet.</td></tr>
            ) : data.map((r) => (
              <tr key={r.licenseNumber} className="hover:bg-muted/20">
                <td className="py-2.5 pr-4 font-mono text-xs text-primary">{r.licenseNumber}</td>
                <td className="py-2.5 pr-4 text-xs font-mono text-muted-foreground">{r.caseReference ?? "—"}</td>
                <td className="py-2.5 pr-4 text-xs text-muted-foreground">{r.buyerName}</td>
                <td className="py-2.5 pr-4 text-xs text-muted-foreground">{r.fontName}</td>
                <td className="py-2.5 pr-4 text-xs text-muted-foreground">{r.purchaseDate}</td>
                <td className="py-2.5 pr-4 text-xs font-semibold tabular-nums">{mvr(r.invoiceAmount)}</td>
                <td className="py-2.5 pr-4">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${r.isFine ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                    {r.isFine ? "Fine" : "Sale"}
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`text-xs ${r.paymentStatus === "paid" ? "text-emerald-600" : r.paymentStatus === "overdue" ? "text-red-600" : "text-yellow-600"}`}>
                    {r.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

const TABS = [
  { id: "monthly",     label: "By Month",       icon: BarChart2 },
  { id: "font",        label: "By Font",         icon: PieChart },
  { id: "contributor", label: "By Contributor",  icon: Users },
  { id: "enforcement", label: "Enforcement",     icon: Scale },
] as const;

type TabId = typeof TABS[number]["id"];

export function ReportsClient({ data }: { data: ReportsData }) {
  const [activeTab, setActiveTab] = useState<TabId>("monthly");

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Revenue (All Time)", value: mvr(data.totalRevenue), color: "text-foreground" },
          { label: "Total GST Collected",       value: mvr(data.totalGst),          color: "text-muted-foreground" },
          { label: "Contributor Share (Total)", value: mvr(data.totalContributorShare), color: "text-emerald-700" },
          { label: "Akuru Type Share (Total)",  value: mvr(data.totalAkuruShare),   color: "text-blue-700" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {activeTab === "monthly"     && <MonthlyTab      data={data.monthly} />}
          {activeTab === "font"        && <ByFontTab       data={data.byFont} />}
          {activeTab === "contributor" && <ByContributorTab data={data.byContributor} />}
          {activeTab === "enforcement" && <EnforcementTab  data={data.enforcement} />}
        </div>
      </div>
    </div>
  );
}
