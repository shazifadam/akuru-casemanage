/**
 * Cached data-layer functions.
 *
 * Each function is wrapped with Next.js `unstable_cache` so results are stored
 * in the Data Cache and shared across all server renders until a mutation
 * calls the matching `revalidateTag()`.
 *
 * TTL (revalidate: 300) acts as a safety net — even if a tag is missed, data
 * refreshes after 5 minutes.  Tag-based invalidation (via server actions) is
 * the primary mechanism and fires immediately on any write.
 */

import { unstable_cache } from "next/cache";
import { cacheDb } from "@/lib/supabase/cache-client";
import type {
  CaseStatus,
  CasePriority,
  PaymentStatus,
  LicenseSource,
  BuyerType,
} from "@/types/database";

const TTL = 300; // seconds

// ── Fonts ─────────────────────────────────────────────────────────────────────

export const getActiveFonts = unstable_cache(
  async () => {
    const { data } = await cacheDb
      .from("fonts")
      .select("id, name, base_price, contributor_share_pct, gst_rate, contributor_id")
      .eq("status", "active")
      .order("name");
    return data ?? [];
  },
  ["fonts-active"],
  { tags: ["fonts"], revalidate: TTL }
);

export const getAllFontsWithContributors = unstable_cache(
  async () => {
    const { data } = await cacheDb
      .from("fonts")
      .select("*, contributor:contributors(name)")
      .order("name");
    return data ?? [];
  },
  ["fonts-all"],
  { tags: ["fonts"], revalidate: TTL }
);

// ── Contributors ──────────────────────────────────────────────────────────────

export const getContributors = unstable_cache(
  async () => {
    const { data } = await cacheDb
      .from("contributors")
      .select(
        "id, name, contact_email, share_percentage, status, created_at, updated_at"
      )
      .order("name");
    return data ?? [];
  },
  ["contributors-list"],
  { tags: ["contributors"], revalidate: TTL }
);

export const getActiveContributors = unstable_cache(
  async () => {
    const { data } = await cacheDb
      .from("contributors")
      .select("id, name, share_percentage")
      .eq("status", "active")
      .order("name");
    return data ?? [];
  },
  ["contributors-active"],
  { tags: ["contributors"], revalidate: TTL }
);

export const getContributorBalances = unstable_cache(
  async () => {
    const { data } = await cacheDb
      .from("contributor_balances")
      .select("*");
    return data ?? [];
  },
  ["contributor-balances"],
  { tags: ["contributors", "licenses"], revalidate: TTL }
);

// ── Cases ─────────────────────────────────────────────────────────────────────

export interface CasesQueryParams {
  status?:   string;
  priority?: string;
  font?:     string;
  party?:    string;
  q?:        string;
  from?:     string;
  to?:       string;
  sort?:     string;
  order?:    string;
}

export const getCases = unstable_cache(
  async (params: CasesQueryParams) => {
    let query = cacheDb
      .from("cases")
      .select(
        `*,
        font:fonts(id, name),
        buyer:buyers(id, name, organization),
        identified_by_user:users(id, full_name)`
      );

    if (params.status)   query = query.eq("status",   params.status as CaseStatus);
    if (params.priority) query = query.eq("priority", params.priority as CasePriority);
    if (params.font)     query = query.eq("font_id",  params.font);
    if (params.party)    query = query.ilike("party", `%${params.party}%`);
    if (params.q)
      query = query.or(
        `title.ilike.%${params.q}%,usage_description.ilike.%${params.q}%,constituency.ilike.%${params.q}%`
      );
    if (params.from) query = query.gte("identified_date", params.from);
    if (params.to)   query = query.lte("identified_date", params.to);

    const allowedCaseSortCols = ["identified_date", "priority", "status", "created_at"];
    const caseSortCol = allowedCaseSortCols.includes(params.sort ?? "") ? params.sort! : "created_at";
    query = query.order(caseSortCol, { ascending: params.order === "asc" });

    const { data } = await query;
    return data ?? [];
  },
  ["cases-list"],
  { tags: ["cases"], revalidate: TTL }
);

// ── Licenses ──────────────────────────────────────────────────────────────────

export interface LicensesQueryParams {
  font?:   string;
  status?: string;
  source?: string;
  q?:      string;
  from?:   string;
  to?:     string;
  sort?:   string;
  order?:  string;
}

export const getLicenses = unstable_cache(
  async (params: LicensesQueryParams) => {
    let query = cacheDb
      .from("licenses")
      .select(
        `*,
        buyer:buyers(id, name, organization),
        font:fonts(id, name, contributor_id, contributor:contributors(id, name))`
      );

    if (params.font)   query = query.eq("font_id",        params.font);
    if (params.status) query = query.eq("payment_status", params.status as PaymentStatus);
    if (params.source) query = query.eq("source",         params.source as LicenseSource);
    if (params.q)      query = query.ilike("license_number", `%${params.q}%`);
    if (params.from)   query = query.gte("purchase_date", params.from);
    if (params.to)     query = query.lte("purchase_date", params.to);

    const allowedLicenseSortCols = ["purchase_date", "invoice_amount", "payment_status", "license_number"];
    const licSortCol = allowedLicenseSortCols.includes(params.sort ?? "") ? params.sort! : "created_at";
    query = query.order(licSortCol, { ascending: params.order === "asc" });

    const { data } = await query;
    return data ?? [];
  },
  ["licenses-list"],
  { tags: ["licenses"], revalidate: TTL }
);

// ── Buyers ────────────────────────────────────────────────────────────────────

