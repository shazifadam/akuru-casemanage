import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NewLicenseForm } from "@/components/licenses/new-license-form";

interface PageProps {
  searchParams: Promise<{ case_id?: string; buyer_id?: string; font_id?: string }>;
}

export default async function NewLicensePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: fonts }, { data: buyers }, { data: contributors }] = await Promise.all([
    supabase.from("fonts").select("id, name, base_price, contributor_share_pct, gst_rate, contributor_id").eq("status", "active").order("name"),
    supabase.from("buyers").select("id, name, organization").order("name").limit(300),
    supabase.from("contributors").select("id, name").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/licenses" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to licenses
        </Link>
        <h2 className="text-lg font-semibold">New License</h2>
        <p className="text-sm text-muted-foreground">Issue a license with auto-calculated financials.</p>
      </div>
      <NewLicenseForm
        fonts={fonts ?? []}
        buyers={buyers ?? []}
        defaultCaseId={params.case_id}
        defaultBuyerId={params.buyer_id}
        defaultFontId={params.font_id}
      />
    </div>
  );
}
