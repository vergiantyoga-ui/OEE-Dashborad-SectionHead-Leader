/**
 * Time-horizon layer for the OEE Analytics floor map and the Line Performance
 * page. The base mock data (data.ts) represents the *current shift*; longer
 * horizons are derived deterministically from it so SSR and hydration match and
 * every line keeps a believable, distinct profile per horizon.
 */

import { OEE_TIERS, type Status } from "./config";
import { getPlant, type Line, type Machine, type Plant, type Zone } from "./data";
import { pick, rand } from "./rng";

export type HorizonId = "shift" | "week" | "month" | "year";

export const HORIZONS: { id: HorizonId; label: string; period: string }[] = [
  { id: "shift", label: "Current Shift", period: "Shift 1 (07:00–15:00)" },
  { id: "week", label: "This Week", period: "Week 32 (03–09 Aug 2026)" },
  { id: "month", label: "This Month", period: "August 2026" },
  { id: "year", label: "This Year", period: "Year 2026" },
];

export function isHorizon(v: unknown): v is HorizonId {
  return v === "shift" || v === "week" || v === "month" || v === "year";
}

export function horizonMeta(h: HorizonId) {
  return HORIZONS.find((x) => x.id === h) ?? HORIZONS[0]!;
}

/** Number of 8h shifts planned inside each horizon (prototype assumption). */
const PLANNED_SHIFTS: Record<HorizonId, number> = { shift: 1, week: 15, month: 66, year: 780 };
/** How strongly a horizon regresses toward the plant mean (longer = smoother). */
const SMOOTHING: Record<HorizonId, number> = { shift: 0, week: 0.45, month: 0.6, year: 0.7 };
const PLANT_MEAN = { availability: 86, performance: 84, quality: 96.5 };

const round1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function blend(seed: string, h: HorizonId, base: number, mean: number, lo: number, hi: number) {
  if (h === "shift") return base;
  const w = SMOOTHING[h];
  return round1(clamp(base * (1 - w) + mean * w + rand(`${seed}-${h}`, -3, 3, 1), lo, hi));
}

const oeeOf = (a: number, p: number, q: number) => round1((a * p * q) / 10000);

export type SensorView = Machine["sensors"][number];

export type MachineView = {
  id: string;
  type: string;
  status: Status;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  ppm: number;
  stdPpm: number;
  outputActual: number;
  outputTarget: number;
  mttr: number;
  mtbf: number;
  stops: number;
  rejects: number;
  fault?: string | undefined;
  sensors: SensorView[];
};

export type LineView = {
  line: Line;
  zone: Zone;
  plant: Plant;
  horizon: HorizonId;
  status: Status;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  ppm: number;
  stdPpm: number;
  outputActual: number;
  outputTarget: number;
  runningMinutes: number;
  plannedMinutes: number;
  culprit?: MachineView | undefined;
  machines: MachineView[];
};

function machineView(
  line: Line,
  m: Machine,
  lineView: { ppm: number; stdPpm: number; outputActual: number; outputTarget: number },
  h: HorizonId,
): MachineView {
  const seed = `${line.plantId}-${line.id}-${m.id}`;
  const availability = blend(seed + "a", h, m.availability, PLANT_MEAN.availability, 40, 99);
  const performance = blend(seed + "p", h, m.performance, PLANT_MEAN.performance, 45, 99);
  const quality = blend(seed + "q", h, m.quality, PLANT_MEAN.quality, 88, 99.8);
  const scale = PLANNED_SHIFTS[h];
  // First machine is the pace-setter; downstream machines run slightly faster.
  const idx = line.machines.indexOf(m);
  const ppm =
    idx === 0
      ? lineView.ppm
      : Math.min(lineView.stdPpm, Math.round(lineView.ppm * rand(seed + "ppm", 1, 1.08, 3)));
  const rejectCount = m.sensors.find((s) => s.key === "rejectCount")?.value ?? 40;
  return {
    id: m.id,
    type: m.type,
    status: m.status,
    availability,
    performance,
    quality,
    oee: oeeOf(availability, performance, quality),
    ppm,
    stdPpm: lineView.stdPpm,
    outputActual: lineView.outputActual,
    outputTarget: lineView.outputTarget,
    mttr: h === "shift" ? m.mttr : rand(seed + h + "mttr", 14, 52, 0),
    mtbf: h === "shift" ? m.mtbf : rand(seed + h + "mtbf", 220, 1600, 0),
    stops:
      h === "shift"
        ? m.stopsThisShift
        : Math.round(Math.max(1, m.stopsThisShift) * scale * rand(seed + h + "st", 0.12, 0.28, 2)),
    rejects:
      h === "shift"
        ? rejectCount
        : Math.round(rejectCount * scale * rand(seed + h + "rj", 0.6, 1.1, 2)),
    fault: m.currentStop?.fault,
    sensors:
      h === "shift"
        ? m.sensors
        : m.sensors.map((s) => ({
            ...s,
            value:
              s.key === "cycleCount" || s.key === "rejectCount"
                ? Math.round(s.value * scale * 0.6)
                : s.value,
          })),
  };
}

