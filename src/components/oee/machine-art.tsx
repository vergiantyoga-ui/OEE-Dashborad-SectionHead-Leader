/**
 * Grey isometric machine art used by the OEE Analytics floor map (small icon)
 * and the Line Performance machine panel (large illustration). Pure SVG, the
 * only colour comes from the status beacon so status stays the loudest signal.
 */
import { STATUS_HEX, type Status } from "@/lib/oee/config";

/** Round SVG coordinates so server and client render identical attributes. */
const r2 = (n: number) => Math.round(n * 100) / 100;

const FACE = {
  top: "var(--machine-top)",
  left: "var(--machine-left)",
  right: "var(--machine-right)",
  line: "var(--machine-line)",
};

type Glyph = "gauge" | "slot" | "cross" | "dial";

function glyphForType(type: string): Glyph {
  if (type === "Tube Filler") return "gauge";
  if (type === "Wrapper") return "slot";
  if (type === "Cartoner" || type === "Case Packer") return "cross";
  return "dial";
}

/** Small cabinet icon, ~44×52, with a status dot in the top-right corner. */
export function MachineIcon({
  type,
  status,
  size = 44,
}: {
  type: string;
  status: Status;
  size?: number;
}) {
  const glyph = glyphForType(type);
  return (
    <svg width={size} height={size * (52 / 44)} viewBox="0 0 44 52" aria-hidden="true">
      <polygon points="6,14 20,8 38,16 24,22" fill={FACE.top} />
      <polygon points="6,14 24,22 24,50 6,42" fill={FACE.left} />
      <polygon points="24,22 38,16 38,44 24,50" fill={FACE.right} />
      {/* glyph drawn in the skewed coordinate space of the front-left face */}
      <g transform="matrix(1 0.444 0 1 6 14)" stroke={FACE.line} fill="none" strokeWidth={1.1}>
        {glyph === "gauge" && (
          <>
            <circle cx={9} cy={13} r={5.2} fill="var(--machine-top)" />
            <circle cx={9} cy={13} r={1.6} />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <line
                key={a}
                x1={r2(9 + Math.cos((a * Math.PI) / 180) * 2.4)}
                y1={r2(13 + Math.sin((a * Math.PI) / 180) * 2.4)}
                x2={r2(9 + Math.cos((a * Math.PI) / 180) * 4.4)}
                y2={r2(13 + Math.sin((a * Math.PI) / 180) * 4.4)}
              />
            ))}
          </>
        )}
        {glyph === "slot" && (
          <rect x={2.5} y={11} width={13} height={3} fill="var(--machine-top)" />
        )}
        {glyph === "cross" && (
          <>
            <line x1={1.5} y1={2} x2={16.5} y2={26} />
            <line x1={16.5} y1={2} x2={1.5} y2={26} />
          </>
        )}
      </g>
      {glyph === "dial" && (
        <g transform="matrix(1 -0.43 0 1 24 22)" stroke={FACE.line} fill="none" strokeWidth={1.1}>
          <circle cx={7} cy={14} r={4.6} fill="var(--machine-top)" />
          <circle cx={7} cy={14} r={1.5} />
        </g>
      )}
      <circle
        cx={36}
        cy={11}
        r={4.2}
        fill={STATUS_HEX[status]}
        stroke="var(--surface)"
        strokeWidth={1.4}
      />
    </svg>
  );
}

/* ------------------------------------------------------ large illustration */

const S = 46;
type P = { x: number; y: number };
const pt = (x: number, y: number, z: number): P => ({
  x: (x - y) * S * 0.866,
  y: (x + y) * S * 0.5 - z * S,
});
const poly = (ps: P[]) => ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

