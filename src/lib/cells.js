/* Geometry helpers: turn "a 4 × 3 × 2 block" into the lists CubeWorld draws. */

export const GAP = 0.06; // small gap so individual cubes stay visible
export const STEP = 1 + GAP; // centre-to-centre spacing of unit cubes
export const CUBE = 1 - GAP * 0.72; // drawn edge length of one cube
export const TILE_H = 0.08; // thickness of a flat area tile

export const COLORS = {
  base: "#4f80ff",
  baseAlt: "#7aa0ff",
  baseDark: "#3557c9",
  layer: "#f59e0b",
  good: "#22c55e",
  pink: "#ec4899",
  violet: "#a855f7",
  teal: "#14b8a6",
  red: "#ef4444",
  yellow: "#eab308",
  crate: "#9fb3ff",
  ghost: "#5d6eb4",
};

export const COPY_COLORS = [
  COLORS.base,
  COLORS.layer,
  COLORS.good,
  COLORS.pink,
  COLORS.violet,
  COLORS.teal,
  COLORS.red,
  COLORS.yellow,
];

/** Centre of grid cell (i, j, k) relative to an origin. x = length, y = height, z = width. */
export function cellCenter(origin, i, j, k) {
  return [origin[0] + (i + 0.5) * STEP, origin[1] + (j + 0.5) * STEP, origin[2] + (k + 0.5) * STEP];
}

/**
 * Unit cubes for a block L × H × W.
 * Ordered layer by layer (bottom first), row by row — the natural "fill" order.
 */
export function blockCells({
  id = "b",
  origin = [0, 0, 0],
  L,
  H,
  W,
  color = COLORS.base,
  colorFn,
  limit = Infinity,
  layerDelay = 0,
  from = [0, 0, 0],
}) {
  const out = [];
  for (let j = from[1]; j < H; j++) {
    for (let k = from[2]; k < W; k++) {
      for (let i = from[0]; i < L; i++) {
        if (out.length >= limit) return out;
        out.push({
          key: `${id}:${i},${j},${k}`,
          p: cellCenter(origin, i, j, k),
          s: [CUBE, CUBE, CUBE],
          color: colorFn ? colorFn(i, j, k) : color,
          delay: layerDelay * (j - from[1]),
        });
      }
    }
  }
  return out;
}

/** Flat tiles for an L × W rectangle (area mode). */
export function tileCells({ id = "t", origin = [0, 0, 0], L, W, color = COLORS.base, colorFn }) {
  const out = [];
  for (let k = 0; k < W; k++) {
    for (let i = 0; i < L; i++) {
      out.push({
        key: `${id}:${i},${k}`,
        p: [origin[0] + (i + 0.5) * STEP, origin[1] + TILE_H / 2, origin[2] + (k + 0.5) * STEP],
        s: [CUBE, TILE_H, CUBE],
        color: colorFn ? colorFn(i, k) : color,
      });
    }
  }
  return out;
}

/** Box outline around an L × H × W block. */
export function blockOutline({ origin = [0, 0, 0], L, H, W, color = COLORS.crate, fill, fillOpacity, opacity }) {
  return {
    center: [origin[0] + (L * STEP) / 2, origin[1] + (H * STEP) / 2, origin[2] + (W * STEP) / 2],
    size: [L * STEP + 0.04, H * STEP + 0.04, W * STEP + 0.04],
    color,
    fill,
    fillOpacity,
    opacity,
  };
}

/** Unit-square grid drawn on the floor of a crate (helps students count a layer). */
export function floorGrid({ origin = [0, 0, 0], L, W, y = 0.01, color = "#8fa3ff", opacity = 0.7 }) {
  const pts = [];
  const x0 = origin[0];
  const z0 = origin[2];
  const yy = origin[1] + y;
  for (let i = 0; i <= L; i++) {
    pts.push([x0 + i * STEP, yy, z0], [x0 + i * STEP, yy, z0 + W * STEP]);
  }
  for (let k = 0; k <= W; k++) {
    pts.push([x0, yy, z0 + k * STEP], [x0 + L * STEP, yy, z0 + k * STEP]);
  }
  return { points: pts, color, opacity };
}

/**
 * Dimension labels for a block: "L = 5 cm" along the front, "W = 3 cm" along
 * the right side and "H = 4 cm" beside the front-left edge.
 */
export function dimLabels({ origin = [0, 0, 0], L, H, W, unit = "cm", text = {}, show = { L: true, H: true, W: true }, size = 0.42 }) {
  const out = [];
  const [x0, y0, z0] = origin;
  const fmt = (name, v) => text[name] ?? `${name} = ${v} ${unit}`;
  // Labels keep a fixed size on screen, so push them further out on big
  // blocks (otherwise L and W collide on a long thin 1 × 1 × 24 crate).
  const big = Math.max(L, H, W) * STEP;
  const off = Math.max(0.75, big * 0.16);
  if (show.L) out.push({ text: fmt("L", L), p: [x0 + (L * STEP) / 2, y0 - 0.05, z0 + W * STEP + off], color: "#ffd48a", size });
  if (show.W) out.push({ text: fmt("W", W), p: [x0 + L * STEP + off * 1.15, y0 - 0.05, z0 + (W * STEP) / 2], color: "#9ff0c0", size });
  if (show.H) out.push({ text: fmt("H", H), p: [x0 - off * 1.2, y0 + (H * STEP) / 2, z0 + W * STEP + 0.2], color: "#f6b0ff", size });
  return out;
}

/** Sorted dimension key, so 2×3×4 and 4×3×2 count as the same crate. */
export function shapeKey(a, b, c) {
  return [a, b, c].sort((x, y) => x - y).join("×");
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