export function lineView(line: Line, zone: Zone, plant: Plant, h: HorizonId): LineView {
  const seed = `${plant.id}-${line.id}-view`;
  const availability = blend(seed + "a", h, line.availability, PLANT_MEAN.availability, 40, 99);
  const performance = blend(seed + "p", h, line.performance, PLANT_MEAN.performance, 45, 99);
  const quality = blend(seed + "q", h, line.quality, PLANT_MEAN.quality, 88, 99.8);
  const oee = oeeOf(availability, performance, quality);
  const shifts = PLANNED_SHIFTS[h];
  const stdPpm = line.stdSpeed;
  const ppm = h === "shift" ? line.speed : Math.round(stdPpm * (performance / 100));
  const outputTarget = line.outputTarget * shifts;
  const outputActual =
    h === "shift"
      ? line.outputActual
      : Math.round(
          outputTarget * clamp((oee / 100) * rand(seed + h + "out", 1.05, 1.22, 3), 0.3, 1.02),
        );
  const plannedMinutes = 480 * shifts;
  const runningMinutes =
    h === "shift" ? line.runningMinutes : Math.round(plannedMinutes * (availability / 100));

  const partial = { ppm, stdPpm, outputActual, outputTarget };
  const machines = line.machines.map((m) => machineView(line, m, partial, h));
  return {
    line,
    zone,
    plant,
    horizon: h,
    status: line.status,
    availability,
    performance,
    quality,
    oee,
    ppm,
    stdPpm,
    outputActual,
    outputTarget,
    runningMinutes,
    plannedMinutes,
    culprit: machines.find((m) => m.status === "down"),
    machines,
  };
}

export function zoneViews(plantId: string, zoneId: string | "all", h: HorizonId) {
  const plant = getPlant(plantId);
  if (!plant) return [];
  return plant.zones
    .filter((z) => zoneId === "all" || z.id === zoneId)
    .map((zone) => {
      const lines = zone.lines.map((l) => lineView(l, zone, plant, h));
      const avg = (k: "oee" | "availability" | "performance" | "quality") =>
        lines.length ? round1(lines.reduce((a, l) => a + l[k], 0) / lines.length) : 0;
      return {
        zone,
        lines,
        oee: avg("oee"),
        availability: avg("availability"),
        performance: avg("performance"),
        quality: avg("quality"),
        down: lines.filter((l) => l.status === "down").length,
      };
    });
}

/* ------------------------------------------------------------- issue log */

export type IssueRow = {
  id: string;
  line: LineView;
  machineId: string;
  issue: string;
  /** Current shift: start clock time. Longer horizons: occurrence count. */
  started?: string | undefined;
  occurrences?: number | undefined;
  minutes: number;
  active: boolean;
};

const EXTRA_ISSUES = [
  "Nozzle jam",
  "Seal issue",
  "Sensor fault",
  "Film splice sensor fault",
  "Conveyor jam at infeed",
  "Cap orientation fault",
  "Servo overload trip",
  "Vacuum pressure low",
];

export function issueLog(lines: LineView[], h: HorizonId): IssueRow[] {
  if (h === "shift") {
    return lines
      .filter((l) => l.status === "down")
      .map((l) => {
        const m = l.line.machines.find((x) => x.status === "down") ?? l.line.machines[0];
        return {
          id: `${l.line.plantId}-${l.line.zoneId}-${l.line.id}-live`,
          line: l,
          machineId: m?.id ?? "-",
          issue: m?.currentStop?.fault ?? l.line.fault ?? "Unplanned stop",
          // Start time is derived from elapsed so it always agrees with the header clock.
          started: clockMinusMinutes(m?.currentStop?.elapsedMinutes ?? 0),
          minutes: m?.currentStop?.elapsedMinutes ?? 0,
          active: true,
        };
      })
      .sort((a, b) => b.minutes - a.minutes);
  }
  const shifts = PLANNED_SHIFTS[h];
  return lines
    .map((l): IssueRow => {
      const seed = `${l.line.plantId}-${l.line.zoneId}-${l.line.id}-${h}-iss`;
      // Lines with weaker availability accumulate more downtime over the horizon.
      const weight = clamp((100 - l.availability) / 12, 0.4, 3);
      const m = l.line.machines[Math.floor(rand(seed + "m", 0, l.line.machines.length - 0.01, 2))];
      return {
        id: seed,
        line: l,
        machineId: m?.id ?? "-",
        issue: pick(seed + "i", EXTRA_ISSUES),
        occurrences: Math.max(1, Math.round(shifts * 0.4 * weight * rand(seed + "o", 0.6, 1.4, 2))),
        minutes: Math.round(shifts * 9 * weight * rand(seed + "d", 0.6, 1.5, 2)),
        active: l.status === "down",
      };
    })
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 8);
}

