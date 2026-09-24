import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight, GitBranch } from "lucide-react";
import { Fragment, useMemo } from "react";

import {
  FilterSelect,
  HorizonSegmented,
  LineStatusBadge,
  LiveBadge,
  MiniBar,
} from "@/components/oee/floor-ui";
import { MachineIcon } from "@/components/oee/machine-art";
import { EmptyState, PageHeader, Panel } from "@/components/oee/ui";
import { useApp } from "@/lib/oee/app-context";
import { STATUS_HEX, TIER_HEX, TIER_TEXT, tierOf } from "@/lib/oee/config";
import { PLANTS, getPlant } from "@/lib/oee/data";
import {
  formatMinutes,
  formatQty,
  horizonMeta,
  issueLog,
  performanceIssues,
  zoneViews,
  type HorizonId,
  type LineView,
} from "@/lib/oee/horizon";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics/")({
  head: () => ({
    meta: [
      { title: "OEE Analytics — Factory Floor Map" },
      {
        name: "description",
        content:
          "OEE analytics for Section Head and Shift Leader: issue log, performance issues and a factory floor map per plant, zone and time horizon.",
      },
      { property: "og:title", content: "OEE Analytics — Factory Floor Map" },
      {
        property: "og:description",
        content:
          "Issue log, performance issues and factory floor map filtered by plant, zone and horizon.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const ROLE_LABEL = { "shift-leader": "Shift Leader", "section-head": "Section Head" } as const;

function AnalyticsPage() {
  const { role, floor, setFloor } = useApp();
  const navigate = useNavigate();
  const plant = getPlant(floor.plantId);
  const horizon = horizonMeta(floor.horizon);
  const zones = useMemo(
    () => zoneViews(floor.plantId, floor.zoneId, floor.horizon),
    [floor.plantId, floor.zoneId, floor.horizon],
  );
  const lines = useMemo(() => zones.flatMap((z) => z.lines), [zones]);
  const issues = useMemo(() => issueLog(lines, floor.horizon), [lines, floor.horizon]);
  const perf = useMemo(() => performanceIssues(lines), [lines]);

  const openLine = (l: LineView) =>
    navigate({
      to: "/analytics/line/$plantId/$zoneId/$lineId",
      params: { plantId: l.line.plantId, zoneId: l.line.zoneId, lineId: l.line.id },
      search: { h: floor.horizon },
    });

  const zoneLabel = floor.zoneId === "all" ? "All zones" : `Zone ${floor.zoneId}`;
  const title = `${ROLE_LABEL[role]} Dashboard: Kemas`;

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <PageHeader
        title={title}
        crumbs={[
          { label: "OEE Analytics" },
          { label: plant?.name ?? floor.plantId },
          { label: zoneLabel },
          { label: horizon.period },
        ]}
      >
        {floor.horizon === "shift" && <LiveBadge />}
        <div className="text-right leading-tight">
          <p className="text-xs font-semibold">Week 32</p>
          <p className="text-[10px] text-muted-foreground">05-Aug-2026, 08:03</p>
        </div>
        <Link
          to="/analytics/loss-tree"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          <GitBranch className="size-3.5" /> Loss analysis
        </Link>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/90 px-4 py-2 backdrop-blur">
        <FilterSelect
          label="Plant"
          value={floor.plantId}
          options={PLANTS.map((p) => ({ id: p.id, label: `${p.name} · ${p.block}` }))}
          onChange={(plantId) => setFloor({ plantId })}
        />
        <FilterSelect
          label="Zone"
          value={floor.zoneId}
          options={[
            { id: "all", label: "All zones" },
            ...(plant?.zones ?? []).map((z) => ({ id: z.id, label: z.name })),
          ]}
          onChange={(zoneId) => setFloor({ zoneId })}
        />
        <HorizonSegmented
          value={floor.horizon}
          onChange={(h: HorizonId) => setFloor({ horizon: h })}
        />
        <span className="ml-auto text-[11px] text-muted-foreground">
          {lines.length} lines, {lines.filter((l) => l.status === "down").length} down now
        </span>
      </div>

      {lines.length === 0 ? (
        <main className="flex-1 p-4">
          <EmptyState message="Tidak ada line untuk kombinasi Plant dan Zone ini. Pilih zona lain." />
        </main>
      ) : (
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
            <IssueLogPanel rows={issues} horizon={floor.horizon} onOpen={openLine} />
            <PerformancePanel rows={perf} onOpen={openLine} />
          </div>

          <section aria-labelledby="floor-map-title" className="flex flex-col gap-2">
            <div className="flex items-baseline gap-3">
              <h2 id="floor-map-title" className="text-base font-semibold tracking-tight">
                Factory Floor Map
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {zoneLabel}, all lines. Click a line to open its performance detail.
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {zones.map((z) => (
                <div
                  key={z.zone.id}
                  className="rounded-lg border border-border bg-surface px-4 pb-1 pt-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {z.zone.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Zone OEE{" "}
                      <span className={cn("font-semibold", TIER_TEXT[tierOf(z.oee)])}>
                        {z.oee.toFixed(0)}%
                      </span>
                      <span className="mx-2 opacity-40">|</span>
                      {z.lines.length} lines
                      <span className="mx-2 opacity-40">|</span>
                      <span className={z.down ? "font-semibold text-tier-bad" : ""}>
                        {z.down} down
                      </span>
                    </p>
                  </div>
                  <ul className="divide-y divide-dashed divide-border">
                    {z.lines.map((l) => (
                      <li key={l.line.id}>
                        <LineRow view={l} horizon={floor.horizon} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ issue log */

function IssueLogPanel({
  rows,
  horizon,
  onOpen,
}: {
  rows: ReturnType<typeof issueLog>;
  horizon: HorizonId;
  onOpen: (l: LineView) => void;
}) {
  const live = horizon === "shift";
  return (
    <Panel
      title={live ? "Live Issue Log" : "Issue Log"}
      subtitle={
        live
          ? "Machines stopped right now, longest first"
          : `Top downtime issues, ${horizonMeta(horizon).label.toLowerCase()}`
      }
      action={<CountBadge value={rows.length} tone="bad" />}
      bodyClassName="p-0"
    >
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-[11px] text-muted-foreground">
          No line is down in this scope.
        </p>
      ) : (
        <div className="max-h-64 overflow-auto">
          <table className="w-full min-w-[520px] text-left text-[11px]">
            <thead className="sticky top-0 bg-surface text-[10px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Line</th>
                <th className="px-2 py-2 font-medium">Machine</th>
                <th className="px-2 py-2 font-medium">Issue</th>
                <th className="px-2 py-2 font-medium">{live ? "Started" : "Stops"}</th>
                <th className="px-4 py-2 text-right font-medium">
                  {live ? "Elapsed" : "Downtime"}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => onOpen(r.line)}
                  className="cursor-pointer border-t border-border/60 hover:bg-muted/50"
                >
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(r.line);
                      }}
                      className="inline-flex items-center gap-2 font-semibold outline-none focus-visible:underline"
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          r.active ? "bg-tier-bad" : "bg-tier-warn",
                        )}
                      />
                      {r.line.line.id}
                    </button>
                  </td>
                  <td className="px-2 py-2">{r.machineId}</td>
                  <td className="px-2 py-2">{r.issue}</td>
                  <td className="px-2 py-2 tabular-nums text-muted-foreground">
                    {live ? r.started : `${r.occurrences}×`}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">
                    {formatMinutes(r.minutes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/* --------------------------------------------------- performance issues */

function PerformancePanel({
  rows,
  onOpen,
}: {
  rows: ReturnType<typeof performanceIssues>;
  onOpen: (l: LineView) => void;
}) {
  const shown = rows.slice(0, 5);
  return (
    <Panel
      title="Performance Issues"
      subtitle="Running lines below standard speed"
      action={<CountBadge value={rows.length} tone="warn" />}
    >
      {shown.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-muted-foreground">
          All running lines are at standard speed.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {shown.map(({ line: l, gap }) => (
            <li key={l.line.id}>
              <button
                type="button"
                onClick={() => onOpen(l)}
                className="grid w-full grid-cols-[64px_minmax(0,1fr)_92px_48px] items-center gap-3 rounded text-left text-[11px] outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="inline-flex items-center gap-2 font-semibold">
                  <span className="size-1.5 rounded-full bg-tier-warn" />
                  {l.line.id}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-grid">
                  <span
                    className="block h-full rounded-full bg-tier-warn"
                    style={{ width: `${Math.min(100, (l.ppm / l.stdPpm) * 100)}%` }}
                  />
                </span>
                <span className="text-right font-semibold tabular-nums">
                  {l.ppm} / {l.stdPpm} ppm
                </span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums",
                    gap <= -10
                      ? "bg-tier-bad/12 text-tier-bad"
                      : "bg-tier-warn/15 text-[color-mix(in_oklab,var(--tier-warn)_75%,var(--foreground))]",
                  )}
                >
                  {gap.toFixed(0)}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {rows.length > shown.length && (
        <p className="mt-3 text-[10px] text-muted-foreground">
          {rows.length - shown.length} more lines below standard. See them in the floor map below.
        </p>
      )}
    </Panel>
  );
}

function CountBadge({ value, tone }: { value: number; tone: "bad" | "warn" }) {
  return (
    <span
      className={cn(
        "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
        tone === "bad"
          ? "bg-tier-bad/12 text-tier-bad"
          : "bg-tier-warn/15 text-[color-mix(in_oklab,var(--tier-warn)_75%,var(--foreground))]",
      )}
    >
      {value}
    </span>
  );
}

/* ------------------------------------------------------------ line row */

function LineRow({ view: l, horizon }: { view: LineView; horizon: HorizonId }) {
  const tier = tierOf(l.oee);
  const connector = STATUS_HEX[l.status === "running" && tier !== "good" ? "slow" : l.status];
  return (
    <Link
      to="/analytics/line/$plantId/$zoneId/$lineId"
      params={{ plantId: l.line.plantId, zoneId: l.line.zoneId, lineId: l.line.id }}
      search={{ h: horizon }}
      aria-label={`Open ${l.line.id} line performance`}
      className="group grid w-full grid-cols-1 gap-4 rounded-md px-2 py-3.5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[176px_minmax(0,1fr)_20px]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight">{l.line.id}</span>
          <LineStatusBadge status={l.status} oee={l.oee} />
        </div>
        <p className="mt-1 text-[9px] text-muted-foreground">Line OEE</p>
        <p className={cn("text-2xl font-bold leading-none tabular-nums", TIER_TEXT[tier])}>
          {l.oee.toFixed(0)}%
        </p>
        <div className="mt-2 flex flex-col gap-1.5">
          <MiniBar
            label="OEE"
            value={l.oee}
            color={TIER_HEX[tier]}
            display={`${l.oee.toFixed(0)}%`}
          />
          <MiniBar
            label="PPM"
            value={l.ppm}
            max={l.stdPpm}
            color="var(--chart-output)"
            display={`${l.ppm}/${l.stdPpm}`}
          />
          <MiniBar
            label="Out"
            value={l.outputActual}
            max={l.outputTarget}
            color="var(--chart-oee)"
            display={`${formatQty(l.outputActual)}/${formatQty(l.outputTarget)}`}
          />
        </div>
      </div>

      <div className="flex min-w-0 items-start overflow-x-auto pb-1">
        {l.machines.map((m, i) => (
          <Fragment key={m.id}>
            {i > 0 && (
              <span
                aria-hidden
                className="mt-[34px] h-[3px] w-8 shrink-0 rounded-full sm:w-12"
                style={{ background: connector }}
              />
            )}
            <div className="flex w-[100px] shrink-0 flex-col items-center">
              <MachineIcon type={m.type} status={m.status} size={52} />
              <div className="mt-1 w-full rounded-md border border-border bg-surface px-1.5 py-1 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="text-[10px] font-bold">{m.id}</p>
                <p
                  className={cn(
                    "text-xs font-bold leading-tight tabular-nums",
                    TIER_TEXT[tierOf(m.oee)],
                  )}
                >
                  {m.oee.toFixed(0)}%
                </p>
                <p className="text-[8.5px] leading-tight text-muted-foreground tabular-nums">
                  PPM {m.ppm}/{m.stdPpm}
                </p>
                <p className="text-[8.5px] leading-tight text-muted-foreground tabular-nums">
                  Out {formatQty(m.outputActual)}/{formatQty(m.outputTarget)}
                </p>
              </div>
              {m.status === "down" && m.fault && (
                <p
                  className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[9px] font-medium text-tier-bad"
                  title={m.fault}
                >
                  <AlertTriangle className="size-2.5 shrink-0" />
                  <span className="truncate">{m.fault}</span>
                </p>
              )}
            </div>
          </Fragment>
        ))}
      </div>

      <ChevronRight className="hidden size-4 self-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:block" />
    </Link>
  );
}
