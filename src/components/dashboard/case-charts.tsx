"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyDataPoint } from "@/lib/data/queries";

interface Props {
  monthlyData: MonthlyDataPoint[];
}

const CHART_COLORS = {
  identified: "#3b82f6", // blue-500
  resolved:   "#10b981", // emerald-500
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function CaseCharts({ monthlyData }: Props) {
  const totalIdentified = monthlyData.reduce((s, d) => s + d.identified, 0);
  const totalResolved   = monthlyData.reduce((s, d) => s + d.resolved, 0);

  // Cumulative data for the "running total" chart
  let cumIdentified = 0;
  let cumResolved   = 0;
  const cumulativeData = monthlyData.map((d) => {
    cumIdentified += d.identified;
    cumResolved   += d.resolved;
    return { month: d.month, identified: cumIdentified, resolved: cumResolved };
  });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* ── Monthly trend line chart ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Monthly Case Activity</h3>
          <p className="text-xs text-muted-foreground">Cases identified vs resolved per month</p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) =>
                value === "identified" ? "Identified" : "Resolved"
              }
            />
            <Line
              type="monotone"
              dataKey="identified"
              stroke={CHART_COLORS.identified}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART_COLORS.identified }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="resolved"
              stroke={CHART_COLORS.resolved}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART_COLORS.resolved }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Running totals bar chart ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Cumulative Total</h3>
            <p className="text-xs text-muted-foreground">Running identified vs resolved (last 6 months)</p>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-xs text-muted-foreground">Identified</p>
              <p className="text-lg font-bold" style={{ color: CHART_COLORS.identified }}>
                {totalIdentified}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Resolved</p>
              <p className="text-lg font-bold" style={{ color: CHART_COLORS.resolved }}>
                {totalResolved}
              </p>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={cumulativeData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) =>
                value === "identified" ? "Total Identified" : "Total Resolved"
              }
            />
            <Bar
              dataKey="identified"
              fill={CHART_COLORS.identified}
              radius={[3, 3, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="resolved"
              fill={CHART_COLORS.resolved}
              radius={[3, 3, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
