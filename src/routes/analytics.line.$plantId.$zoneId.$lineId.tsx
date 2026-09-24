import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, ChevronDown } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import {
  ChartLegend,
  LineSpeedChart,
  OeeTrendChart,
  OutputPlanChart,
} from "@/components/oee/line-charts";
import { HorizonMenu, LineStatusBadge } from "@/components/oee/floor-ui";
import { MachineIcon, MachineIllustration } from "@/components/oee/machine-art";
import { Donut, EmptyState, MetricBar, PageHeader, Panel } from "@/components/oee/ui";
import { useApp } from "@/lib/oee/app-context";
import { SENSOR_SPEC, STATUS_HEX, TIER_TEXT, tierOf } from "@/lib/oee/config";
import { getLine, getPlant, getZone } from "@/lib/oee/data";
import {
  formatMinutes,
  formatQty,
  horizonMeta,
  isHorizon,
  lineTrend,
  NOW_MINUTES,
  clockMinusMinutes,
  lineView,
  zoneViews,
  type HorizonId,
  type LineView,
  type MachineView,
} from "@/lib/oee/horizon";
import { pick, rand } from "@/lib/oee/rng";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics/line/$plantId/$zoneId/$lineId")({
  validateSearch: (search: Record<string, unknown>): { h: HorizonId } => ({
    h: isHorizon(search["h"]) ? search["h"] : "shift",
  }),
  head: ({ params }) => ({
    meta: [
      { title: `${params.lineId} — Line Performance` },
      {
        name: "description",
        content:
          "Line performance detail: KPI strip, line condition, machine chain, alarms, OEE/output/speed trends and per-machine OEE with sensor readings.",
      },
      { property: "og:title", content: `${params.lineId} — Line Performance` },
      { property: "og:description", content: "Line KPI, trends and per-machine OEE breakdown." },
    ],
  }),
  component: LinePerformancePage,
});

