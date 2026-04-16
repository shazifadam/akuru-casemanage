"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import {
  createFont,
  updateFont,
  deleteFont,
} from "@/lib/actions/contributors-fonts";
import type { DbFont, DbContributor } from "@/types/database";

interface FontRow extends DbFont {
  contributor: { name: string } | null;
}

interface FontsSectionProps {
  fonts: FontRow[];
  contributors: Pick<DbContributor, "id" | "name" | "share_percentage">[];
}

const inputCls =
  "w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring";
const selectCls =
  "w-full h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring";
const labelCls = "block text-xs font-medium mb-1";

export function FontsSection({ fonts, contributors }: FontsSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm]       = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [newContribId, setNewContribId] = useState("");
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
      const result = await createFont(new FormData(form));
      if (result.success) {
        setShowForm(false);
        form.reset();
        setNewContribId("");
      }
      return result;
    });
  }

  function handleUpdate(fontId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    run(async () => {
      const result = await updateFont(fontId, formData);
      if (result.success) {
        setEditingId(null);
      }
      return result;
    });
  }

  function handleDelete(fontId: string, name: string) {
    if (!confirm(`Delete font "${name}"? This cannot be undone.`)) return;
    run(() => deleteFont(fontId));
  }

  // Auto-fill share % from selected contributor
  const defaultSharePct =
    contributors.find((c) => c.id === newContribId)?.share_percentage ?? 50;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Fonts</h3>
          <p className="text-xs text-muted-foreground">
            {fonts.length} font{fonts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Font
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
            New Font
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Font Name *</label>
              <input
                name="name"
                required
                className={inputCls}
                placeholder="e.g. Maumoon"
              />
            </div>
            <div>
              <label className={labelCls}>Contributor *</label>
              <select
                name="contributor_id"
                required
                value={newContribId}
                onChange={(e) => setNewContribId(e.target.value)}
                className={selectCls}
              >
                <option value="">Select contributor…</option>
                {contributors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Base Price (MVR, excl. GST)</label>
              <input
                name="base_price"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Contributor Share %</label>
              <input
                name="contributor_share_pct"
                type="number"
                min="0"
                max="100"
                value={defaultSharePct}
                onChange={() => {}}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Commission Model</label>
              <select name="commission_model" className={selectCls}>
                <option value="contributor_owned">Contributor Owned</option>
                <option value="akuru_designed">Akuru Designed</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>GST Rate</label>
              <select name="gst_rate" className={selectCls}>
                <option value="0.08">8%</option>
                <option value="0">0% (exempt)</option>
              </select>
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
              Create Font
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Font", "Contributor", "Base Price", "Share %", "Status", ""].map((h) => (
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
              {fonts.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-xs text-muted-foreground"
                  >
                    No fonts yet.
                  </td>
                </tr>
              )}
              {fonts.map((f) =>
                editingId === f.id ? (
                  <tr key={f.id} className="bg-muted/10">
                    <td colSpan={6} className="px-4 py-3">
                      <form
                        onSubmit={(e) => handleUpdate(f.id, e)}
                        className="space-y-3"
                      >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className={labelCls}>Font Name *</label>
                            <input
                              name="name"
                              defaultValue={f.name}
                              required
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Contributor *</label>
                            <select
                              name="contributor_id"
                              defaultValue={f.contributor_id}
                              className={selectCls}
                            >
                              {contributors.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Base Price (MVR)</label>
                            <input
                              name="base_price"
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={f.base_price}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Contributor Share %</label>
                            <input
                              name="contributor_share_pct"
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={f.contributor_share_pct}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Commission Model</label>
                            <select
                              name="commission_model"
                              defaultValue={f.commission_model}
                              className={selectCls}
                            >
                              <option value="contributor_owned">Contributor Owned</option>
                              <option value="akuru_designed">Akuru Designed</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>GST Rate</label>
                            <select
                              name="gst_rate"
                              defaultValue={String(f.gst_rate)}
                              className={selectCls}
                            >
                              <option value="0.08">8%</option>
                              <option value="0">0% (exempt)</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Status</label>
                            <select
                              name="status"
                              defaultValue={f.status}
                              className={selectCls}
                            >
                              <option value="active">Active</option>
                              <option value="discontinued">Discontinued</option>
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
                  <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 text-xs font-medium">{f.name}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {f.contributor?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      MVR{" "}
                      {f.base_price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {f.contributor_share_pct}%
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${
                          f.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingId(f.id)}
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(f.id, f.name)}
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