function Box({
  x,
  y,
  z,
  w,
  d,
  h,
  tone = 0,
}: {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  /** 0 = regular grey, 1 = darker structural grey, 2 = light panel */
  tone?: 0 | 1 | 2;
}) {
  const fills =
    tone === 1
      ? ["var(--machine-frame-top)", "var(--machine-frame-left)", "var(--machine-frame-right)"]
      : tone === 2
        ? ["var(--machine-panel)", "var(--machine-top)", "var(--machine-left)"]
        : [FACE.top, FACE.left, FACE.right];
  return (
    <g>
      <polygon
        points={poly([
          pt(x, y, z + h),
          pt(x + w, y, z + h),
          pt(x + w, y + d, z + h),
          pt(x, y + d, z + h),
        ])}
        fill={fills[0]}
      />
      <polygon
        points={poly([
          pt(x, y + d, z + h),
          pt(x + w, y + d, z + h),
          pt(x + w, y + d, z),
          pt(x, y + d, z),
        ])}
        fill={fills[1]}
      />
      <polygon
        points={poly([
          pt(x + w, y, z + h),
          pt(x + w, y + d, z + h),
          pt(x + w, y + d, z),
          pt(x + w, y, z),
        ])}
        fill={fills[2]}
      />
    </g>
  );
}

function Cylinder({
  x,
  y,
  z,
  r,
  h,
  top,
  side,
}: {
  x: number;
  y: number;
  z: number;
  r: number;
  h: number;
  top: string;
  side: string;
}) {
  const c0 = pt(x, y, z);
  const c1 = pt(x, y, z + h);
  const rx = r2(r * S * 1.2247);
  const ry = r2(r * S * 0.7071);
  return (
    <g>
      <path
        d={`M ${c0.x - rx} ${c0.y} A ${rx} ${ry} 0 0 0 ${c0.x + rx} ${c0.y} L ${c1.x + rx} ${c1.y} A ${rx} ${ry} 0 0 1 ${c1.x - rx} ${c1.y} Z`}
        fill={side}
      />
      <ellipse cx={c1.x} cy={c1.y} rx={rx} ry={ry} fill={top} />
    </g>
  );
}

/** Face-aligned rectangle on the +y (front-left) face at depth y. */
function FrontPanel({
  x0,
  x1,
  y,
  z0,
  z1,
  fill,
}: {
  x0: number;
  x1: number;
  y: number;
  z0: number;
  z1: number;
  fill: string;
}) {
  return (
    <polygon
      points={poly([pt(x0, y, z1), pt(x1, y, z1), pt(x1, y, z0), pt(x0, y, z0)])}
      fill={fill}
    />
  );
}