function LinePerformancePage() {
  const { plantId, zoneId, lineId } = Route.useParams();
  const { h } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { setFloor } = useApp();

  const plant = getPlant(plantId);
  const zone = getZone(plantId, zoneId);
  const line = getLine(plantId, zoneId, lineId);

  const view = useMemo(
    () => (plant && zone && line ? lineView(line, zone, plant, h) : undefined),
    [plant, zone, line, h],
  );
  const zoneAvg = useMemo(() => zoneViews(plantId, zoneId, h)[0]?.oee ?? 0, [plantId, zoneId, h]);
  const trend = useMemo(() => (view ? lineTrend(view) : []), [view]);

  if (!plant || !zone || !line || !view) {
    return (
      <div className="p-6">
        <EmptyState message="Line tidak ditemukan. Kembali ke OEE Analytics dan pilih line dari Factory Floor Map." />
      </div>
    );
  }

  const setHorizon = (next: HorizonId) => {
    setFloor({ horizon: next });
    navigate({ search: { h: next }, replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <PageHeader
        title={line.id}
        crumbs={[
          { label: "OEE Analytics", to: "/analytics" },
          { label: plant.name },
          { label: zone.name },
          { label: line.id },
        ]}
        back={{ label: "Floor Map", to: "/analytics" }}
      >
        <HorizonMenu value={h} onChange={setHorizon} />
        <div className="text-right leading-tight">
          <p className="text-xs font-semibold">Week 32</p>
          <p className="text-[10px] text-muted-foreground">05-Aug-2026, 08:03</p>
        </div>
      </PageHeader>

      <main className="flex flex-1 flex-col gap-3 p-4">
        <KpiStrip view={view} zoneAvg={zoneAvg} />

        <div className="grid gap-3 lg:grid-cols-[minmax(220px,0.9fr)_minmax(0,2fr)_minmax(240px,1.1fr)]">
          <LineCondition view={view} />
          <LineChain view={view} />
          <AlarmsPanel view={view} />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Panel
            title="OEE trend"
            action={
              <ChartLegend
                items={[
                  { label: "OEE", color: "var(--chart-oee)" },
                  {
                    label: `Zone avg ${zoneAvg.toFixed(0)}%`,
                    color: "var(--tier-good)",
                    dashed: true,
                  },
                ]}
              />
            }
            bodyClassName="justify-end p-3"
          >
            <OeeTrendChart data={trend} zoneAvg={zoneAvg} />
          </Panel>
          <Panel
            title="Output vs plan (cum %)"
            subtitle={
              h === "shift"
                ? "Resets when PO/batch changes"
                : `Cumulative, ${horizonMeta(h).label.toLowerCase()}`
            }
            action={
              <ChartLegend
                items={[
                  { label: "Actual", color: "var(--chart-output)" },
                  { label: "Plan", color: "var(--muted-foreground)", dashed: true },
                ]}
              />
            }
            bodyClassName="justify-end p-3"
          >
            <OutputPlanChart data={trend} />
          </Panel>
          <Panel
            title="Line speed"
            action={
              <ChartLegend
                items={[
                  { label: "ppm", color: "var(--tier-good)" },
                  { label: `std ${view.stdPpm}`, color: "var(--tier-good)", dashed: true },
                ]}
              />
            }
            bodyClassName="justify-end p-3"
          >
            <LineSpeedChart data={trend} stdPpm={view.stdPpm} />
          </Panel>
        </div>

        <MachineSection key={`${plantId}-${zoneId}-${lineId}`} view={view} />
      </main>
    </div>
  );
}

/* --------------------------------------------------------------- KPI strip */

function KpiStrip({ view: v, zoneAvg }: { view: LineView; zoneAvg: number }) {
  const diff = v.oee - zoneAvg;
  const elapsed = v.horizon === "shift" ? v.runningMinutes / 480 : 1;
  const pace = Math.round(v.outputTarget * elapsed);
  const behind = v.outputActual < pace * 0.97;
  const statusTone =
    v.status === "down"
      ? "text-tier-bad"
      : v.status === "slow"
        ? "text-tier-warn"
        : v.status === "idle"
          ? "text-muted-foreground"
          : "text-tier-good";

  const cell = "flex min-w-0 flex-col gap-1 px-4 py-3";
  const label = "text-[10px] text-muted-foreground";
  const big = "text-[28px] font-bold leading-none tabular-nums tracking-tight";

  return (
    <section className="grid grid-cols-2 divide-border rounded-lg border border-border bg-surface sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
      <div className={cell}>
        <span className={label}>Line OEE</span>
        <span className="flex items-baseline gap-1">
          <span className={cn(big, TIER_TEXT[tierOf(v.oee)])}>{v.oee.toFixed(0)}</span>
          <span className="text-sm text-muted-foreground">%</span>
        </span>
        <span
          className={cn("text-[10px] font-medium", diff < 0 ? "text-tier-bad" : "text-tier-good")}
        >
          {diff < 0 ? "▼" : "▲"} {Math.abs(diff).toFixed(0)} pts vs {zoneAvg.toFixed(0)}% zone
        </span>
      </div>
      <div className={cell}>
        <span className={label}>Performance</span>
        <span className="flex items-baseline gap-1">
          <span className={big}>{v.performance.toFixed(0)}</span>
          <span className="text-sm text-muted-foreground">%</span>
        </span>
        <span className="text-[10px] text-muted-foreground">
          {v.ppm} of {v.stdPpm} ppm standard
        </span>
      </div>
      <div className={cell}>
        <span className={label}>Output</span>
        <span className="flex items-baseline gap-1.5">
          <span className={big}>{formatQty(v.outputActual)}</span>
          <span className="text-xs text-muted-foreground">/ {formatQty(v.outputTarget)} pcs</span>
        </span>
        <span
          className={cn("text-[10px] font-medium", behind ? "text-tier-bad" : "text-tier-good")}
        >
          {v.horizon === "shift"
            ? `${behind ? "▼ behind pace" : "▲ on pace"}, plan ${formatQty(pace)} so far`
            : `${behind ? "▼" : "▲"} ${Math.round((v.outputActual / Math.max(1, v.outputTarget)) * 100)}% of period plan`}
        </span>
      </div>
      <div className={cell}>
        <span className={label}>Running time</span>
        <span className="flex items-baseline gap-1.5">
          <span className={big}>{formatMinutes(v.runningMinutes).replace(" min", "m")}</span>
        </span>
        <span className="text-[10px] text-muted-foreground">
          {v.horizon === "shift" ? "this shift" : `of ${formatMinutes(v.plannedMinutes)} planned`}
        </span>
      </div>
      <div className={cell}>
        <span className={label}>Status now</span>
        <span className="flex items-baseline gap-1.5">
          <span className={cn(big, statusTone)}>{v.status.toUpperCase()}</span>
          {v.culprit && (
            <span className="text-xs font-semibold text-muted-foreground">{v.culprit.id}</span>
          )}
        </span>
        <span className="truncate text-[10px] text-muted-foreground">
          {v.culprit?.fault ?? "All machines nominal"}
        </span>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- line condition */

function LineCondition({ view: v }: { view: LineView }) {
  const l = v.line;
  const rows: [string, string][] = [
    ["Current SKU", l.sku],
    ["PO / Batch", `${l.po} · ${l.batch}`],
    [
      v.horizon === "shift" ? "Shift output" : "Output",
      `${v.outputActual.toLocaleString("en-US")} / ${v.outputTarget.toLocaleString("en-US")} pcs`,
    ],
    ["MPQ (target ppm)", `${l.mpqTarget} ppm`],
    ["Zone", `${v.zone.name.replace("Zone ", "")} · Shift 1`],
    ["Bottleneck", `${l.bottleneck} (${l.machines[0]?.type ?? "-"})`],
  ];
  return (
    <Panel title="Line Condition">
      <dl className="flex flex-col divide-y divide-border/70">
        {rows.map(([k, val]) => (
          <div key={k} className="py-1.5 first:pt-0">
            <dt className="text-[10px] text-muted-foreground">{k}</dt>
            <dd className="truncate text-[12px] font-semibold" title={val}>
              {val}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/* -------------------------------------------------------------- line chain */

function LineChain({ view: v }: { view: LineView }) {
  const connector =
    STATUS_HEX[
      v.status === "idle"
        ? "idle"
        : v.status === "running"
          ? "running"
          : v.status === "slow"
            ? "slow"
            : "down"
    ];
  return (
    <Panel title="Line" bodyClassName="p-3">
      <div className="relative flex h-full min-h-[180px] items-center justify-center overflow-x-auto rounded-md border border-dashed border-border bg-muted/40 px-6 pt-8 pb-4">
        <span className="absolute left-3 top-3">
          <LineStatusBadge status={v.status} oee={v.oee} />
        </span>
        <div className="flex items-start">
          {v.machines.map((m, i) => (
            <Fragment key={m.id}>
              {i > 0 && (
                <span
                  aria-hidden
                  className="mt-[56px] h-[3px] w-10 shrink-0 rounded-full sm:w-16 xl:w-24"
                  style={{ background: connector }}
                />
              )}
              <div className="flex shrink-0 flex-col items-center gap-1">
                <MachineIcon type={m.type} status={m.status} size={84} />
                <span className="text-[10px] font-semibold">{m.id}</span>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ alarms */

type AlarmItem = {
  id: string;
  machineId: string;
  issue: string;
  time: string;
  active: boolean;
  resolvedAt?: string;
  extra?: string;
};

function buildAlarms(v: LineView): AlarmItem[] {
  const seed = `${v.line.plantId}-${v.line.id}-${v.horizon}-alarms`;
  const issues = [
    "Nozzle jam",
    "Seal issue",
    "Sensor blocked",
    "Cap orientation fault",
    "Film splice",
    "Low air pressure",
  ];
  const list: AlarmItem[] = [];
  if (v.horizon === "shift") {
    const stop = v.line.machines.find((m) => m.currentStop)?.currentStop;
    const fmt = (x: number) =>
      `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
    // Resolved alarms must finish before the active stop began (or before "now").
    let windowEnd = NOW_MINUTES;
    if (v.culprit && stop) {
      windowEnd = NOW_MINUTES - stop.elapsedMinutes;
      list.push({
        id: "active",
        machineId: v.culprit.id,
        issue: stop.fault,
        time: clockMinusMinutes(stop.elapsedMinutes),
        active: true,
      });
    }
    const shiftStart = 7 * 60;
    const room = windowEnd - shiftStart - 4;
    const n = Math.max(0, Math.min(rand(seed + "n", 1, 3, 0), Math.floor(room / 14)));
    const slot = n ? room / n : 0;
    for (let i = 0; i < n; i++) {
      const m = v.machines[i % v.machines.length];
      const start = Math.round(shiftStart + 2 + i * slot + rand(`${seed}-${i}`, 0, slot * 0.3, 0));
      const end = Math.min(
        windowEnd - 1,
        start + rand(`${seed}-${i}-d`, 3, Math.max(4, slot * 0.6), 0),
      );
      list.push({
        id: `r${i}`,
        machineId: m?.id ?? "-",
        issue: pick(`${seed}-${i}-i`, issues),
        time: fmt(start),
        resolvedAt: fmt(end),
        active: false,
      });
    }
    return list.sort((a, b) =>
      a.active === b.active ? b.time.localeCompare(a.time) : a.active ? -1 : 1,
    );
  }
  // Longer horizons: most frequent stops per machine instead of live alarms.
  return v.machines
    .map((m, i) => ({
      id: `top${i}`,
      machineId: m.id,
      issue: m.fault ?? pick(`${seed}-${m.id}`, issues),
      time: `${m.stops}×`,
      active: m.status === "down",
      extra: formatMinutes(Math.round(m.stops * m.mttr * 0.5)),
    }))
    .sort((a, b) => parseInt(b.time) - parseInt(a.time));
}

function AlarmsPanel({ view: v }: { view: LineView }) {
  const alarms = useMemo(() => buildAlarms(v), [v]);
  const live = v.horizon === "shift";
  return (
    <Panel
      title={live ? "Active Alarms" : "Top Stops"}
      subtitle={live ? undefined : horizonMeta(v.horizon).label}
      action={
        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
          {alarms.length}
        </span>
      }
      bodyClassName="gap-2 p-3"
    >
      {alarms.length === 0 && (
        <p className="py-4 text-center text-[11px] text-muted-foreground">No alarms recorded.</p>
      )}
      {alarms.map((a) => (
        <div
          key={a.id}
          className={cn(
            "rounded-md border border-border border-l-[3px] bg-surface px-3 py-2",
            a.active ? "border-l-tier-bad" : "border-l-tier-warn",
          )}
        >
          <div className="flex items-center gap-2 text-[10px]">
            {live ? (
              a.active ? (
                <span className="rounded bg-tier-bad px-1.5 py-0.5 font-semibold text-white">
                  Issue
                </span>
              ) : (
                <span className="rounded bg-tier-warn px-1.5 py-0.5 font-semibold text-white">
                  Resolved {a.resolvedAt}
                </span>
              )
            ) : (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 font-semibold text-white",
                  a.active ? "bg-tier-bad" : "bg-tier-warn",
                )}
              >
                {a.time} stops
              </span>
            )}
            <span className="font-semibold text-muted-foreground">{a.machineId}</span>
            <span className="ml-auto tabular-nums text-muted-foreground">
              {live ? a.time : a.extra}
            </span>
          </div>
          <p className="mt-1 text-[12px] font-semibold">{a.issue}</p>
        </div>
      ))}
    </Panel>
  );
}

/* --------------------------------------------------------- machine section */

function MachineSection({ view: v }: { view: LineView }) {
  const [selectedId, setSelectedId] = useState(v.culprit?.id ?? v.machines[0]?.id);
  const selected = v.machines.find((m) => m.id === selectedId) ?? v.machines[0];
  if (!selected) return null;
  const down = selected.status === "down";

  return (
    <section aria-label="Machines" className="flex flex-col">
      <div
        role="tablist"
        aria-label="Machines on this line"
        className="flex items-stretch overflow-x-auto"
      >
        {v.machines.map((m, i) => {
          const isSel = m.id === selected.id;
          return (
            <Fragment key={m.id}>
              {i > 0 && (
                <span
                  aria-hidden
                  className="grid w-9 shrink-0 place-items-center text-muted-foreground"
                >
                  <ArrowRight className="size-4" />
                </span>
              )}
              <button
                type="button"
                role="tab"
                aria-selected={isSel}
                onClick={() => setSelectedId(m.id)}
                className={cn(
                  "relative flex min-w-[170px] flex-1 flex-col rounded-t-lg border px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSel
                    ? "z-10 -mb-px border-border border-b-surface bg-surface"
                    : "mb-2 rounded-b-lg border-border bg-surface hover:border-muted-foreground/40",
                  isSel && m.status === "down" && "border-l-[3px] border-l-tier-bad",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">{m.id}</span>
                  <span
                    className="size-2 rounded-full"
                    style={{ background: STATUS_HEX[m.status] }}
                  />
                </span>
                <span className="h-4 truncate text-[10px] font-medium text-tier-bad">
                  {m.status === "down" && m.fault && (
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle className="size-3" /> {m.fault}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "mt-1 self-center text-xl font-bold tabular-nums",
                    TIER_TEXT[tierOf(m.oee)],
                  )}
                >
                  {m.oee.toFixed(0)}%
                </span>
                <span className="self-center text-[9px] text-muted-foreground">OEE · {m.type}</span>
              </button>
            </Fragment>
          );
        })}
      </div>

      <div
        role="tabpanel"
        aria-label={`${selected.id} detail`}
        className={cn(
          "grid gap-4 rounded-b-lg rounded-tr-lg border border-border bg-surface p-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)_minmax(260px,0.95fr)]",
          down && "border-l-[3px] border-l-tier-bad",
        )}
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_112px]">
          <div className="min-h-[280px] rounded-md border border-dashed border-border bg-muted/40 p-2">
            <MachineIllustration type={selected.type} status={selected.status} />
          </div>
          <div className="flex gap-3 sm:flex-col">
            <StatBox label="MTTR" value={selected.mttr} unit="min" />
            <StatBox label="MTBF" value={selected.mtbf} unit="min" />
            <StatBox label="Stops" value={selected.stops} unit="" />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-5">
          <Donut value={selected.oee} size={170} label="Machine OEE" />
          <div className="flex w-full max-w-64 flex-col gap-3">
            <MetricBar label="Availability" value={selected.availability} />
            <MetricBar label="Performance" value={selected.performance} />
            <MetricBar label="Quality" value={selected.quality} />
          </div>
        </div>

        <MachineInfo machine={selected} horizon={v.horizon} />
      </div>
    </section>
  );
}

function StatBox({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-border px-3 py-3 text-center">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold leading-tight tabular-nums">
        {value.toLocaleString("en-US")}
        {unit && <span className="ml-1 text-xs font-semibold text-muted-foreground">{unit}</span>}
      </span>
    </div>
  );
}

function MachineInfo({ machine, horizon }: { machine: MachineView; horizon: HorizonId }) {
  const [open, setOpen] = useState(true);
  const groups = Array.from(new Set(SENSOR_SPEC.map((s) => s.group)));
  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>
          Machine Informations
          {horizon !== "shift" && (
            <span className="ml-2 font-normal text-muted-foreground">
              period average, counts are totals
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            !open && "-rotate-90",
          )}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
          {groups.map((g) => (
            <div key={g}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {g}
              </p>
              <dl className="flex flex-col">
                {machine.sensors
                  .filter((s) => s.group === g)
                  .map((s) => (
                    <div
                      key={s.key}
                      className="flex items-baseline justify-between gap-3 py-0.5 text-[11px]"
                    >
                      <dt className="text-muted-foreground">{s.label}</dt>
                      <dd className={cn("font-semibold tabular-nums", s.warn && "text-tier-bad")}>
                        {s.value.toLocaleString("en-US")}
                        {s.unit && (
                          <span className="ml-1 text-[9px] font-normal text-muted-foreground">
                            {s.unit}
                          </span>
                        )}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
