"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { updateCase } from "@/lib/actions/cases";
import { USAGE_CONTEXT_LABELS, CASE_PRIORITY_LABELS } from "@/types/database";
import type { UsageContext, CasePriority, DbCase } from "@/types/database";
import { BuyerCombobox } from "@/components/cases/buyer-combobox";

interface Font { id: string; name: string }
interface Buyer { id: string; name: string; organization: string | null }

interface EditCaseFormProps {
  caseData: DbCase;
  fonts: Font[];
  buyers: Buyer[];
}

export function EditCaseForm({ caseData, fonts, buyers }: EditCaseFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [buyerId, setBuyerId] = useState(caseData.buyer_id ?? "");
  const [priority, setPriority] = useState<CasePriority>(caseData.priority);
  const [usageContext, setUsageContext] = useState<UsageContext | "none">(
    caseData.usage_context ?? "none"
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("buyer_id", buyerId);
    formData.set("priority", priority);
    formData.set("usage_context", usageContext === "none" ? "" : usageContext);

    startTransition(async () => {
      const result = await updateCase(caseData.id, formData);
      if (result.success) {
        toast.success("Case updated successfully");
        router.push(`/cases/${caseData.id}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div className="space-y-1.5">
        <Label htmlFor="title">Case Title *</Label>
        <Input id="title" name="title" required defaultValue={caseData.title} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as CasePriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(CASE_PRIORITY_LABELS) as [CasePriority, string][]).map(
                ([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Buyer</Label>
          <BuyerCombobox
            buyers={buyers}
            value={buyerId}
            onChange={(id) => setBuyerId(id)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Usage Context</Label>
        <Select value={usageContext} onValueChange={(v) => setUsageContext(v as UsageContext | "none")}>
          <SelectTrigger>
            <SelectValue placeholder="Where was the font spotted?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {(Object.entries(USAGE_CONTEXT_LABELS) as [UsageContext, string][]).map(
              ([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="usage_description">Description</Label>
        <Textarea
          id="usage_description"
          name="usage_description"
          defaultValue={caseData.usage_description ?? ""}
          rows={3}
        />
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Election Case
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="constituency">Constituency</Label>
            <Input id="constituency" name="constituency" defaultValue={caseData.constituency ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="party">Party</Label>
            <Input id="party" name="party" defaultValue={caseData.party ?? ""} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