export function MachineIllustration({ type, status }: { type: string; status: Status }) {
  const glyph = glyphForType(type);
  const items = glyph === "gauge" || glyph === "dial" ? "tube" : "carton";
  const cab = { w: 2.4, d: 1.7, h: 1.35 };
  const frameTop = 3.1;
  const post = 0.13;
  const posts: [number, number][] = [
    [0.15, 0.15],
    [cab.w - 0.28, 0.15],
    [0.15, cab.d - 0.28],
    [cab.w - 0.28, cab.d - 0.28],
  ];
  const conveyor = { x: -2.2, y: cab.d + 0.05, len: 3.2, d: 0.55 };

  return (
    <svg
      viewBox="-230 -150 440 330"
      className="h-full w-full"
      role="img"
      aria-label={`${type} illustration`}
    >
      {/* floor shadow */}
      <polygon
        points={poly([
          pt(-0.2, -0.2, 0),
          pt(cab.w + 0.3, -0.2, 0),
          pt(cab.w + 0.3, cab.d + 0.9, 0),
          pt(-0.2, cab.d + 0.9, 0),
        ])}
        fill="var(--grid)"
        opacity={0.55}
      />

      {/* back posts */}
      {posts.slice(0, 2).map(([px, py]) => (
        <Box
          key={`${px}-${py}`}
          x={px}
          y={py}
          z={cab.h}
          w={post}
          d={post}
          h={frameTop - cab.h}
          tone={1}
        />
      ))}

      {/* cabinet */}
      <Box x={0} y={0} z={0} w={cab.w} d={cab.d} h={cab.h} />
      <FrontPanel x0={0.25} x1={1.15} y={cab.d} z0={0.12} z1={1.1} fill="var(--machine-dark)" />
      {/* vents on the +x face */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = pt(cab.w, 0.55, 0.95 - i * 0.09);
        const b = pt(cab.w, 1.35, 0.95 - i * 0.09);
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--machine-dark)"
            strokeWidth={2.2}
          />
        );
      })}

      {/* process element on the deck */}
      {glyph === "gauge" && (
        <Cylinder
          x={1.2}
          y={0.85}
          z={cab.h}
          r={0.55}
          h={1.05}
          top="var(--machine-panel)"
          side="var(--machine-left)"
        />
      )}
      {glyph === "slot" && (
        <>
          <Cylinder
            x={1.2}
            y={0.85}
            z={cab.h}
            r={0.62}
            h={0.32}
            top="var(--machine-panel)"
            side="var(--machine-left)"
          />
          <Cylinder
            x={1.2}
            y={0.85}
            z={cab.h + 0.32}
            r={0.16}
            h={0.12}
            top="var(--machine-dark)"
            side="var(--machine-dark)"
          />
        </>
      )}
      {(glyph === "cross" || glyph === "dial") && (
        <Box x={0.65} y={0.45} z={cab.h} w={1.1} d={0.8} h={0.9} tone={2} />
      )}

      {/* front posts and top frame */}
      {posts.slice(2).map(([px, py]) => (
        <Box
          key={`${px}-${py}`}
          x={px}
          y={py}
          z={cab.h}
          w={post}
          d={post}
          h={frameTop - cab.h}
          tone={1}
        />
      ))}
      <Box x={0.15} y={0.15} z={frameTop} w={cab.w - 0.3} d={post} h={post} tone={1} />
      <Box x={0.15} y={0.15} z={frameTop} w={post} d={cab.d - 0.3} h={post} tone={1} />
      <Box x={cab.w - 0.28} y={0.15} z={frameTop} w={post} d={cab.d - 0.3} h={post} tone={1} />
      <Box x={0.15} y={cab.d - 0.28} z={frameTop} w={cab.w - 0.3} d={post} h={post} tone={1} />

      {/* status beacon */}
      <Cylinder
        x={cab.w - 0.22}
        y={cab.d - 0.22}
        z={frameTop + post}
        r={0.06}
        h={0.22}
        top="var(--machine-dark)"
        side="var(--machine-dark)"
      />
      <Cylinder
        x={cab.w - 0.22}
        y={cab.d - 0.22}
        z={frameTop + post + 0.22}
        r={0.2}
        h={0.32}
        top={STATUS_HEX[status]}
        side={STATUS_HEX[status]}
      />

      {/* infeed conveyor with product */}
      <Box
        x={conveyor.x}
        y={conveyor.y}
        z={cab.h - 0.1}
        w={conveyor.len}
        d={conveyor.d}
        h={0.08}
        tone={1}
      />
      <Box
        x={conveyor.x}
        y={conveyor.y + conveyor.d - 0.06}
        z={cab.h - 0.02}
        w={conveyor.len}
        d={0.06}
        h={0.12}
        tone={1}
      />
      {Array.from({ length: 4 }, (_, i) => {
        const cx = conveyor.x + 0.4 + i * 0.62;
        const cy = conveyor.y + conveyor.d / 2 - 0.03;
        return items === "tube" ? (
          <g key={i}>
            <Cylinder
              x={cx}
              y={cy}
              z={cab.h - 0.02}
              r={0.15}
              h={0.24}
              top="var(--machine-panel)"
              side="var(--surface)"
            />
            <Cylinder
              x={cx}
              y={cy}
              z={cab.h + 0.22}
              r={0.15}
              h={0.08}
              top="var(--machine-cap)"
              side="var(--machine-cap)"
            />
          </g>
        ) : (
          <Box
            key={i}
            x={cx - 0.18}
            y={cy - 0.16}
            z={cab.h - 0.02}
            w={0.36}
            d={0.32}
            h={0.28}
            tone={2}
          />
        );
      })}
    </svg>
  );
}
