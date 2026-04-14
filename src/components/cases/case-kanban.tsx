"use client";

import Link from "next/link";
import { CaseStatusBadge } from "./case-status-badge";
import { CasePriorityBadge } from "./case-priority-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CaseWithRelations, CaseStatus } from "@/types/database";
import { CASE_STATUS_LABELS, CASE_STATUS_ORDER } from "@/types/database";
import { differenceInDays, parseISO } from "date-fns";

const KANBAN_COLUMNS: CaseStatus[] = [
  "identified",
  "verify_license",
  "license_verified",
  "converted",
  "fined",
  "dismissed",
];

const columnColors: Record<CaseStatus, string> = {
  identified: "border-t-slate-400",
  verify_license: "border-t-yellow-400",
  license_verified: "border-t-orange-400",
  converted: "border-t-emerald-400",
  fined: "border-t-blue-400",
  dismissed: "border-t-slate-300",
};

interface CaseKanbanProps {
  cases: CaseWithRelations[];
}

export function CaseKanban({ cases }: CaseKanbanProps) {
  const byStatus = KANBAN_COLUMNS.reduce<Record<CaseStatus, CaseWithRelations[]>>(
    (acc, status) => {
      acc[status] = cases.filter((c) => c.status === status);
      return acc;
    },
    {} as Record<CaseStatus, CaseWithRelations[]>
  );

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((status) => {
        const columnCases = byStatus[status];
        return (
          <div
            key={status}
            className={`flex w-72 shrink-0 flex-col rounded-lg border-t-2 border border-border bg-muted/30 ${columnColors[status]}`}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs font-semibold text-foreground">
                {CASE_STATUS_LABELS[status]}
              </span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                {columnCases.length}
              </span>
            </div>

            <ScrollArea className="flex-1 max-h-[calc(100vh-280px)]">
              <div className="space-y-2 p-2">
                {columnCases.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No cases
                  </p>
                ) : (
                  columnCases.map((c) => {
                    const days = differenceInDays(
                      c.resolved_date ? parseISO(c.resolved_date) : new Date(),
                      parseISO(c.identified_date)
                    );
                    return (
                      <Link key={c.id} href={`/cases/${c.id}`}>
                        <div className="group rounded-md border border-border bg-card p-3 shadow-sm hover:border-primary/50 hover:shadow-md transition-all">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {c.case_number}
                            </span>
                            <CasePriorityBadge priority={c.priority} />
                          </div>
                          <p className="mb-2 line-clamp-2 text-xs font-medium leading-snug text-foreground">
                            {c.title}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{c.font?.name ?? "—"}</span>
                            <span>{days === 0 ? "Today" : `${days}d`}</span>
                          </div>
                          {c.buyer && (
                            <p className="mt-1 truncate text-[10px] text-muted-foreground">
                              {c.buyer.name}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
