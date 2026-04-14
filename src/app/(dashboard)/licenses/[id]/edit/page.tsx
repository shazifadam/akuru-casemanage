import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EditLicenseForm } from "@/components/licenses/edit-license-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLicensePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: license }, { data: fonts }, { data: buyers }] = await Promise.all([
    supabase.from("licenses").select("*").eq("id", id).single(),
    supabase
      .from("fonts")
      .select("id, name, base_price, contributor_share_pct, gst_rate, contributor_id, status")
      .eq("status", "active")
      .order("name"),
    supabase.from("buyers").select("id, name, organization").order("name"),
  ]);

  if (!license) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/licenses/${id}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to license
      </Link>

      <div>
        <h2 className="text-lg font-semibold">Edit License</h2>
        <p className="font-mono text-xs text-muted-foreground">{license.license_number}</p>
      </div>

      <EditLicenseForm
        license={license}
        fonts={fonts ?? []}
        buyers={buyers ?? []}
      />
    </div>
  );
}
