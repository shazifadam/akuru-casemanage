"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import {
  createContributor,
  updateContributor,
  deleteContributor,
} from "@/lib/actions/contributors-fonts";
import type { DbContributor } from "@/types/database";

interface ContributorsSectionProps {
  contributors: DbContributor[];
}

const inputCls =
  "w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring";
const labelCls = "block text-xs font-medium mb-1";

export function ContributorsSection({ contributors }: ContributorsSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm]       = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);

  function run(fn: () => Promise<{ success: true } | { success: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    run(async () => {
      const result = await createContributor(new FormData(form));
      if (result.success) {
        setShowForm(false);
        form.reset();
      }
      return result;
    });
  }

  function handleUpdate(contributorId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    run(async () => {
      const result = await updateContributor(contributorId, formData);
      if (result.success) {
        setEditingId(null);
      }
      return result;
    });
  }

  function handleDelete(contributorId: string, name: string) {
    if (!confirm(`Delete contributor "${name}"? This cannot be undone.`)) return;
    run(() => deleteContributor(contributorId));
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Contributors</h3>
          <p className="text-xs text-muted-foreground">
            {contributors.length} contributor{contributors.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Contributor
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-border bg-card p-4 space-y-3"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            New Contributor
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Name *</label>
              <input
                name="name"
                required
                className={inputCls}
                placeholder="e.g. Ahmed Naufal"
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                name="contact_email"
                type="email"
                className={inputCls}
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <label className={labelCls}>Default Share %</label>
              <input
                name="share_percentage"
                type="number"
                min="0"
                max="100"
                defaultValue="50"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Create Contributor
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Contributor", "Email", "Share %", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contributors.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-xs text-muted-foreground"
                  >
                    No contributors yet.
                  </td>
                </tr>
              )}
              {contributors.map((c) =>
                editingId === c.id ? (
                  <tr key={c.id} className="bg-muted/10">
                    <td colSpan={5} className="px-4 py-3">
                      <form
                        onSubmit={(e) => handleUpdate(c.id, e)}
                        className="space-y-3"
                      >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className={labelCls}>Name *</label>
                            <input
                              name="name"
                              defaultValue={c.name}
                              required
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Email</label>
                            <input
                              name="contact_email"
                              type="email"
                              defaultValue={c.contact_email ?? ""}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Share %</label>
                            <input
                              name="share_percentage"
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={c.share_percentage}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Status</label>
                            <select
                              name="status"
                              defaultValue={c.status}
                              className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isPending}
                            className="flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                          >
                            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 text-xs font-medium">{c.name}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {c.contact_email ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {c.share_percentage}%
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${
                          c.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingId(c.id)}
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          disabled={isPending}
                          className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
