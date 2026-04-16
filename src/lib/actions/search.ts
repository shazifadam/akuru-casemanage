"use server";

import { createClient } from "@/lib/supabase/server";

export interface SearchResult {
  id: string;
  type: "buyer" | "font" | "license" | "case";
  label: string;
  sublabel?: string;
  href: string;
  badge?: string;
}

export async function globalSearch(
  query: string,
  typeFilter: string = "all"
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const results: SearchResult[] = [];

  const all = typeFilter === "all";

  // ── Buyers ──────────────────────────────────────────────────────────────────
  if (all || typeFilter === "buyer") {
    const { data } = await supabase
      .from("buyers")
      .select("id, name, organization, buyer_type")
      .or(`name.ilike.%${q}%,organization.ilike.%${q}%`)
      .limit(5);

    (data ?? []).forEach((b) =>
      results.push({
        id: b.id,
        type: "buyer",
        label: b.name,
        sublabel: b.organization ?? b.buyer_type,
        href: `/buyers/${b.id}`,
      })
    );
  }

  // ── Fonts ────────────────────────────────────────────────────────────────────
  if (all || typeFilter === "font") {
    const { data } = await supabase
      .from("fonts")
      .select("id, name, status")
      .ilike("name", `%${q}%`)
      .limit(5);

    (data ?? []).forEach((f) =>
      results.push({
        id: f.id,
        type: "font",
        label: f.name,
        sublabel: f.status,
        href: `/settings?tab=fonts`,
      })
    );
  }

  // ── Licenses ─────────────────────────────────────────────────────────────────
  if (all || typeFilter === "license" || typeFilter === "fine" || typeFilter === "sale") {
    let licenseQuery = supabase
      .from("licenses")
      .select("id, license_number, is_fine, payment_status, buyer:buyers(name)")
      .ilike("license_number", `%${q}%`);

    if (typeFilter === "fine") licenseQuery = licenseQuery.eq("is_fine", true);
    if (typeFilter === "sale") licenseQuery = licenseQuery.eq("is_fine", false);

    const { data } = await licenseQuery.limit(5);

    (data ?? []).forEach((l) =>
      results.push({
        id: l.id,
        type: "license",
        label: l.license_number,
        sublabel: `${l.is_fine ? "Fine" : "Sale"} · ${(l.buyer as any)?.name ?? "Unknown"}`,
        href: `/licenses/${l.id}`,
        badge: l.payment_status,
      })
    );
  }

  // ── Cases ────────────────────────────────────────────────────────────────────
  if (all || typeFilter === "case") {
    const { data } = await supabase
      .from("cases")
      .select("id, case_number, title, status")
      .or(`title.ilike.%${q}%,case_number.ilike.%${q}%`)
      .limit(5);

    (data ?? []).forEach((c) =>
      results.push({
        id: c.id,
        type: "case",
        label: c.title,
        sublabel: c.case_number,
        href: `/cases/${c.id}`,
        badge: c.status,
      })
    );
  }

  return results;
}
