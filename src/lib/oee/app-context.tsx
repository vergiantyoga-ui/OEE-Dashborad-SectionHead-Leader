import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Context,
  type ReactNode,
} from "react";

import { DEFAULT_PLANT_ID, DEFAULT_ZONE_ID } from "./data";
import { snapResolution, type ResolutionId, type SpanId } from "./filters";
import type { HorizonId } from "./horizon";

export type Role = "shift-leader" | "section-head";

export type Filters = {
  span: SpanId;
  resolution: ResolutionId;
  /** Section Head only (single select) */
  plantId: string;
  zoneIds: string[];
  lineIds: string[];
  sku: string | "all";
};

/** OEE Analytics floor-map filters (Plant, Zone, time horizon). */
export type FloorFilters = {
  plantId: string;
  zoneId: string | "all";
  horizon: HorizonId;
};

type Ctx = {
  role: Role;
  setRole: (r: Role) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  filters: Filters;
  /** Applies the cascading rules from §5 automatically. */
  setFilters: (patch: Partial<Filters>) => void;
  floor: FloorFilters;
  /** Changing plant resets zone to the plant's first zone. */
  setFloor: (patch: Partial<FloorFilters>) => void;
};

// Keep a single context instance across hot-module reloads. Without this, a
// reloaded copy of this module creates a new context and consumers rendered by
// the still-mounted provider read `null` and crash.
const globalStore = globalThis as unknown as { __oeeAppContext?: Context<Ctx | null> };
const AppContext = (globalStore.__oeeAppContext ??= createContext<Ctx | null>(null));

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("shift-leader");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [filters, setFiltersState] = useState<Filters>({
    span: "this-week",
    resolution: "1d",
    plantId: DEFAULT_PLANT_ID,
    zoneIds: ["A"],
    lineIds: [],
    sku: "all",
  });

  const [floor, setFloorState] = useState<FloorFilters>({
    plantId: DEFAULT_PLANT_ID,
    zoneId: DEFAULT_ZONE_ID,
    horizon: "shift",
  });

  const setFloor = useCallback((patch: Partial<FloorFilters>) => {
    setFloorState((prev) => {
      const next = { ...prev, ...patch };
      if (patch.plantId && patch.plantId !== prev.plantId && !patch.zoneId)
        next.zoneId = DEFAULT_ZONE_ID;
      return next;
    });
  }, []);

  const setFilters = useCallback((patch: Partial<Filters>) => {
    setFiltersState((prev) => {
      const next: Filters = { ...prev, ...patch };
      // Plant resets Zone & Line, but never Span/Resolution/SKU.
      if (patch.plantId && patch.plantId !== prev.plantId) {
        next.zoneIds = [];
        next.lineIds = [];
      }
      // Zone limits the available Lines -> drop lines that no longer apply.
      if (patch.zoneIds && patch.zoneIds !== prev.zoneIds) {
        next.lineIds = [];
      }
      // Span change may invalidate resolution -> auto snap to nearest coarser.
      next.resolution = snapResolution(next.span, next.resolution);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const value = useMemo(
    () => ({
      role,
      setRole,
      isCollapsed,
      setIsCollapsed,
      isDarkMode,
      setIsDarkMode,
      filters,
      setFilters,
      floor,
      setFloor,
    }),
    [role, isCollapsed, isDarkMode, filters, setFilters, floor, setFloor],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
