import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EditCaseForm } from "@/components/cases/edit-case-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCasePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: caseData }, { data: fonts }, { data: buyers }] =
    await Promise.all([
      supabase
        .from("cases")
        .select("*")
        .eq("id", id)
        .single(),
      supabase.from("fonts").select("id, name").eq("status", "active").order("name"),
      supabase.from("buyers").select("id, name, organization").order("name").limit(200),
    ]);

  if (!caseData) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/cases/${id}`}
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to case
        </Link>
        <h2 className="text-lg font-semibold">Edit Case</h2>
        <p className="font-mono text-xs text-muted-foreground">{caseData.case_number}</p>
      </div>

      <EditCaseForm
        caseData={caseData}
        fonts={fonts ?? []}
        buyers={buyers ?? []}
      />
    </div>
  );
}
