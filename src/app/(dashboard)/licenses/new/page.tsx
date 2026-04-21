export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NewLicenseForm } from "@/components/licenses/new-license-form";

interface PageProps {
  searchParams: Promise<{ case_id?: string; buyer_id?: string; font_id?: string; source?: string }>;
}

export default async function NewLicensePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: fonts }, { data: buyers }, { data: openCases }] = await Promise.all([
    supabase.from("fonts").select("id, name, base_price, contributor_share_pct, gst_rate, contributor_id").eq("status", "active").order("name"),
    supabase.from("buyers").select("id, name, organization").order("name").limit(300),
    supabase.from("cases")
      .select("id, case_number, title")
      .not("status", "in", '("converted","fined","dismissed")')
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const backHref = params.case_id ? `/cases/${params.case_id}` : "/licenses";
  const backLabel = params.case_id ? "Back to case" : "Back to licenses";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
        <h2 className="text-lg font-semibold">New License</h2>
        <p className="text-sm text-muted-foreground">Issue a license with auto-calculated financials.</p>
      </div>
      <NewLicenseForm
        fonts={fonts ?? []}
        buyers={buyers ?? []}
        openCases={openCases ?? []}
        defaultCaseId={params.case_id}
        defaultBuyerId={params.buyer_id}
        defaultFontId={params.font_id}
        defaultSource={params.source}
      />
    </div>
  );
}