/* ---------------------------------------------------- performance issues */

export function performanceIssues(lines: LineView[]) {
  return lines
    .filter((l) => l.status !== "down" && l.status !== "idle")
    .map((l) => ({ line: l, gap: round1(((l.ppm - l.stdPpm) / l.stdPpm) * 100) }))
    .filter((r) => r.gap <= -5)
    .sort((a, b) => a.gap - b.gap);
}

/* ---------------------------------------------------------------- trends */

export type TrendPoint = {
  label: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  speed: number;
  actual: number | null;
  plan: number;
  poChange?: boolean;
};

function bucketLabels(h: HorizonId): string[] {
  if (h === "shift") {
    return Array.from({ length: 24 }, (_, i) => {
      const m = 7 * 60 + i * 20;
      return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    });
  }
  if (h === "week") return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  if (h === "month") return Array.from({ length: 31 }, (_, i) => `${i + 1} Aug`);
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
}

export function lineTrend(v: LineView): TrendPoint[] {
  const labels = bucketLabels(v.horizon);
  const n = labels.length;
  const seed = `${v.line.plantId}-${v.line.id}-${v.horizon}-trend`;
  // Shift view resets cumulative output when the PO/batch changes (~11:00).
  const poIndex = v.horizon === "shift" ? 12 : -1;
  const attainment = clamp((v.outputActual / Math.max(1, v.outputTarget)) * 100, 20, 104);
  const stopIndex = v.status === "down" ? Math.round(n * 0.4) : -1;

  return labels.map((label, i) => {
    const wave = Math.sin(i / 2.2) * 2.5;
    const dip = i === stopIndex || i === stopIndex + 1 ? -rand(`${seed}-dip-${i}`, 10, 18, 1) : 0;
    const availability = round1(
      clamp(v.availability + wave + dip + rand(`${seed}-a-${i}`, -3, 3, 1), 30, 99.5),
    );
    const performance = round1(
      clamp(v.performance - wave * 0.6 + rand(`${seed}-p-${i}`, -3, 3, 1), 40, 99.5),
    );
    const quality = round1(clamp(v.quality + rand(`${seed}-q-${i}`, -1.5, 1.2, 1), 85, 99.9));
    const speed = Math.round(
      clamp(v.stdPpm * (performance / 100) + rand(`${seed}-s-${i}`, -4, 4, 0), 0, v.stdPpm * 1.05),
    );

    let actual: number;
    let plan: number;
    if (poIndex > 0) {
      const inSegment = i < poIndex ? i + 1 : i - poIndex + 1;
      const segLen = i < poIndex ? poIndex : n - poIndex;
      plan = Math.round((inSegment / segLen) * 100);
      actual = round1(plan * (attainment / 100) * rand(`${seed}-o-${i}`, 0.94, 1.04, 3));
    } else {
      plan = Math.round(((i + 1) / n) * 100);
      actual = round1(plan * (attainment / 100) * rand(`${seed}-o-${i}`, 0.96, 1.03, 3));
    }
    return {
      label,
      availability,
      performance,
      quality,
      oee: oeeOf(availability, performance, quality),
      speed,
      actual: clamp(actual, 0, 110),
      plan,
      poChange: i === poIndex,
    };
  });
}

export const TARGET_OEE = OEE_TIERS.good;

/** Prototype "now" shown in every header (Week 32, 05-Aug-2026 08:03). */
export const NOW_MINUTES = 8 * 60 + 3;

export function clockMinusMinutes(minutes: number): string {
  const t = (((NOW_MINUTES - minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export function formatQty(n: number): string {
  if (n >= 1_000_000) return `${round1(n / 1_000_000)}M`;
  if (n >= 1_000) return `${round1(n / 1000)}k`;
  return n.toLocaleString("en-US");
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  if (min >= 6000) return `${Math.round(min / 60).toLocaleString("en-US")}h`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
