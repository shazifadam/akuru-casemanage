"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle2, Clock, AlertCircle, BookCheck, Trash2 } from "lucide-react";
import { toggleQbSynced, updatePaymentStatus, deleteLicense } from "@/lib/actions/licenses";
import type { PaymentStatus } from "@/types/database";

interface LicenseActionsProps {
  licenseId: string;
  currentStatus: PaymentStatus;
  qbSynced: boolean;
  isAdmin: boolean;
}

export function LicenseActions({ licenseId, currentStatus, qbSynced, isAdmin }: LicenseActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.success) {
        router.refresh();
      } else if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <>
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs" disabled={isPending}>
            <MoreHorizontal className="h-4 w-4" />
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {currentStatus !== "paid" && (
            <DropdownMenuItem onClick={() => handle(() => updatePaymentStatus(licenseId, "paid"))}>
              <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-600" />Mark as Paid
            </DropdownMenuItem>
          )}
          {currentStatus !== "pending" && (
            <DropdownMenuItem onClick={() => handle(() => updatePaymentStatus(licenseId, "pending"))}>
              <Clock className="mr-2 h-3.5 w-3.5 text-yellow-600" />Mark as Pending
            </DropdownMenuItem>
          )}
          {currentStatus !== "overdue" && (
            <DropdownMenuItem onClick={() => handle(() => updatePaymentStatus(licenseId, "overdue"))}>
              <AlertCircle className="mr-2 h-3.5 w-3.5 text-red-600" />Mark as Overdue
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handle(() => toggleQbSynced(licenseId, qbSynced))}>
            <BookCheck className="mr-2 h-3.5 w-3.5" />{qbSynced ? "Unmark QB Synced" : "Mark QB Synced"}
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => { if (confirm("Delete this license?")) handle(() => deleteLicense(licenseId)); }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />Delete License
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
