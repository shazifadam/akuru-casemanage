export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BuyerForm } from "@/components/buyers/buyer-form";

interface PageProps { params: Promise<{ id: string }> }

export default async function EditBuyerPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: buyer } = await supabase.from("buyers").select("*").eq("id", id).single();
  if (!buyer) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href={`/buyers/${id}`} className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />Back to buyer
        </Link>
        <h2 className="text-lg font-semibold">Edit Buyer</h2>
      </div>
      <BuyerForm buyer={buyer} />
    </div>
  );
}
