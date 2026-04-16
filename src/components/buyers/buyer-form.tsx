"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { createBuyer, updateBuyer, searchSimilarBuyers } from "@/lib/actions/buyers";
import { BUYER_TYPE_LABELS } from "@/types/database";
import type { BuyerType, DbBuyer } from "@/types/database";
import Link from "next/link";

interface BuyerFormProps {
  buyer?: DbBuyer;
}

interface SimilarBuyer {
  id: string;
  name: string;
  organization: string | null;
  buyer_type: BuyerType;
  similarity: number;
}

export function BuyerForm({ buyer }: BuyerFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [buyerType, setBuyerType] = useState<BuyerType>(buyer?.buyer_type ?? "individual");
  const [similarBuyers, setSimilarBuyers] = useState<SimilarBuyer[]>([]);
  const [nameValue, setNameValue] = useState(buyer?.name ?? "");
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEdit = !!buyer;

  // Fuzzy search on name change
  useEffect(() => {
    if (isEdit || nameValue.length < 3) { setSimilarBuyers([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await searchSimilarBuyers(nameValue);
      setSimilarBuyers(results as SimilarBuyer[]);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [nameValue, isEdit]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("buyer_type", buyerType);

    startTransition(async () => {
      if (isEdit) {
        const result = await updateBuyer(buyer.id, formData);
        if (result.success) {
          router.push(`/buyers/${buyer.id}`);
          router.refresh();
        } else {
          setError(result.error);
        }
      } else {
        const result = await createBuyer(formData);
        if (!result.success) {
          setError(result.error);
        }
        // On success, createBuyer redirects — no further action needed
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-6">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name" name="name" required
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          placeholder="e.g. Ahmed Mohamed"
        />

        {/* Fuzzy match warning */}
        {similarBuyers.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" />
              Similar buyers already exist — check before creating a duplicate:
            </div>
            {similarBuyers.slice(0, 3).map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-md bg-white border border-amber-100 px-3 py-1.5">
                <div>
                  <p className="text-xs font-medium">{b.name}</p>
                  {b.organization && <p className="text-[10px] text-muted-foreground">{b.organization}</p>}
                </div>
                <Link href={`/buyers/${b.id}`} target="_blank" className="flex items-center gap-1 text-[10px] text-primary underline">
                  <ExternalLink className="h-3 w-3" /> View
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <Label>Buyer Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(BUYER_TYPE_LABELS) as [BuyerType, string][]).map(([k, v]) => (
            <button
              key={k} type="button"
              onClick={() => setBuyerType(k)}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${buyerType === k ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-muted/50"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Organization */}
      <div className="space-y-1.5">
        <Label htmlFor="organization">Organization</Label>
        <Input id="organization" name="organization" placeholder="e.g. Maldives Police Service" defaultValue={buyer?.organization ?? ""} />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="optional" defaultValue={buyer?.email ?? ""} />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" placeholder="Any additional context..." rows={2} defaultValue={buyer?.notes ?? ""} />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Create Buyer"}
        </Button>
      </div>
    </form>
  );
}
