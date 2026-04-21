"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CaseStatusBadge } from "./case-status-badge";
import { transitionCaseStatus } from "@/lib/actions/cases";
import type { CaseStatus } from "@/types/database";
import { CASE_STATUS_LABELS } from "@/types/database";
import { Loader2, AlertCircle } from "lucide-react";

const PIPELINE: CaseStatus[] = [
  "identified",
  "verify_license",
  "license_verified",
  "converted",
  "fined",
  "dismissed",
];

function getAvailableTransitions(current: CaseStatus): CaseStatus[] {
  switch (current) {
    case "identified":
      // Can skip verify step and go straight to license_verified, or dismiss
      return ["verify_license", "license_verified", "dismissed"];
    case "verify_license":
      // Can step back to identified, confirm verified, or dismiss
      return ["identified", "license_verified", "dismissed"];
    case "license_verified":
      // converted/fined require a license — handled separately via Issue License button
      return ["dismissed"];
    case "converted":
    case "fined":
    case "dismissed":
      return []; // terminal
    default:
      return [];
  }
}

interface StatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  currentStatus: CaseStatus;
}

export function StatusChangeDialog({
  open,
  onOpenChange,
  caseId,
  currentStatus,
}: StatusChangeDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [targetStatus, setTargetStatus] = useState<CaseStatus | null>(null);
  const [dismissalReason, setDismissalReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const availableStatuses = getAvailableTransitions(currentStatus);

  function handleConfirm() {
    if (!targetStatus) return;
    setError(null);

    if (targetStatus === "dismissed" && !dismissalReason.trim()) {
      setError("Dismissal reason is required.");
      return;
    }

    startTransition(async () => {
      const result = await transitionCaseStatus(caseId, targetStatus, {
        dismissalReason: dismissalReason.trim() || undefined,
      });
      if (result.success) {
        toast.success("Case status updated");
        onOpenChange(false);
        setTargetStatus(null);
        setDismissalReason("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (availableStatuses.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Case Closed</DialogTitle>
            <DialogDescription>
              This case has reached a terminal status and cannot be transitioned further.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Case Status</DialogTitle>
          <DialogDescription>
            Current status: <CaseStatusBadge status={currentStatus} />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status options */}
          <div className="space-y-2">
            <Label>Move to</Label>
            <div className="grid gap-2">
              {availableStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setTargetStatus(status)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    targetStatus === status
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <CaseStatusBadge status={status} />
                  <div className="flex-1 text-xs text-muted-foreground">
                    {status === "identified"       && "Move back to identified — still under review"}
                    {status === "verify_license"  && "Actively checking whether user has a valid license"}
                    {status === "license_verified" && "Ready to issue a license or enforcement fine"}
                    {status === "dismissed"        && "Close without action — requires reason"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Dismissal reason */}
          {targetStatus === "dismissed" && (
            <div className="space-y-1.5">
              <Label htmlFor="dismissal-reason">
                Dismissal Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="dismissal-reason"
                placeholder="e.g. Already licensed under AT-2025-0042, False positive — font is different"
                value={dismissalReason}
                onChange={(e) => setDismissalReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setTargetStatus(null);
              setDismissalReason("");
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!targetStatus || isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
