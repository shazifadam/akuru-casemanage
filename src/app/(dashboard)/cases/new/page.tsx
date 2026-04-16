export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { NewCaseForm } from "@/components/cases/new-case-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewCasePage() {
  const supabase = await createClient();

  const [{ data: fonts }, { data: buyers }] = await Promise.all([
    supabase.from("fonts").select("id, name").eq("status", "active").order("name"),
    supabase.from("buyers").select("id, name, organization").order("name").limit(200),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/cases"
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to cases
        </Link>
        <h2 className="text-lg font-semibold">New Case</h2>
        <p className="text-sm text-muted-foreground">
          Log a new enforcement case. It will be created in &quot;Identified&quot; status.
        </p>
      </div>

      <NewCaseForm fonts={fonts ?? []} buyers={buyers ?? []} />
    </div>
  );
}
