"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Loader2, Calculator } from "lucide-react";
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

function mvr(n: number) {
  return `MVR ${(isFinite(n) ? n : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Live breakdown box shown in both create + edit forms */
function PriceBreakdown({
  desired,
  sharePct,
  gstRate,
}: {
  desired: number;
  sharePct: number;
  gstRate: number;
}) {
  if (desired <= 0 || sharePct <= 0) return null;

  const preGst      = desired / (sharePct / 100);
  const invoiceRate = preGst * (1 + gstRate);
  const akuruShare  = preGst * ((100 - sharePct) / 100);
  const gstAmount   = invoiceRate - preGst;

  return (
    <div className="col-span-full rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Calculator className="h-3 w-3" />
        Calculated Breakdown
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Contributor receives ({sharePct}%)</span>
          <span className="font-medium text-emerald-700">{mvr(desired)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Akuru Type receives ({100 - sharePct}%)</span>
          <span className="font-medium text-blue-700">{mvr(akuruShare)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pre-GST total</span>
          <span className="font-medium">{mvr(preGst)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">GST ({(gstRate * 100).toFixed(0)}%)</span>
          <span className="font-medium">{mvr(gstAmount)}</span>
        </div>
      </div>
      <div className="border-t border-border pt-2 flex justify-between text-xs font-semibold">
        <span>Invoice Rate (buyer pays, incl. GST)</span>
        <span>{mvr(invoiceRate)}</span>
      </div>
    </div>
  );
}

/** Inline edit form with its own state, pre-populates desired amount from stored base_price */
function FontEditInlineForm({
  font,
  contributors,
  isPending,
  onSave,
  onCancel,
}: {
  font: FontRow;
  contributors: Pick<DbContributor, "id" | "name" | "share_percentage">[];
  isPending: boolean;
  onSave: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const gstRate0      = font.gst_rate;
  const pct0          = font.contributor_share_pct;
  // Back-calculate the desired contributor amount from stored base_price
  const preGst0       = gstRate0 > 0 ? font.base_price / (1 + gstRate0) : font.base_price;
  const desired0      = preGst0 * (pct0 / 100);

  const [desiredAmount, setDesiredAmount] = useState(desired0.toFixed(2));
  const [sharePct, setSharePct]           = useState(String(pct0));
  const [gstRateStr, setGstRateStr]       = useState(String(gstRate0));

  const desired  = parseFloat(desiredAmount) || 0;
  const pct      = parseFloat(sharePct) || 0;
  const gstRate  = parseFloat(gstRateStr) || 0;
  const preGst   = desired > 0 && pct > 0 ? desired / (pct / 100) : 0;
  const invoiceRate = preGst * (1 + gstRate);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Overwrite base_price with the calculated invoice rate
    fd.set("base_price", invoiceRate.toFixed(2));
    onSave(fd);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Font Name *</label>
          <input name="name" defaultValue={font.name} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Contributor *</label>
          <select name="contributor_id" defaultValue={font.contributor_id} className={selectCls}>
            {contributors.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Desired contributor amount — the primary input */}
        <div>
          <label className={labelCls}>Desired Contributor Amount (MVR) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={desiredAmount}
            onChange={(e) => setDesiredAmount(e.target.value)}
            required
            className={inputCls}
            placeholder="e.g. 2000.00"
          />
          {/* Hidden — server receives the calculated invoice rate */}
          <input type="hidden" name="base_price" value={invoiceRate.toFixed(2)} />
        </div>

        <div>
          <label className={labelCls}>Contributor Share %</label>
          <input
            name="contributor_share_pct"
            type="number"
            min="0"
            max="100"
            value={sharePct}
            onChange={(e) => setSharePct(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Commission Model</label>
          <select name="commission_model" defaultValue={font.commission_model} className={selectCls}>
            <option value="contributor_owned">Contributor Owned</option>
            <option value="akuru_designed">Akuru Designed</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>GST Rate</label>
          <select
            name="gst_rate"
            value={gstRateStr}
            onChange={(e) => setGstRateStr(e.target.value)}
            className={selectCls}
          >
            <option value="0.08">8%</option>
            <option value="0">0% (exempt)</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Status</label>
          <select name="status" defaultValue={font.status} className={selectCls}>
            <option value="active">Active</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>

        <PriceBreakdown desired={desired} sharePct={pct} gstRate={gstRate} />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || invoiceRate <= 0}
          className="flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          Save Changes
        </button>
      </div>
    </form>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function FontsSection({ fonts, contributors }: FontsSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Create-form state
  const [newContribId, setNewContribId]     = useState("");
  const [newDesiredAmount, setNewDesiredAmount] = useState("");
  const [newSharePct, setNewSharePct]       = useState("");
  const [newGstRate, setNewGstRate]         = useState("0.08");

  const defaultSharePct = contributors.find((c) => c.id === newContribId)?.share_percentage ?? 50;
  const createSharePct  = parseFloat(newSharePct) || defaultSharePct;
  const createDesired   = parseFloat(newDesiredAmount) || 0;
  const createGstRate   = parseFloat(newGstRate) || 0;
  const createPreGst    = createDesired > 0 && createSharePct > 0
    ? createDesired / (createSharePct / 100)
    : 0;
  const createInvoiceRate = createPreGst * (1 + createGstRate);

  function run(
    fn: () => Promise<{ success: true } | { success: false; error: string }>,
    successMsg?: string,
  ) {
    startTransition(async () => {
      const result = await fn();
      if (result.success) {
        if (successMsg) toast.success(successMsg);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd   = new FormData(form);
    // Inject the calculated invoice rate as base_price
    fd.set("base_price", createInvoiceRate.toFixed(2));
    run(async () => {
      const result = await createFont(fd);
      if (result.success) {
        setShowForm(false);
        form.reset();
        setNewContribId("");
        setNewDesiredAmount("");
        setNewSharePct("");
        setNewGstRate("0.08");
      }
      return result;
    }, "Font created");
  }

  function handleUpdate(fontId: string, formData: FormData) {
    run(async () => {
      const result = await updateFont(fontId, formData);
      if (result.success) setEditingId(null);
      return result;
    }, "Font updated");
  }

  function handleDelete(fontId: string, name: string) {
    if (!confirm(`Delete font "${name}"? This cannot be undone.`)) return;
    run(() => deleteFont(fontId), "Font deleted");
  }

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

      {/* ── Create form ──────────────────────────────────────────────────── */}
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
              <input name="name" required className={inputCls} placeholder="e.g. Maumoon" />
            </div>
            <div>
              <label className={labelCls}>Contributor *</label>
              <select
                name="contributor_id"
                required
                value={newContribId}
                onChange={(e) => {
                  setNewContribId(e.target.value);
                  const contrib = contributors.find((c) => c.id === e.target.value);
                  if (contrib) setNewSharePct(String(contrib.share_percentage));
                }}
                className={selectCls}
              >
                <option value="">Select contributor…</option>
                {contributors.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Primary input: desired contributor amount */}
            <div>
              <label className={labelCls}>Desired Contributor Amount (MVR) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newDesiredAmount}
                onChange={(e) => setNewDesiredAmount(e.target.value)}
                required
                className={inputCls}
                placeholder="e.g. 2000.00"
              />
            </div>

            <div>
              <label className={labelCls}>Contributor Share %</label>
              <input
                name="contributor_share_pct"
                type="number"
                min="0"
                max="100"
                value={newSharePct || defaultSharePct}
                onChange={(e) => setNewSharePct(e.target.value)}
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
              <select
                name="gst_rate"
                value={newGstRate}
                onChange={(e) => setNewGstRate(e.target.value)}
                className={selectCls}
              >
                <option value="0.08">8%</option>
                <option value="0">0% (exempt)</option>
              </select>
            </div>

            <PriceBreakdown
              desired={createDesired}
              sharePct={createSharePct}
              gstRate={createGstRate}
            />
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
              disabled={isPending || createInvoiceRate <= 0}
              className="flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Create Font
            </button>
          </div>
        </form>
      )}

      {/* ── List table ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Font", "Contributor", "Invoice Rate", "Share %", "Status", ""].map((h) => (
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
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No fonts yet.
                  </td>
                </tr>
              )}
              {fonts.map((f) =>
                editingId === f.id ? (
                  <tr key={f.id} className="bg-muted/10">
                    <td colSpan={6} className="px-4 py-3">
                      <FontEditInlineForm
                        font={f}
                        contributors={contributors}
                        isPending={isPending}
                        onSave={(fd) => handleUpdate(f.id, fd)}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 text-xs font-medium">{f.name}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {f.contributor?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {mvr(f.base_price)}
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
