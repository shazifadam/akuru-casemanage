"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MergeIcon, Search } from "lucide-react";
import { mergeBuyers, searchSimilarBuyers } from "@/lib/actions/buyers";

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentBuyerId: string;
  currentBuyerName: string;
}

interface SearchResult {
  id: string;
  name: string;
  organization: string | null;
  similarity: number;
}

export function MergeDialog({ open, onOpenChange, currentBuyerId, currentBuyerName }: MergeDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [targetId, setTargetId] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    const res = await searchSimilarBuyers(query);
    setResults((res as SearchResult[]).filter((r) => r.id !== currentBuyerId));
  }

  function handleConfirm() {
    if (!targetId) return;
    startTransition(async () => {
      const result = await mergeBuyers(targetId, currentBuyerId);
      if (!result.success) {
        toast.error(result.error);
      }
      // On success, mergeBuyers redirects — no further action needed
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Merge Duplicate</DialogTitle>
          <DialogDescription>
            All licenses and cases from <strong>{currentBuyerName}</strong> will move to the selected buyer. The current record will be deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Input
              placeholder="Search for the surviving buyer..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button type="button" variant="outline" size="icon" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Select the buyer to keep:</p>
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setTargetId(r.id)}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${targetId === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                >
                  <p className="font-medium">{r.name}</p>
                  {r.organization && <p className="text-xs text-muted-foreground">{r.organization}</p>}
                </button>
              ))}
            </div>
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!targetId || isPending} variant="destructive">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Merge & Delete Current
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
