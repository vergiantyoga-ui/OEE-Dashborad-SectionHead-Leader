import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_LABEL, tierOf, type Status } from "@/lib/oee/config";
import { HORIZONS, type HorizonId } from "@/lib/oee/horizon";
import { cn } from "@/lib/utils";

/**
 * Line status badge as drawn in the floor-map mockup: Down is always red;
 * a running line takes its OEE tier colour so weak-but-running lines stand out.
 */
export function LineStatusBadge({ status, oee }: { status: Status; oee: number }) {
  const tone =
    status === "down"
      ? "bad"
      : status === "idle"
        ? "idle"
        : status === "slow" || tierOf(oee) !== "good"
          ? "warn"
          : "good";
  const cls = {
    bad: "bg-tier-bad/12 text-tier-bad",
    warn: "bg-tier-warn/15 text-[color-mix(in_oklab,var(--tier-warn)_75%,var(--foreground))]",
    good: "bg-tier-good/12 text-tier-good",
    idle: "bg-muted text-muted-foreground",
  }[tone];
  const dot = {
    bad: "bg-tier-bad",
    warn: "bg-tier-warn",
    good: "bg-tier-good",
    idle: "bg-status-idle",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        cls,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-tier-good/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-tier-good">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-tier-good opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-1.5 rounded-full bg-tier-good" />
      </span>
      Live
    </span>
  );
}

/** Dropdown used next to the line title (mockup: "● LIVE ▾"). */
export function HorizonMenu({
  value,
  onChange,
}: {
  value: HorizonId;
  onChange: (h: HorizonId) => void;
}) {
  const current = HORIZONS.find((h) => h.id === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 min-w-32 items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 text-xs font-semibold shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="inline-flex items-center gap-1.5">
            {value === "shift" && <span className="size-1.5 rounded-full bg-tier-good" />}
            {value === "shift" ? "LIVE" : current?.label}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {HORIZONS.map((h) => (
          <DropdownMenuItem
            key={h.id}
            onSelect={() => onChange(h.id)}
            className="flex items-center justify-between text-xs"
          >
            <span>{h.id === "shift" ? "Live · Current Shift" : h.label}</span>
            {h.id === value && <Check className="size-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Segmented control for the analytics filter bar. */
export function HorizonSegmented({
  value,
  onChange,
}: {
  value: HorizonId;
  onChange: (h: HorizonId) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Time horizon"
      className="inline-flex max-w-full overflow-x-auto rounded-md border border-border bg-muted p-0.5"
    >
      {HORIZONS.map((h) => (
        <button
          key={h.id}
          type="button"
          role="radio"
          aria-checked={value === h.id}
          onClick={() => onChange(h.id)}
          className={cn(
            "shrink-0 whitespace-nowrap rounded px-3 py-1 text-[11px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === h.id
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {h.label}
        </button>
      ))}
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface pl-2.5 pr-1 text-[11px] focus-within:ring-2 focus-within:ring-ring">
      <span className="text-muted-foreground">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full cursor-pointer bg-transparent pr-1 font-semibold outline-none"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MiniBar({
  value,
  max = 100,
  color,
  label,
  display,
}: {
  value: number;
  max?: number;
  color: string;
  label: string;
  display: ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3">
      <div className="min-w-0">
        <span className="block text-[9px] leading-tight text-muted-foreground">{label}</span>
        <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-grid">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <span className="text-[10px] font-semibold tabular-nums">{display}</span>
    </div>
  );
}
