"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, ExternalLink, Trash2 } from "lucide-react";
import { CaseStatusBadge } from "./case-status-badge";
import { CasePriorityBadge } from "./case-priority-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { bulkUpdateCaseStatus } from "@/lib/actions/cases";
import type { CaseWithRelations, CaseStatus } from "@/types/database";
import { CASE_STATUS_LABELS } from "@/types/database";
import { differenceInDays, parseISO } from "date-fns";

function daysOpen(identifiedDate: string, resolvedDate: string | null): string {
  const end = resolvedDate ? parseISO(resolvedDate) : new Date();
  const days = differenceInDays(end, parseISO(identifiedDate));
  return days === 0 ? "Today" : `${days}d`;
}

interface CaseTableProps {
  cases: CaseWithRelations[];
  isAdmin: boolean;
}

const NEXT_STATUS: Partial<Record<CaseStatus, CaseStatus>> = {
  identified: "verify_license",
  verify_license: "license_verified",
  license_verified: "converted",
};

export function CaseTable({ cases, isAdmin }: CaseTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleAll() {
    if (selected.size === cases.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(cases.map((c) => c.id)));
    }
  }

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function handleBulkAdvance() {
    // Determine common next status — advance to verify_license for simplicity
    await bulkUpdateCaseStatus([...selected], "verify_license");
    setSelected(new Set());
    router.refresh();
  }

  if (cases.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">No cases found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleBulkAdvance}>
            Advance to Verify License
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={selected.size === cases.length && cases.length > 0}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Case #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Font
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Buyer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Open
              </th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cases.map((c) => (
              <tr
                key={c.id}
                className="group hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={() => toggle(c.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-muted-foreground">
                    {c.case_number}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/cases/${c.id}`}
                    className="font-medium text-foreground hover:underline line-clamp-1 max-w-[200px] block"
                  >
                    {c.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {c.font?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {c.buyer?.name ?? (
                    <span className="italic">Unknown</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <CaseStatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3">
                  <CasePriorityBadge priority={c.priority} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {c.identified_date}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {daysOpen(c.identified_date, c.resolved_date)}
                </td>
                <td className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/cases/${c.id}`} className="flex items-center gap-2">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open case
                        </Link>
                      </DropdownMenuItem>
                      {NEXT_STATUS[c.status] && (
                        <DropdownMenuItem
                          onClick={async () => {
                            await bulkUpdateCaseStatus([c.id], NEXT_STATUS[c.status]!);
                            router.refresh();
                          }}
                        >
                          Move to {CASE_STATUS_LABELS[NEXT_STATUS[c.status]!]}
                        </DropdownMenuItem>
                      )}
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            asChild
                          >
                            <Link href={`/cases/${c.id}?action=delete`}>
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
