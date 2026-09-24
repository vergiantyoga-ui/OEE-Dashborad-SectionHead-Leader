import {
  Area,
  AreaChart,
  CartesianGrid,
  Line as RLine,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

import { OEE_TIERS, TIER_HEX } from "@/lib/oee/config";
import type { TrendPoint } from "@/lib/oee/horizon";

const AXIS = { fontSize: 10, fill: "var(--muted-foreground)" } as const;
const MARGIN = { top: 8, right: 10, bottom: 0, left: -20 };

function ApqTooltip({
  active,
  payload,
  label,
  main,
}: TooltipProps<number, string> & { main: "oee" | "speed" }) {
  const p = payload?.[0]?.payload as TrendPoint | undefined;
  if (!active || !p) return null;
  const rows: [string, number, string][] = [
    ["Availability", p.availability, "var(--loss-availability)"],
    ["Performance", p.performance, "var(--loss-performance)"],
    ["Quality", p.quality, "var(--loss-quality)"],
  ];
  return (
    <div className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 text-[11px] shadow-md">
      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <span className="font-semibold">{label}</span>
        <span className="font-semibold">
          {main === "oee" ? `OEE ${p.oee.toFixed(0)}%` : `${p.speed} ppm`}
        </span>
      </div>
      {rows.map(([name, v, color]) => (
        <div key={name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-1.5 rounded-full" style={{ background: color }} />
            {name}
          </span>
          <span className="tabular-nums">{v.toFixed(0)}%</span>
        </div>
      ))}
      {main === "speed" && (
        <div className="mt-1 border-t border-border pt-1 text-muted-foreground">
          OEE {p.oee.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

function StopDot(props: {
  cx?: number;
  cy?: number;
  payload?: TrendPoint;
  color: string;
  valueKey: "oee" | "speed";
  threshold: number;
}) {
  const { cx, cy, payload, color, valueKey, threshold } = props;
  if (cx === undefined || cy === undefined || !payload) return <g />;
  const low = payload[valueKey] < threshold;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={low ? 3.6 : 2.6}
      fill={low ? TIER_HEX.bad : color}
      stroke="var(--surface)"
      strokeWidth={1}
    />
  );
}

export function OeeTrendChart({ data, zoneAvg }: { data: TrendPoint[]; zoneAvg: number }) {
  // Highlight only real dips (stops) rather than every point below the tier line.
  const mean = data.reduce((a, d) => a + d.oee, 0) / Math.max(1, data.length);
  const dip = Math.min(OEE_TIERS.warn, mean - 8);
  return (
    <div className="relative min-h-[200px] w-full flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={MARGIN}>
          <defs>
            <linearGradient id="oeeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-oee)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--chart-oee)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} stroke="var(--grid)" minTickGap={14} />
          <YAxis tick={AXIS} stroke="var(--grid)" domain={[0, 100]} ticks={[0, 50, 100]} />
          <Tooltip content={<ApqTooltip main="oee" />} cursor={{ stroke: "var(--border)" }} />
          <ReferenceLine y={zoneAvg} stroke="var(--tier-good)" strokeDasharray="5 4" />
          <Area
            type="monotone"
            dataKey="oee"
            stroke="var(--chart-oee)"
            strokeWidth={1.8}
            fill="url(#oeeFill)"
            dot={<StopDot color="var(--chart-oee)" valueKey="oee" threshold={dip} />}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OutputPlanChart({ data }: { data: TrendPoint[] }) {
  const po = data.find((d) => d.poChange);
  return (
    <div className="relative min-h-[200px] w-full flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={MARGIN}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} stroke="var(--grid)" minTickGap={14} />
          <YAxis tick={AXIS} stroke="var(--grid)" domain={[0, 110]} ticks={[0, 50, 100]} />
          <Tooltip
            formatter={(v: number, name: string) => [
              `${v}%`,
              name === "actual" ? "Actual" : "Plan",
            ]}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 11,
            }}
          />
          {po && (
            <ReferenceLine
              x={po.label}
              stroke="var(--muted-foreground)"
              strokeDasharray="2 3"
              label={{
                value: "PO change",
                position: "insideTopRight",
                fontSize: 9,
                fill: "var(--muted-foreground)",
              }}
            />
          )}
          <RLine
            type="linear"
            dataKey="plan"
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeWidth={1.2}
            dot={false}
            isAnimationActive={false}
          />
          <RLine
            type="linear"
            dataKey="actual"
            stroke="var(--chart-output)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineSpeedChart({ data, stdPpm }: { data: TrendPoint[]; stdPpm: number }) {
  const mean = data.reduce((a, d) => a + d.speed, 0) / Math.max(1, data.length);
  const max = Math.ceil((stdPpm * 1.15) / 10) * 10;
  return (
    <div className="relative min-h-[200px] w-full flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={MARGIN}>
          <defs>
            <linearGradient id="speedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--tier-good)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--tier-good)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} stroke="var(--grid)" minTickGap={14} />
          <YAxis
            tick={AXIS}
            stroke="var(--grid)"
            domain={[0, max]}
            ticks={[0, Math.round(max / 2), max]}
          />
          <Tooltip content={<ApqTooltip main="speed" />} cursor={{ stroke: "var(--border)" }} />
          <ReferenceLine y={stdPpm} stroke="var(--tier-good)" strokeDasharray="5 4" />
          <Area
            type="monotone"
            dataKey="speed"
            stroke="var(--tier-good)"
            strokeWidth={1.8}
            fill="url(#speedFill)"
            dot={<StopDot color="var(--tier-good)" valueKey="speed" threshold={mean * 0.88} />}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({
  items,
}: {
  items: { label: string; color: string; dashed?: boolean }[];
}) {
  return (
    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.dashed ? (
            <span className="h-0 w-3 border-t-2 border-dashed" style={{ borderColor: i.color }} />
          ) : (
            <span className="size-2 rounded-sm" style={{ background: i.color }} />
          )}
          {i.label}
        </span>
      ))}
    </div>
  );
}
