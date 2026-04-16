"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusChangeDialog } from "./status-change-dialog";
import { EvidenceUpload } from "./evidence-upload";
import { deleteCase } from "@/lib/actions/cases";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowRightLeft, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { CaseStatus } from "@/types/database";

interface CaseDetailActionsProps {
  caseId: string;
  currentStatus: CaseStatus;
  caseNumber: string;
  isAdmin: boolean;
}

const TERMINAL: CaseStatus[] = ["converted", "fined", "dismissed"];

export function CaseDetailActions({
  caseId,
  currentStatus,
  caseNumber,
  isAdmin,
}: CaseDetailActionsProps) {
  const router = useRouter();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const isTerminal = TERMINAL.includes(currentStatus);

  async function handleDelete() {
    if (!confirm("Delete this case? This cannot be undone.")) return;
    const result = await deleteCase(caseId);
    if (!result.success) {
      alert(result.error);
    }
    // On success, deleteCase redirects — no further action needed
  }

  return (
    <div className="flex items-center gap-2">
      {/* Change status */}
      {!isTerminal && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => setStatusDialogOpen(true)}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Change Status
        </Button>
      )}

      {/* Evidence upload */}
      <EvidenceUpload caseId={caseId} caseNumber={caseNumber} />

      {/* More actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/cases/${caseId}/edit`} className="flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5" />
              Edit case
            </Link>
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete case
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <StatusChangeDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        caseId={caseId}
        currentStatus={currentStatus}
      />
    </div>
  );
}
