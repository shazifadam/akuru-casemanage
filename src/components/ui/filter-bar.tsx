"use client";

/**
 * FilterBar — wraps a filter form and shows a loading spinner + dims
 * the submit button while the router navigation is in flight.
 *
 * Usage: replace <form> with <FilterBar> on any server-rendered filter row.
 * The component intercepts the native form submit, reads the URLSearchParams,
 * and calls router.push() inside startTransition so isPending is trackable.
 */

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();
  const [isDirty, setIsDirty] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    const params = new URLSearchParams();
    data.forEach((value, key) => {
      if (value && value !== "") params.set(key, value.toString());
    });
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  // Also fire on select change so the user doesn't need to hit Filter button
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    const params = new URLSearchParams();
    data.forEach((value, key) => {
      if (value && value !== "") params.set(key, value.toString());
    });
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onChange={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === "SELECT") {
          handleChange(e as unknown as React.ChangeEvent<HTMLSelectElement>);
        } else if (target.tagName === "INPUT") {
          setIsDirty(true);
        }
      }}
      className={cn("flex flex-wrap items-center gap-2 group", isDirty && "is-dirty", className)}
    >
      {isPending && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      )}
      {/* Clone children with disabled state when pending */}
      <fieldset disabled={isPending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
