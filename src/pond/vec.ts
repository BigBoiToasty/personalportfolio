/**
 * Minimal 2D vector kit for the fish sim. Plain objects, no classes — the
 * hot loop allocates a handful of these per fish per frame, which is fine
 * at this scale (≤ a dozen fish). Angles are radians, screen-space (+y down).
 */
export interface Vec {
  x: number;
  y: number;
}

export const vec = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
export const len = (a: Vec) => Math.hypot(a.x, a.y);
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const angle = (a: Vec) => Math.atan2(a.y, a.x);
export const fromAngle = (t: number, mag = 1): Vec => ({ x: Math.cos(t) * mag, y: Math.sin(t) * mag });

/** Unit vector; zero stays zero (no NaN). */
export function norm(a: Vec): Vec {
  const l = Math.hypot(a.x, a.y);
  return l > 1e-6 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
}

/** Clamp magnitude to `max`. */
export function limit(a: Vec, max: number): Vec {
  const l = Math.hypot(a.x, a.y);
  return l > max ? { x: (a.x / l) * max, y: (a.y / l) * max } : a;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpVec = (a: Vec, b: Vec, t: number): Vec => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

/** Shortest signed difference b − a, wrapped to (−π, π]. */
export const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
export const lerpAngle = (a: number, b: number, t: number) => a + angleDiff(a, b) * t;

/**
 * Reynolds steering: desired velocity minus current velocity, capped. Feed
 * the result into an accumulated force and it produces the classic smooth
 * "turn toward" rather than a snap.
 */
export function steer(vel: Vec, desired: Vec, maxForce: number): Vec {
  return limit(sub(desired, vel), maxForce);
}

/** Boids: separation / alignment / cohesion over a neighbour list. */
export function flock(
  self: { pos: Vec; vel: Vec },
  neighbours: { pos: Vec; vel: Vec }[],
  opts: { sepRadius: number; sightRadius: number; maxSpeed: number; maxForce: number; sep: number; align: number; cohere: number },
): Vec {
  let sepSum = vec(0, 0), sepN = 0;
  let velSum = vec(0, 0), comSum = vec(0, 0), sightN = 0;
  for (const n of neighbours) {
    const d = dist(self.pos, n.pos);
    if (d <= 0) continue;
    if (d < opts.sepRadius) {
      // push away, weighted harder the closer it is
      sepSum = add(sepSum, scale(norm(sub(self.pos, n.pos)), 1 / d));
      sepN++;
    }
    if (d < opts.sightRadius) {
      velSum = add(velSum, n.vel);
      comSum = add(comSum, n.pos);
      sightN++;
    }
  }
  let out = vec(0, 0);
  if (sepN) out = add(out, scale(steer(self.vel, scale(norm(sepSum), opts.maxSpeed), opts.maxForce), opts.sep));
  if (sightN) {
    const avgVel = scale(velSum, 1 / sightN);
    out = add(out, scale(steer(self.vel, scale(norm(avgVel), opts.maxSpeed), opts.maxForce), opts.align));
    const toCom = sub(scale(comSum, 1 / sightN), self.pos);
    out = add(out, scale(steer(self.vel, scale(norm(toCom), opts.maxSpeed), opts.maxForce), opts.cohere));
  }
  return out;
}
