"use client";

import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { CalendarIcon, X, Loader2 } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

// ── URL-param driven picker (for server-filtered pages) ───────────────────────

interface DateRangePickerProps {
  className?: string;
  fromParam?: string; // URL param name for start date, default "from"
  toParam?:   string; // URL param name for end date, default "to"
  align?:     "start" | "end" | "center";
}

export function DateRangePicker({
  className,
  fromParam = "from",
  toParam   = "to",
}: DateRangePickerProps) {
  const router     = useRouter();
  const pathname   = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const ref = React.useRef<HTMLDivElement>(null);

  const fromStr = searchParams.get(fromParam);
  const toStr   = searchParams.get(toParam);

  const from = fromStr && isValid(parseISO(fromStr)) ? parseISO(fromStr) : undefined;
  const to   = toStr   && isValid(parseISO(toStr))   ? parseISO(toStr)   : undefined;

  const range: DateRange | undefined = from ? { from, to } : undefined;

  function handleSelect(r: DateRange | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (r?.from) {
      params.set(fromParam, format(r.from, "yyyy-MM-dd"));
    } else {
      params.delete(fromParam);
    }
    if (r?.to) {
      params.set(toParam, format(r.to, "yyyy-MM-dd"));
    } else {
      params.delete(toParam);
    }
    if (r?.from && r?.to) {
      setOpen(false);
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    } else {
      router.push(`${pathname}?${params.toString()}`);
    }
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    const params = new URLSearchParams(searchParams.toString());
    params.delete(fromParam);
    params.delete(toParam);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  // Close on outside click
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = from
    ? to
      ? `${format(from, "dd MMM yyyy")} – ${format(to, "dd MMM yyyy")}`
      : `From ${format(from, "dd MMM yyyy")}`
    : "Date range";

  const hasValue = !!from;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs transition-colors hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed",
          hasValue ? "text-foreground font-medium" : "text-muted-foreground",
          open && "ring-1 ring-ring"
        )}
      >
        {isPending
          ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          : <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
        }
        <span className="max-w-[200px] truncate">{label}</span>
        {hasValue && !isPending && (
          <span
            role="button"
            onMouseDown={(e) => { e.stopPropagation(); clear(e as unknown as React.MouseEvent); }}
            className="ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-50 rounded-md border border-border bg-white shadow-lg">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={from}
            selected={range}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {from && !to ? "Now select an end date" : "Select a start date"}
            </span>
            {hasValue && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={(e) => clear(e)}>
                Clear
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Local-state driven picker (for client-filtered pages like Reports) ─────────

interface LocalDateRangePickerProps {
  from:      Date | undefined;
  to:        Date | undefined;
  onChange:  (range: DateRange | undefined) => void;
  className?: string;
}

export function LocalDateRangePicker({ from, to, onChange, className }: LocalDateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const range: DateRange | undefined = from ? { from, to } : undefined;

  function handleSelect(r: DateRange | undefined) {
    onChange(r);
    if (r?.from && r?.to) setOpen(false);
  }

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = from
    ? to
      ? `${format(from, "dd MMM yyyy")} – ${format(to, "dd MMM yyyy")}`
      : `From ${format(from, "dd MMM yyyy")}`
    : "Date range";

  const hasValue = !!from;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs transition-colors hover:bg-accent",
          hasValue ? "text-foreground font-medium" : "text-muted-foreground",
          open && "ring-1 ring-ring"
        )}
      >
        <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="max-w-[200px] truncate">{label}</span>
        {hasValue && (
          <span
            role="button"
            onMouseDown={(e) => { e.stopPropagation(); onChange(undefined); }}
            className="ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-50 rounded-md border border-border bg-white shadow-lg">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={from}
            selected={range}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {from && !to ? "Now select an end date" : "Select a start date"}
            </span>
            {hasValue && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { onChange(undefined); setOpen(false); }}>
                Clear
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
