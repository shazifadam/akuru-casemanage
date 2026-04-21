"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { ArrowRightLeft, FileCheck, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { CaseStatus } from "@/types/database";

interface CaseDetailActionsProps {
  caseId: string;
  currentStatus: CaseStatus;
  caseNumber: string;
  isAdmin: boolean;
  fontId?: string;
  buyerId?: string | null;
  isElectionCase?: boolean;
}

const TERMINAL: CaseStatus[] = ["converted", "fined", "dismissed"];

export function CaseDetailActions({
  caseId,
  currentStatus,
  caseNumber,
  isAdmin,
  fontId,
  buyerId,
  isElectionCase,
}: CaseDetailActionsProps) {
  const router = useRouter();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const isTerminal = TERMINAL.includes(currentStatus);
  const canIssueLicense = currentStatus === "license_verified";

  // Build the URL for issuing a license from this case
  const issueLicenseParams = new URLSearchParams({ case_id: caseId });
  if (fontId) issueLicenseParams.set("font_id", fontId);
  if (buyerId) issueLicenseParams.set("buyer_id", buyerId);
  issueLicenseParams.set("source", isElectionCase ? "election_case" : "enforcement");
  const issueLicenseHref = `/licenses/new?${issueLicenseParams.toString()}`;

  async function handleDelete() {
    if (!confirm("Delete this case? This cannot be undone.")) return;
    const result = await deleteCase(caseId);
    if (!result.success) {
      toast.error(result.error ?? "Failed to delete case");
    }
    // On success, deleteCase redirects — no further action needed
  }

  return (
    <div className="flex items-center gap-2">
      {/* Issue License — only when license is verified and ready to resolve */}
      {canIssueLicense && (
        <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
          <Link href={issueLicenseHref}>
            <FileCheck className="h-3.5 w-3.5" />
            Issue License
          </Link>
        </Button>
      )}

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