export interface BuyersQueryParams {
  q?:     string;
  type?:  string;
  from?:  string;
  to?:    string;
  sort?:  string;
  order?: string;
}

export const getBuyers = unstable_cache(
  async (params: BuyersQueryParams) => {
    let query = cacheDb
      .from("buyers")
      .select("id, name, organization, email, buyer_type, created_at");

    if (params.q)    query = query.ilike("name", `%${params.q}%`);
    if (params.type) query = query.eq("buyer_type", params.type as BuyerType);
    if (params.from) query = query.gte("created_at", params.from + "T00:00:00Z");
    if (params.to)   query = query.lte("created_at", params.to + "T23:59:59Z");

    const allowedBuyerSortCols = ["name", "created_at"];
    const buyerSortCol = allowedBuyerSortCols.includes(params.sort ?? "") ? params.sort! : "created_at";
    query = query.order(buyerSortCol, { ascending: params.order === "asc" });

    const { data } = await query;
    return data ?? [];
  },
  ["buyers-list"],
  { tags: ["buyers"], revalidate: TTL }
);

export const getLicenseCountsByBuyer = unstable_cache(
  async () => {
    const { data } = await cacheDb
      .from("licenses")
      .select("buyer_id");
    return data ?? [];
  },
  ["licenses-buyer-counts"],
  { tags: ["licenses", "buyers"], revalidate: TTL }
);

export const getAllBuyers = unstable_cache(
  async () => {
    const { data } = await cacheDb
      .from("buyers")
      .select("id, name, organization")
      .order("name");
    return data ?? [];
  },
  ["buyers-all"],
  { tags: ["buyers"], revalidate: TTL }
);

// ── Dashboard ─────────────────────────────────────────────────────────────────

const TERMINAL_STATUSES = ["converted", "fined", "dismissed"];

/** Last N calendar months as { year, month(0-idx), label } */
function lastNMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return {
      year:  d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleString("en-US", { month: "short" }),
      // ISO date range for comparisons
      start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      end:   (() => {
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
      })(),
    };
  });
}

export interface MonthlyDataPoint {
  month:      string;
  identified: number;
  resolved:   number;
}

export const getDashboardData = unstable_cache(
  async () => {
    const now = new Date();
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const [
      { data: casesRaw },
      { data: licenses },
      { count: buyerCount },
      { data: balances },
      { data: activityRaw },
    ] = await Promise.all([
      // Fetch identified_date + resolved_date so we can build monthly charts
      cacheDb.from("cases").select("id, status, identified_date, resolved_date, updated_at"),
      cacheDb
        .from("licenses")
        .select("id, invoice_amount, akuru_share, gst_amount, contributor_share, payment_status, purchase_date"),
      cacheDb.from("buyers").select("id", { count: "exact", head: true }),
      cacheDb
        .from("contributor_balances")
        .select("contributor_id, contributor_name, balance_owed")
        .gt("balance_owed", 0)
        .order("balance_owed", { ascending: false }),
      cacheDb
        .from("case_activity_log")
        .select("id, activity_type, comment, created_at, case_id, new_value")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    // Resolve case references for activity log
    const caseIds = [
      ...new Set(
        (activityRaw ?? []).map((a) => a.case_id).filter(Boolean)
      ),
    ] as string[];

    const { data: caseData } =
      caseIds.length > 0
        ? await cacheDb
            .from("cases")
            .select("id, case_number, title")
            .in("id", caseIds)
        : { data: [] };

    // Revenue = Akuru's share only (excl. GST and contributor share)
    const revenueMtd = (licenses ?? [])
      .filter((l) => l.payment_status === "paid" && l.purchase_date >= mtdStart)
      .reduce((s, l) => s + (l.akuru_share ?? 0), 0);

    const pipelineCounts: Record<string, number> = {};
    for (const c of casesRaw ?? []) {
      pipelineCounts[c.status] = (pipelineCounts[c.status] ?? 0) + 1;
    }
    const openCount = (casesRaw ?? []).filter(
      (c) => !TERMINAL_STATUSES.includes(c.status)
    ).length;

    // ── Monthly chart data (last 6 months) ───────────────────────────────────
    const months = lastNMonths(6);
    const monthlyData: MonthlyDataPoint[] = months.map(({ label, start, end }) => {
      const identified = (casesRaw ?? []).filter(
        (c) => c.identified_date >= start && c.identified_date <= end
      ).length;

      // Resolved = terminal status + resolved_date falls in this month
      // Fallback: if no resolved_date, use updated_at
      const resolved = (casesRaw ?? []).filter((c) => {
        if (!TERMINAL_STATUSES.includes(c.status)) return false;
        const resolvedOn = c.resolved_date ?? c.updated_at?.split("T")[0];
        return resolvedOn && resolvedOn >= start && resolvedOn <= end;
      }).length;

      return { month: label, identified, resolved };
    });

    return {
      openCount,
      pipelineCounts,
      totalLicenses:  (licenses ?? []).length,
      revenueMtd,
      buyerCount:     buyerCount ?? 0,
      totalOwed:      (balances ?? []).reduce((s, b) => s + (b.balance_owed ?? 0), 0),
      balances:       balances ?? [],
      activityRaw:    activityRaw ?? [],
      caseMap:        Object.fromEntries((caseData ?? []).map((c) => [c.id, c])),
      monthlyData,
    };
  },
  ["dashboard-data"],
  { tags: ["cases", "licenses", "buyers", "contributors"], revalidate: TTL }
);
