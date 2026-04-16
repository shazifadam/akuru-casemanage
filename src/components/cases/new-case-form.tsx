"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { createCase } from "@/lib/actions/cases";
import { USAGE_CONTEXT_LABELS, CASE_PRIORITY_LABELS } from "@/types/database";
import type { UsageContext, CasePriority } from "@/types/database";
import { BuyerCombobox } from "@/components/cases/buyer-combobox";

interface Font {
  id: string;
  name: string;
}

interface Buyer {
  id: string;
  name: string;
  organization: string | null;
}

interface NewCaseFormProps {
  fonts: Font[];
  buyers: Buyer[];
}

export function NewCaseForm({ fonts, buyers }: NewCaseFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Controlled selects (can't easily use FormData with Radix selects)
  const [fontId, setFontId] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [priority, setPriority] = useState<CasePriority>("medium");
  const [usageContext, setUsageContext] = useState<UsageContext | "">("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("font_id", fontId);
    formData.set("buyer_id", buyerId);
    formData.set("priority", priority);
    formData.set("usage_context", usageContext);

    if (!fontId) {
      setError("Please select a font.");
      return;
    }

    startTransition(async () => {
      const result = await createCase(formData);
      if (!result.success) {
        setError(result.error);
      }
      // On success, createCase redirects — no further action needed
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Case Title *</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="e.g. PNC Naifaru Council — Maumoon Font usage"
        />
        <p className="text-xs text-muted-foreground">
          Brief description identifying the subject and font
        </p>
      </div>

      {/* Font + Priority row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Font *</Label>
          <Select value={fontId} onValueChange={setFontId}>
            <SelectTrigger>
              <SelectValue placeholder="Select font" />
            </SelectTrigger>
            <SelectContent>
              {fonts.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as CasePriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(CASE_PRIORITY_LABELS) as [CasePriority, string][]).map(
                ([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Buyer (optional at creation) */}
      <div className="space-y-1.5">
        <Label>Buyer / Contact</Label>
        <BuyerCombobox
          buyers={buyers}
          value={buyerId}
          onChange={(id) => setBuyerId(id)}
        />
        <p className="text-xs text-muted-foreground">
          Search by name or organisation — or create a new buyer inline
        </p>
      </div>

      {/* Date identified */}
      <div className="space-y-1.5">
        <Label htmlFor="identified_date">Date Identified</Label>
        <Input
          id="identified_date"
          name="identified_date"
          type="date"
          defaultValue={new Date().toISOString().split("T")[0]}
        />
      </div>

      {/* Usage context */}
      <div className="space-y-1.5">
        <Label>Usage Context</Label>
        <Select value={usageContext} onValueChange={(v) => setUsageContext(v as UsageContext)}>
          <SelectTrigger>
            <SelectValue placeholder="Where was the font spotted?" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(USAGE_CONTEXT_LABELS) as [UsageContext, string][]).map(
              ([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="usage_description">Description</Label>
        <Textarea
          id="usage_description"
          name="usage_description"
          placeholder="Details about where and how the font was used..."
          rows={3}
        />
      </div>

      {/* Election fields */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Election Case (optional)
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="constituency">Constituency (Dhaira)</Label>
            <Input id="constituency" name="constituency" placeholder="e.g. Naifaru Dhaira" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="party">Party</Label>
            <Input id="party" name="party" placeholder="e.g. PNC" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Case
        </Button>
      </div>
    </form>
  );
}
