export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BuyerForm } from "@/components/buyers/buyer-form";

export default function NewBuyerPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/buyers" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />Back to buyers
        </Link>
        <h2 className="text-lg font-semibold">New Buyer</h2>
        <p className="text-sm text-muted-foreground">Add a buyer to the contact registry.</p>
      </div>
      <BuyerForm />
    </div>
  );
}
