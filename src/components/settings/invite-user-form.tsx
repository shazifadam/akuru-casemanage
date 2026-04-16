"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, Copy, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUser } from "@/lib/actions/users";

export function InviteUserForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setTempPassword(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createUser(formData);
      if (result.success) {
        setTempPassword(result.tempPassword);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function copyPassword() {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Add New User</h3>
      </div>

      {tempPassword ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-2">
            <p className="text-xs font-medium text-emerald-800">
              ✓ User created successfully. Share these credentials securely.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white border border-emerald-200 px-2 py-1.5 text-sm font-mono text-emerald-900 select-all">
                {showPassword ? tempPassword : "•".repeat(tempPassword.length)}
              </code>
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700"
                title={showPassword ? "Hide" : "Show"}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={copyPassword}
                className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700"
                title="Copy password"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-xs text-emerald-700">
              Temporary password — the user should change it after first login.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => setTempPassword(null)}
          >
            Add another user
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="full_name" className="text-xs">Full Name *</Label>
            <Input
              id="full_name"
              name="full_name"
              required
              placeholder="e.g. Ahmed Faisal"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="user@akurutype.mv"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="role" className="text-xs">Role *</Label>
            <select
              id="role"
              name="role"
              required
              defaultValue="enforcer"
              className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="enforcer">Enforcer — can manage cases &amp; licenses</option>
              <option value="admin">Admin — full access including settings</option>
            </select>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" size="sm" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create User
          </Button>
        </form>
      )}
    </div>
  );
}
