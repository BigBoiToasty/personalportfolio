import type { Rect } from "./types";

/**
 * Text walls as a distance field. Every rendered line of text (one rect per
 * line fragment via Range.getClientRects — tight to the actual glyphs, not
 * the paragraph's block box) is rasterized into an 8px cell grid, then a
 * chamfer pass turns that into "px to the nearest wall" for every cell.
 * Steering only ever asks two questions — how far is the nearest wall, and
 * which way is away from it — both continuous, so nothing can oscillate.
 * Coordinates are pond-content px (scroll space), so they don't change on
 * scroll and the grid is only rebuilt when layout/content actually changes.
 */
export const CELL = 8;
const PAD = 4;
const BLOCKING = "img,svg,button,input,video,hr,canvas";
const FAR = 1e6;

export interface Walls {
  w: number; // content px
  h: number;
  cols: number;
  rows: number;
  dist: Float32Array; // px to nearest blocked cell centre (0 inside text)
}

/** Line boxes of everything in `scroller`, in content coords. `layerEl` (the
 * fish layer itself) is skipped so fish sprites never count as walls. */
export function measureTextRects(scroller: HTMLElement, layerEl: HTMLElement): Rect[] {
  const rect = scroller.getBoundingClientRect();
  // a pane's enter/exit animation scales the whole pane — undo it so the
  // measured lines land where they'll be once the animation settles
  const scale = rect.width / (scroller.offsetWidth || 1) || 1;
  const sx = scroller.scrollLeft, sy = scroller.scrollTop;
  const out: Rect[] = [];
  const push = (r: DOMRect) => {
    if (r.width < 1 || r.height < 1) return;
    out.push({ x: (r.left - rect.left) / scale + sx, y: (r.top - rect.top) / scale + sy, w: r.width / scale, h: r.height / scale });
  };
  const walker = document.createTreeWalker(scroller, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue?.trim() || layerEl.contains(n)) continue;
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) push(r);
  }
  scroller.querySelectorAll(BLOCKING).forEach((el) => {
    if (!layerEl.contains(el)) push(el.getBoundingClientRect());
  });
  return out;
}

export function buildWalls(w: number, h: number, rects: Rect[]): Walls {
  const cols = Math.max(1, Math.ceil(w / CELL));
  const rows = Math.max(1, Math.ceil(h / CELL));
  const dist = new Float32Array(cols * rows).fill(FAR);
  for (const r of rects) {
    const c0 = Math.max(0, Math.floor((r.x - PAD) / CELL));
    const c1 = Math.min(cols - 1, Math.floor((r.x + r.w + PAD) / CELL));
    const r0 = Math.max(0, Math.floor((r.y - PAD) / CELL));
    const r1 = Math.min(rows - 1, Math.floor((r.y + r.h + PAD) / CELL));
    for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) dist[y * cols + x] = 0;
  }
  // two-pass chamfer distance transform (3-4 style, in px)
  const D1 = CELL, D2 = CELL * Math.SQRT2;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      let d = dist[i];
      if (d === 0) continue;
      if (x > 0) d = Math.min(d, dist[i - 1] + D1);
      if (y > 0) {
        d = Math.min(d, dist[i - cols] + D1);
        if (x > 0) d = Math.min(d, dist[i - cols - 1] + D2);
        if (x < cols - 1) d = Math.min(d, dist[i - cols + 1] + D2);
      }
      dist[i] = d;
    }
  }
  for (let y = rows - 1; y >= 0; y--) {
    for (let x = cols - 1; x >= 0; x--) {
      const i = y * cols + x;
      let d = dist[i];
      if (d === 0) continue;
      if (x < cols - 1) d = Math.min(d, dist[i + 1] + D1);
      if (y < rows - 1) {
        d = Math.min(d, dist[i + cols] + D1);
        if (x < cols - 1) d = Math.min(d, dist[i + cols + 1] + D2);
        if (x > 0) d = Math.min(d, dist[i + cols - 1] + D2);
      }
      dist[i] = d;
    }
  }
  return { w, h, cols, rows, dist };
}

