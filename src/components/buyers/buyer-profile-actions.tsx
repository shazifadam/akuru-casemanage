"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MergeDialog } from "./merge-dialog";
import { deleteBuyer } from "@/lib/actions/buyers";
import { MoreHorizontal, Pencil, GitMerge, Trash2 } from "lucide-react";

interface BuyerProfileActionsProps {
  buyerId: string;
  buyerName: string;
}

export function BuyerProfileActions({ buyerId, buyerName }: BuyerProfileActionsProps) {
  const router = useRouter();
  const [mergeOpen, setMergeOpen] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete ${buyerName}? This cannot be undone.`)) return;
    await deleteBuyer(buyerId);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <MoreHorizontal className="h-4 w-4" />Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/buyers/${buyerId}/edit`} className="flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5" />Edit buyer
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMergeOpen(true)}>
            <GitMerge className="mr-2 h-3.5 w-3.5" />Merge duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-3.5 w-3.5" />Delete buyer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MergeDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        currentBuyerId={buyerId}
        currentBuyerName={buyerName}
      />
    </>
  );
}
