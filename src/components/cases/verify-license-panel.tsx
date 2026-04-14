"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle, Loader2, FileText } from "lucide-react";
import type { CaseStatus } from "@/types/database";

interface License {
  license_id: string;
  license_number: string;
  font_name: string;
  purchase_date: string;
  invoice_amount: number;
  payment_status: string;
}

interface VerifyLicensePanelProps {
  buyerId: string | null;
  fontId: string;
  caseStatus: CaseStatus;
}

export function VerifyLicensePanel({ buyerId, fontId, caseStatus }: VerifyLicensePanelProps) {
  const [licenses, setLicenses] = useState<License[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!buyerId || caseStatus !== "verify_license") return;

    setLoading(true);
    const supabase = createClient();
    supabase
      .rpc("find_buyer_licenses", { p_buyer_id: buyerId, p_font_id: fontId })
      .then(({ data }) => {
        setLicenses(data ?? []);
        setLoading(false);
      });
  }, [buyerId, fontId, caseStatus]);

  if (caseStatus !== "verify_license") return null;

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-yellow-900">
        License Verification
      </h4>

      {!buyerId ? (
        <p className="text-xs text-yellow-700">
          Link a buyer to this case to run an automatic license check.
        </p>
      ) : loading ? (
        <div className="flex items-center gap-2 text-xs text-yellow-700">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Checking license registry...
        </div>
      ) : licenses && licenses.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {licenses.length} existing license{licenses.length > 1 ? "s" : ""} found
          </div>
          {licenses.map((l) => (
            <div
              key={l.license_id}
              className="flex items-center justify-between rounded-md border border-emerald-200 bg-white px-3 py-2"
            >
              <div>
                <p className="font-mono text-xs font-medium">{l.license_number}</p>
                <p className="text-[10px] text-muted-foreground">
                  {l.font_name} · {l.purchase_date} · MVR {l.invoice_amount.toLocaleString()}
                </p>
              </div>
              <Link
                href={`/licenses/${l.license_id}`}
                className="text-[10px] text-primary underline"
              >
                View
              </Link>
            </div>
          ))}
          <p className="text-[10px] text-yellow-700">
            Buyer has existing licenses. Review and consider dismissing as &quot;Already Licensed.&quot;
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs font-medium text-red-700">
          <XCircle className="h-4 w-4" />
          No existing licenses found for this buyer and font.
        </div>
      )}
    </div>
  );
}