function clampI(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Bilinear sample of the text field (cell centres at (c+0.5)*CELL). */
export function textDistAt(wl: Walls, x: number, y: number) {
  const fx = x / CELL - 0.5, fy = y / CELL - 0.5;
  const x0 = clampI(Math.floor(fx), 0, wl.cols - 1), y0 = clampI(Math.floor(fy), 0, wl.rows - 1);
  const x1 = Math.min(x0 + 1, wl.cols - 1), y1 = Math.min(y0 + 1, wl.rows - 1);
  const tx = clampI(fx - x0, 0, 1), ty = clampI(fy - y0, 0, 1);
  const d = wl.dist;
  const top = d[y0 * wl.cols + x0] * (1 - tx) + d[y0 * wl.cols + x1] * tx;
  const bot = d[y1 * wl.cols + x0] * (1 - tx) + d[y1 * wl.cols + x1] * tx;
  return top * (1 - ty) + bot * ty;
}

/** Distance to the nearest wall *or* pond edge (negative once outside). */
export function distAt(wl: Walls, x: number, y: number) {
  return Math.min(textDistAt(wl, x, y), x, y, wl.w - x, wl.h - y);
}

/** Unit vector pointing away from the nearest wall/edge; zero when flat. */
export function gradAt(wl: Walls, x: number, y: number, fn: (wl: Walls, x: number, y: number) => number = distAt) {
  const h = 3;
  let gx = fn(wl, x + h, y) - fn(wl, x - h, y);
  let gy = fn(wl, x, y + h) - fn(wl, x, y - h);
  const len = Math.hypot(gx, gy);
  if (len < 1e-3) return { x: 0, y: 0 };
  gx /= len;
  gy /= len;
  return { x: gx, y: gy };
}

/** Centre of the closest cell that has at least `minDist` px of clearance
 * (from walls and edges), scanning outward in rings. Null if the pond has no
 * such cell at all. */
export function nearestFree(wl: Walls, x: number, y: number, minDist: number): { x: number; y: number } | null {
  const cx = clampI(Math.floor(x / CELL), 0, wl.cols - 1);
  const cy = clampI(Math.floor(y / CELL), 0, wl.rows - 1);
  const maxR = Math.max(wl.cols, wl.rows);
  for (let r = 0; r <= maxR; r++) {
    let best: { x: number; y: number; d: number } | null = null;
    for (let dy = -r; dy <= r; dy++) {
      const step = Math.abs(dy) === r ? 1 : 2 * r || 1;
      for (let dx = -r; dx <= r; dx += step) {
        const gx = cx + dx, gy = cy + dy;
        if (gx < 0 || gy < 0 || gx >= wl.cols || gy >= wl.rows) continue;
        const px = (gx + 0.5) * CELL, py = (gy + 0.5) * CELL;
        if (distAt(wl, px, py) < minDist) continue;
        const d = Math.hypot(px - x, py - y);
        if (!best || d < best.d) best = { x: px, y: py, d };
      }
    }
    if (best) return { x: best.x, y: best.y };
  }
  return null;
}

/** ponytail: one runnable check — runs once in dev, throws loudly if broken. */
export function selfCheck() {
  const wl = buildWalls(200, 100, [{ x: 80, y: 40, w: 40, h: 20 }]);
  const assert = (ok: boolean, msg: string) => {
    if (!ok) throw new Error(`walls selfCheck: ${msg}`);
  };
  assert(textDistAt(wl, 100, 50) === 0, "inside text is 0");
  assert(textDistAt(wl, 20, 50) > 40, "far from text is far");
  assert(gradAt(wl, 70, 50).x < -0.9, "gradient points away from text");
  assert(distAt(wl, 3, 50) === 3, "edge distance counts");
  const free = nearestFree(wl, 100, 50, 12);
  assert(!!free && distAt(wl, free.x, free.y) >= 12, "nearestFree leaves the text");
}
