"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import {
  MessageSquare,
  RefreshCw,
  Paperclip,
  UserCheck,
  FileText,
  UserCog,
  Loader2,
  Send,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CaseStatusBadge } from "./case-status-badge";
import { addCaseComment } from "@/lib/actions/cases";
import type { ActivityLogWithUser, ActivityType, CaseStatus } from "@/types/database";
import { CASE_STATUS_LABELS } from "@/types/database";

const activityIcons: Record<ActivityType, React.ElementType> = {
  status_change: RefreshCw,
  comment: MessageSquare,
  evidence_added: Paperclip,
  buyer_linked: UserCheck,
  license_issued: FileText,
  assignment_change: UserCog,
};

const activityColors: Record<ActivityType, string> = {
  status_change: "bg-blue-100 text-blue-600",
  comment: "bg-slate-100 text-slate-600",
  evidence_added: "bg-violet-100 text-violet-600",
  buyer_linked: "bg-emerald-100 text-emerald-600",
  license_issued: "bg-amber-100 text-amber-600",
  assignment_change: "bg-orange-100 text-orange-600",
};

interface ActivityTimelineProps {
  caseId: string;
  activities: ActivityLogWithUser[];
}

export function ActivityTimeline({ caseId, activities }: ActivityTimelineProps) {
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAddComment() {
    if (!comment.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await addCaseComment(caseId, comment);
        setComment("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add comment");
      }
    });
  }

  function renderActivity(activity: ActivityLogWithUser) {
    const Icon = activityIcons[activity.activity_type];
    const colorClass = activityColors[activity.activity_type];
    const userName = activity.user?.full_name ?? "System";

    let content: React.ReactNode = null;

    switch (activity.activity_type) {
      case "status_change":
        content = (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status changed</span>
            {activity.old_value && (
              <>
                <CaseStatusBadge status={activity.old_value as CaseStatus} />
                <span className="text-muted-foreground">→</span>
              </>
            )}
            {activity.new_value && (
              <CaseStatusBadge status={activity.new_value as CaseStatus} />
            )}
          </div>
        );
        break;
      case "comment":
        content = (
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {activity.comment}
          </p>
        );
        break;
      case "evidence_added":
        content = (
          <div className="space-y-1">
            {activity.comment && (
              <p className="text-sm text-foreground">{activity.comment}</p>
            )}
            {activity.attachment_url && (
              <a
                href={activity.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary underline"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                View evidence
              </a>
            )}
          </div>
        );
        break;
      case "buyer_linked":
        content = (
          <p className="text-sm text-muted-foreground">Buyer linked to case</p>
        );
        break;
      case "license_issued":
        content = (
          <p className="text-sm text-muted-foreground">License issued and linked</p>
        );
        break;
      default:
        content = activity.comment ? (
          <p className="text-sm text-muted-foreground">{activity.comment}</p>
        ) : null;
    }

    return (
      <div key={activity.id} className="flex gap-3">
        {/* Icon */}
        <div className="flex flex-col items-center">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="mt-1 w-px flex-1 bg-border" />
        </div>

        {/* Content */}
        <div className="mb-4 min-w-0 flex-1 rounded-lg border border-border bg-card p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">{userName}</span>
            <time className="text-[10px] text-muted-foreground">
              {format(parseISO(activity.created_at), "MMM d, yyyy · h:mm a")}
            </time>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Activity</h3>

      {/* Comment input */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          className="resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleAddComment();
            }
          }}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">⌘↵ to submit</span>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleAddComment}
            disabled={isPending || !comment.trim()}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Comment
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No activity yet.
        </p>
      ) : (
        <div>
          {activities.map(renderActivity)}
          {/* End marker */}
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-border" />
            </div>
            <p className="pt-1.5 text-xs text-muted-foreground">Case created</p>
          </div>
        </div>
      )}
    </div>
  );
}
