import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Activity, FishSim, Pond, PondId, Ripple } from "./types";
import { buildWalls, distAt, gradAt, measureTextRects, nearestFree, selfCheck, textDistAt, type Walls } from "./walls";

if (import.meta.env.DEV) selfCheck();

const FISH_COUNT = 10;
const RARE_CHANCE = 0.12;
const CATCH_RADIUS = 28;

// ripples: the cursor makes a normal ripple when it starts moving and another
// where it stops, with a wake of small ones in between; big ones come from
// clicks and hops
const SCARE_RADIUS = 200;
const SCARE_RADIUS_SMALL = 90;
const FLEE_STRENGTH = 5.5;
const FLEE_STRENGTH_SMALL = 2.5;
const RIPPLE_LIFE_MS = 900; // < BAIT_IDLE_MS, so the last wake ripple has
// expired by the time a fish is sent to the cursor
const RIPPLE_VISUAL_MS = 1200;
const TRAIL_MIN_MS = 110;
const TRAIL_MIN_PX = 28;
const MOVE_START_MS = 400; // no moves for this long ⇒ the next move is a "start"
const MOVE_STOP_MS = 160; // no moves for this long while moving ⇒ a "stop"
const RIPPLE_VISUAL_CAP = 24; // beyond this, wake ripples are physics-only

// steering
const WANDER_JITTER = 0.02;
const WANDER_DECAY = 0.6;
const WANDER_MAX = 0.9;
const WANDER_STRENGTH = 0.8;
const TURN_RATE = Math.PI * 0.7;
const TURN_RATE_FLEEING = Math.PI * 1.3;
const HEADING_SMOOTH = 0.25; // low-pass on the steering target — forces that nearly cancel can't flip it per frame
const SPEED_EASE = 3; // 1/s — how fast speed relaxes toward its target (post-hop glide, wall slow-downs)

// walls (text lines + pond edges) via the distance field in walls.ts
const AVOID_DIST = 44; // px — start curving away this far out
const AVOID_STRENGTH = 5;
const LOOKAHEAD = 34; // px ahead to probe; a low reading turns the fish before it arrives
const LOOKAHEAD_STRENGTH = 3;
const MIN_CLEAR = 5; // never step to a spot closer than this to a wall
const ESCAPE_CLEAR = 24; // an "escaping" fish heads for open water at least this clear — past the line gap, not onto its edge
const ESCAPE_SPEED = 1.5;
const ESCAPE_TIMEOUT_MS = 1200; // still not clear after this ⇒ pick a fresh target once, then re-enter from an edge
const BLOCKED_MS = 150; // steps refused for this long ⇒ stuck, flee
const STALL_MS = 400; // moved < STALL_PX in this long ⇒ jittering in place, flee
const STALL_PX = 6;
// settle → clear → lock (per pond, after every wall rebuild)
const CLEAR_OUT = 12; // while settling, anything closer than this to text is sent out
const SETTLE_MIN_MS = 150; // let layout finish before locking
const SETTLE_MAX_MS = 1500; // failsafe: lock anyway, re-entering any fish still inside
const SWIM_IN_OUTSIDE = 24; // px past the visible edge a new arrival starts from
const SWIM_IN_INSIDE = 40; // px inside the edge it heads for
const AWAY_MARGIN = 60; // open-edged pond: this far off-screen counts as gone
const AWAY_PULL = 1.2; // gentle steer back toward the screen once past the edge
const AWAY_MIN_MS = 2000;
const AWAY_MAX_MS = 5000;

// AFK bite: the idle cursor is the target — a fish approaches, noses at the
// pointer a few times (never covering it), then either swims over it — which
// is the catch — or turns away and wanders on. Clicking a nibbling fish
// catches it through the ordinary click-on-fish path.
const BAIT_IDLE_MS = 1100;
const BAIT_CLEAR = 16; // the cursor needs this much open water around it
const APPROACH_SPEED = 0.6;
const APPROACH_STRENGTH = 4.5;
const APPROACH_TIMEOUT_MS = 4000; // stuck behind text? lose interest
const REST_DIST = 30; // px from the cursor the fish parks (centre)
const NIBBLE_REACH = 20; // px from the cursor the centre gets to on a nibble — nose just touches, body never covers
const NIBBLE_MIN = 2;
const NIBBLE_MAX = 3;
const NIBBLE_LUNGE_MS = 110;
const NIBBLE_BACK_MS = 160;
const NIBBLE_WAIT_MIN_MS = 350;
const NIBBLE_WAIT_MAX_MS = 900;
const TAKE_CHANCE = 0.35;
const TAKE_MS = 180;
const BITE_COOLDOWN_MIN_MS = 1500;
const BITE_COOLDOWN_MAX_MS = 3000;

// hop between adjacent ponds: wind up (back off, face the wall, coil), charge
// straight at it, leap just over
const JUMP_MIN_MS = 9000;
const JUMP_SPREAD_MS = 9000;
const HOP_NEAR = 220; // only fish already this close to the shared wall are candidates
const HOP_RANGE_MARGIN = 30;
const COIL_ANCHOR = 90; // px from the wall the fish coils at
const RETREAT_NEAR = 70; // closer than this glides back to the anchor first
const RETREAT_TIMEOUT_MS = 800;
const COIL_MIN_MS = 500;
const COIL_MAX_MS = 800;
const COIL_DRIFT = 8; // px it slides backward while coiling
const CHARGE_ACCEL = 600; // px/s^2
const CHARGE_MAX_SPEED = 2.4; // × base
const CHARGE_TIMEOUT_MS = 2500; // give up (just wander on) if the wall somehow isn't reached
const TURN_RATE_CHARGE = Math.PI * 2.5;
const LAUNCH_DIST = 14; // px before the visible edge
const HOP_INSET_MIN = 28; // landing depth into the destination's visible window
const HOP_INSET_MAX = 56;
const HOP_BAR_MIN = 20; // landing depth below a lower pane's content top (clears its title bar)
const HOP_BAR_MAX = 40;
const LAND_CLEAR = 16;
const LAND_SEARCH = 60; // how far a blocked landing may shift; else the hop is cancelled
const FLIGHT_MIN_MS = 300;
const FLIGHT_MAX_MS = 480;
const FLIGHT_PEAK_MIN = 18;
const FLIGHT_PEAK_MAX = 26;
const FLIGHT_PITCH_DEG = 10;
const FLIGHT_ARCH_DEG = 10;
const FLIGHT_LIFT_SCALE = 0.1;
const DIVE_START = 0.88; // fraction of the flight where it starts going under
const DIVE_OPACITY = 0.55;
const DIVE_SCALE = 0.9;
const SURFACE_MS = 180; // = --animate-koi-land, the landing squash
const LAND_SPEED_KEEP = 0.6;
const ADJACENCY_TOL = 24; // px gap tolerance between two pane rects to count as touching (divider + borders ≈ 10px)

// placement — nothing ever pops into existence: a fish keeps its viewport
// spot if a pond still covers it, otherwise it swims in from the nearest edge
const START_MIN_MS = 300;
const START_SPREAD_MS = 3000;
const RESTART_MIN_MS = 200;
const RESTART_SPREAD_MS = 600;

// tail-beat periods, written to --beat only when the bucket changes
const BEAT_IDLE = "1.4s";
const BEAT_CRUISE = "0.8s";
const BEAT_FAST = "0.35s";

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function rand(lo: number, hi: number) {
  return lo + Math.random() * (hi - lo);
}
function lerpAngle(a: number, b: number, t: number) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}
function turnToward(f: FishSim, target: number, rate: number, dt: number) {
  const diff = Math.atan2(Math.sin(target - f.heading), Math.cos(target - f.heading));
  const maxTurn = rate * dt;
  f.heading += clamp(diff, -maxTurn, maxTurn);
}
function sprite(f: FishSim) {
  return f.el?.lastElementChild as HTMLElement | null | undefined;
}
function shadow(f: FishSim) {
  return f.el?.firstElementChild as HTMLElement | null | undefined;
}
function writeTransform(f: FishSim, now = 0) {
  if (!f.el) return;
  f.el.style.transform = `translate(-50%, -50%) translate(${f.x}px, ${f.y}px) rotate(${(f.heading * 180) / Math.PI}deg)`;
  // resurfacing after a dive: fade/scale back to normal, then leave it alone
  if (f.submerged) {
    const sp = sprite(f);
    const k = f.surfaceUntil > now ? 1 - (f.surfaceUntil - now) / SURFACE_MS : 1;
    if (sp) {
      sp.style.opacity = String(DIVE_OPACITY + (1 - DIVE_OPACITY) * k);
      sp.style.transform = `scale(${DIVE_SCALE + (1 - DIVE_SCALE) * k})`;
    }
    if (k >= 1) {
      f.submerged = false;
      if (sp) {
        sp.style.opacity = "";
        sp.style.transform = "";
        sp.classList.remove("koi-land");
      }
    }
  }
}
function writeBeat(f: FishSim, fast: boolean) {
  const beat = fast || f.speed > f.baseSpeed * 1.3 ? BEAT_FAST : f.speed < f.baseSpeed * 0.5 ? BEAT_IDLE : BEAT_CRUISE;
  if (beat !== f.beat) {
    f.beat = beat;
    f.el?.style.setProperty("--beat", beat);
  }
}
function setCoil(f: FishSim, on: boolean) {
  sprite(f)?.classList.toggle("koi-coil", on);
}

function makeFishSim(id: number): FishSim {
  const baseSpeed = 80 + Math.random() * 25;
  return {
    id,
    el: null,
    pond: null,
    x: 0,
    y: 0,
    heading: 0,
    targetHeading: 0,
    wander: 0,
    speed: baseSpeed,
    baseSpeed,
    beat: BEAT_CRUISE,
    rare: Math.random() < RARE_CHANCE,
    catching: false,
    activity: "wander",
    sub: "wait",
    phaseStart: 0,
    phaseUntil: 0,
    nibbles: 0,
    restX: 0,
    restY: 0,
    startAt: performance.now() + START_MIN_MS + Math.random() * START_SPREAD_MS,
    started: false,
    awayUntil: null,
    blockedSince: null,
    anchorX: 0,
    anchorY: 0,
    anchorAt: 0,
    jump: null,
    flight: null,
    surfaceUntil: 0,
    submerged: false,
    escape: null,
    orphanX: null,
    orphanY: null,
  };
}

function rebuildWalls(p: Pond) {
  const w = p.el.clientWidth;
  const h = Math.max(p.el.scrollHeight, p.el.clientHeight);
  p.walls = buildWalls(w, h, p.collectObstacles ? measureTextRects(p.el, p.layerEl) : []);
  // new walls are not enforced until every fish has cleared them
  if (p.wallsLocked) p.settleStart = -1;
  p.wallsLocked = false;
}

/** Distance function for a pond: panels count their edges as walls, an
 * open pond (home) only its text. */
function distFn(p: Pond): (wl: Walls, x: number, y: number) => number {
  return p.edges === "open" ? textDistAt : distAt;
}

type Wall = "left" | "right" | "top" | "bottom";
const OPPOSITE: Record<Wall, Wall> = { left: "right", right: "left", top: "bottom", bottom: "top" };
const WALL_DIR: Record<Wall, [number, number]> = { right: [1, 0], left: [-1, 0], bottom: [0, 1], top: [0, -1] };

/** Shared border between two viewport rects, if any, in viewport coords. */
function sharedWall(a: Pond["rect"], b: Pond["rect"]): { wall: Wall; start: number; end: number } | null {
  if (Math.abs(a.x + a.w - b.x) < ADJACENCY_TOL) {
    const top = Math.max(a.y, b.y);
    const bottom = Math.min(a.y + a.h, b.y + b.h);
    if (bottom - top > 20) return { wall: "right", start: top, end: bottom };
  }
  if (Math.abs(b.x + b.w - a.x) < ADJACENCY_TOL) {
    const top = Math.max(a.y, b.y);
    const bottom = Math.min(a.y + a.h, b.y + b.h);
    if (bottom - top > 20) return { wall: "left", start: top, end: bottom };
  }
  if (Math.abs(a.y + a.h - b.y) < ADJACENCY_TOL) {
    const left = Math.max(a.x, b.x);
    const right = Math.min(a.x + a.w, b.x + b.w);
    if (right - left > 20) return { wall: "bottom", start: left, end: right };
  }
  if (Math.abs(b.y + b.h - a.y) < ADJACENCY_TOL) {
    const left = Math.max(a.x, b.x);
    const right = Math.min(a.x + a.w, b.x + b.w);
    if (right - left > 20) return { wall: "top", start: left, end: right };
  }
  return null;
}

/** viewport px → this pond's content px */
function toContent(p: Pond, vx: number, vy: number) {
  return { x: vx - p.rect.x + p.scrollX, y: vy - p.rect.y + p.scrollY };
}
function toViewport(p: Pond, x: number, y: number) {
  return { x: p.rect.x + x - p.scrollX, y: p.rect.y + y - p.scrollY };
}
function inView(p: Pond, x: number, y: number) {
  return x >= p.scrollX && x <= p.scrollX + p.vw && y >= p.scrollY && y <= p.scrollY + p.vh;
}
/** Content-px distance from the visible window (0 inside). */
function outOfView(p: Pond, x: number, y: number) {
  const dx = Math.max(p.scrollX - x, 0, x - (p.scrollX + p.vw));
  const dy = Math.max(p.scrollY - y, 0, y - (p.scrollY + p.vh));
  return Math.hypot(dx, dy);
}
/** Perpendicular distance from a point to a pond's visible edge. */
function toWallDist(p: Pond, wall: Wall, x: number, y: number) {
  return wall === "right" ? p.scrollX + p.vw - x : wall === "left" ? x - p.scrollX : wall === "bottom" ? p.scrollY + p.vh - y : y - p.scrollY;
}

/** Distance from a viewport point to a pond's visible rect (0 if inside). */
function rectDist(p: Pond, vx: number, vy: number) {
  const dx = Math.max(p.rect.x - vx, 0, vx - (p.rect.x + p.rect.w));
  const dy = Math.max(p.rect.y - vy, 0, vy - (p.rect.y + p.rect.h));
  return Math.hypot(dx, dy);
}

/** Start a fish just outside one visible edge of `pond`, aimed at open water
 * just inside it — the only way a fish ever arrives anywhere. `near` (content
 * px) picks the closest edge; otherwise a random one. */
function swimIn(f: FishSim, pond: Pond, near?: { x: number; y: number }) {
  const x0 = pond.scrollX, y0 = pond.scrollY, x1 = pond.scrollX + pond.vw, y1 = pond.scrollY + pond.vh;
  let wall: Wall;
  let along: number;
  if (near) {
    const d: [Wall, number][] = [["left", Math.abs(near.x - x0)], ["right", Math.abs(x1 - near.x)], ["top", Math.abs(near.y - y0)], ["bottom", Math.abs(y1 - near.y)]];
    d.sort((a, b) => a[1] - b[1]);
    wall = d[0][0];
    along = wall === "left" || wall === "right" ? near.y : near.x;
  } else {
    wall = (["left", "right", "top", "bottom"] as Wall[])[Math.floor(Math.random() * 4)];
    along = wall === "left" || wall === "right" ? rand(y0, y1) : rand(x0, x1);
  }
  const M = 30;
  let sx: number, sy: number, ix: number, iy: number;
  if (wall === "left" || wall === "right") {
    sy = iy = clamp(along, y0 + M, y1 - M);
    sx = wall === "left" ? x0 - SWIM_IN_OUTSIDE : x1 + SWIM_IN_OUTSIDE;
    ix = wall === "left" ? x0 + SWIM_IN_INSIDE : x1 - SWIM_IN_INSIDE;
  } else {
    sx = ix = clamp(along, x0 + M, x1 - M);
    sy = wall === "top" ? y0 - SWIM_IN_OUTSIDE : y1 + SWIM_IN_OUTSIDE;
    iy = wall === "top" ? y0 + SWIM_IN_INSIDE : y1 - SWIM_IN_INSIDE;
  }
  f.pond = pond.id;
  f.x = sx;
  f.y = sy;
  f.escape = nearestFree(pond.walls, ix, iy, ESCAPE_CLEAR) ?? { x: ix, y: iy };
  f.heading = f.targetHeading = Math.atan2(f.escape.y - sy, f.escape.x - sx);
  f.activity = "escaping";
  f.sub = "wait";
  f.phaseUntil = performance.now() + ESCAPE_TIMEOUT_MS * 2;
  f.blockedSince = null;
  f.wander = 0;
  f.speed = f.baseSpeed;
  f.started = true;
  f.awayUntil = null;
  f.orphanX = null;
  f.orphanY = null;
}

interface PondApi {
  fishRef: React.RefObject<FishSim[]>;
  pondIds: PondId[];
  renderTick: number;
  ripples: Ripple[];
  caught: { common: number; rare: number };
  registerPond: (id: PondId, el: HTMLElement, layerEl: HTMLElement, opts: { obstacles: boolean; edges: Pond["edges"] }) => void;
  unregisterPond: (id: PondId) => void;
  refreshWalls: (id: PondId) => void;
  pointerMove: (id: PondId, clientX: number, clientY: number) => void;
  pointerLeave: (id: PondId) => void;
  pointerClick: (id: PondId, clientX: number, clientY: number) => void;
  notifyPopEnd: (fishId: number) => void;
  getPond: (id: PondId) => Pond | undefined;
}

const Ctx = createContext<PondApi | null>(null);

export function usePondCtx() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePondCtx must be used inside <PondProvider>");
  return ctx;
}

export function PondProvider({ children }: { children: ReactNode }) {
  const pondsRef = useRef(new Map<PondId, Pond>());
  const fishRef = useRef<FishSim[]>([]);
  if (fishRef.current.length === 0) {
    fishRef.current = Array.from({ length: FISH_COUNT }, (_, i) => makeFishSim(i));
  }
  const ripplesRef = useRef<Ripple[]>([]); // physics (scare-force) list
  const visualRipplesRef = useRef(0);
  const nextIdRef = useRef(0);
  // one cursor across all ponds: last move time, last wake ripple (viewport
  // px), and — while moving — where the stop ripple should land (content px)
  const trailRef = useRef({ lastMoveAt: 0, wakeAt: 0, x: 0, y: 0, moving: false, pond: "" as PondId, cx: 0, cy: 0 });
  const nextJumpAtRef = useRef(performance.now() + JUMP_MIN_MS + Math.random() * JUMP_SPREAD_MS);
  const rafRef = useRef(0);
  const lastRef = useRef(performance.now());

  const [pondIds, setPondIds] = useState<PondId[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [renderTick, setRenderTick] = useState(0);
  const [caught, setCaught] = useState({ common: 0, rare: 0 });
  const bump = useCallback(() => setRenderTick((t) => t + 1), []);

  const emitRipple = useCallback((pond: PondId, x: number, y: number, kind: "scare" | "splash", size: Ripple["size"] = "normal") => {
    const id = nextIdRef.current++;
    const r: Ripple = { id, pond, x, y, t: performance.now(), kind, size };
    ripplesRef.current.push(r);
    if (size === "small" && visualRipplesRef.current >= RIPPLE_VISUAL_CAP) return;
    visualRipplesRef.current++;
    setRipples((rs) => [...rs, r]);
    window.setTimeout(() => {
      visualRipplesRef.current--;
      setRipples((rs) => rs.filter((x2) => x2.id !== id));
    }, RIPPLE_VISUAL_MS);
  }, []);

  /** Bite over (any outcome): release the fish and give the pond a breather. */
  const endBite = useCallback((p: Pond) => {
    p.biteFish = null;
    p.biteCooldownUntil = performance.now() + rand(BITE_COOLDOWN_MIN_MS, BITE_COOLDOWN_MAX_MS);
  }, []);

  /** Lose interest: turn away from the cursor and just wander on. */
  const leave = useCallback(
    (f: FishSim, p: Pond) => {
      const from = p.bait ?? { x: f.restX, y: f.restY };
      f.activity = "wander";
      f.targetHeading = Math.atan2(f.y - from.y, f.x - from.x);
      f.speed = f.baseSpeed;
      endBite(p);
    },
    [endBite],
  );

  const catchFish = useCallback(
    (f: FishSim, p: Pond) => {
      f.catching = true;
      f.activity = "wander";
      setCaught((c) => (f.rare ? { ...c, rare: c.rare + 1 } : { ...c, common: c.common + 1 }));
      if (p.biteFish === f.id) endBite(p);
      bump();
    },
    [endBite, bump],
  );

  const resetUnassigned = useCallback((f: FishSim, orphan?: { x: number; y: number }) => {
    f.pond = null;
    f.jump = null;
    f.flight = null;
    f.escape = null;
    f.activity = "wander";
    f.speed = f.baseSpeed;
    f.submerged = false;
    f.awayUntil = null;
    if (orphan) {
      // try to reclaim the exact same viewport spot next frame; if nothing
      // covers it any more it swims in from the nearest pond's closest edge
      f.orphanX = orphan.x;
      f.orphanY = orphan.y;
      f.started = true;
    } else {
      f.orphanX = null;
      f.orphanY = null;
      f.started = false;
      f.startAt = performance.now() + RESTART_MIN_MS + Math.random() * RESTART_SPREAD_MS;
    }
  }, []);

  const registerPond = useCallback((id: PondId, el: HTMLElement, layerEl: HTMLElement, opts: { obstacles: boolean; edges: Pond["edges"] }) => {
    const r = el.getBoundingClientRect();
    const p: Pond = {
      id,
      el,
      layerEl,
      collectObstacles: opts.obstacles,
      edges: opts.edges,
      rect: { x: r.left, y: r.top, w: r.width, h: r.height },
      vw: el.clientWidth,
      vh: el.clientHeight,
      scrollX: el.scrollLeft,
      scrollY: el.scrollTop,
      walls: buildWalls(1, 1, []),
      wallsLocked: false,
      settleStart: -1,
      bait: null,
      lastMoveAt: 0,
      biteFish: null,
      biteCooldownUntil: 0,
      targetCount: 0,
    };
    rebuildWalls(p);
    pondsRef.current.set(id, p);
    setPondIds([...pondsRef.current.keys()]);
  }, []);

  const unregisterPond = useCallback(
    (id: PondId) => {
      const removed = pondsRef.current.get(id);
      pondsRef.current.delete(id);
      if (removed) {
        // `removed.rect`/scroll are the last *good* measurements — the tick
        // skips detached/zero-size elements — so every fish keeps its true
        // viewport spot instead of collapsing toward the top-left
        for (const f of fishRef.current) {
          if (f.pond === id) {
            resetUnassigned(f, toViewport(removed, f.x, f.y));
          } else if (f.jump?.toPond === id) {
            if (f.activity === "flying") {
              resetUnassigned(f, { x: f.x, y: f.y }); // already viewport coords
            } else {
              // still in its own source pond mid wind-up — just cancel the hop
              f.jump = null;
              f.activity = "wander";
              setCoil(f, false);
            }
          }
        }
      }
      setPondIds([...pondsRef.current.keys()]);
      bump();
    },
    [resetUnassigned, bump],
  );

  const refreshWalls = useCallback((id: PondId) => {
    const p = pondsRef.current.get(id);
    if (p) rebuildWalls(p);
  }, []);

  const pointerMove = useCallback(
    (id: PondId, clientX: number, clientY: number) => {
      const p = pondsRef.current.get(id);
      if (!p) return;
      const { x, y } = toContent(p, clientX, clientY);
      const now = performance.now();
      p.bait = { x, y };
      p.lastMoveAt = now;
      const tr = trailRef.current;
      if (now - tr.lastMoveAt > MOVE_START_MS) {
        // first move after a rest: the big one
        emitRipple(id, x, y, "scare");
        tr.wakeAt = now;
        tr.x = clientX;
        tr.y = clientY;
      } else if (now - tr.wakeAt >= TRAIL_MIN_MS && Math.hypot(clientX - tr.x, clientY - tr.y) >= TRAIL_MIN_PX) {
        // the wake: small ripples along the path — throttled globally so
        // crossing into another pane isn't a fresh start
        emitRipple(id, x, y, "scare", "small");
        tr.wakeAt = now;
        tr.x = clientX;
        tr.y = clientY;
      }
      tr.lastMoveAt = now;
      tr.moving = true;
      tr.pond = id;
      tr.cx = x;
      tr.cy = y;
    },
    [emitRipple],
  );

  const pointerLeave = useCallback((id: PondId) => {
    const p = pondsRef.current.get(id);
    if (p) p.bait = null;
  }, []);

  const pointerClick = useCallback(
    (id: PondId, clientX: number, clientY: number) => {
      const p = pondsRef.current.get(id);
      if (!p) return;
      const { x, y } = toContent(p, clientX, clientY);
      emitRipple(id, x, y, "scare");

      // click right on a fish (a nibbling one is well within reach) nabs it
      let hit: FishSim | null = null;
      let bestDist = CATCH_RADIUS;
      for (const f of fishRef.current) {
        if (f.pond !== id || f.catching) continue;
        const d = Math.hypot(f.x - x, f.y - y);
        if (d < bestDist) {
          bestDist = d;
          hit = f;
        }
      }
      if (hit) catchFish(hit, p);
    },
    [emitRipple, catchFish],
  );

  const notifyPopEnd = useCallback(
    (fishId: number) => {
      const f = fishRef.current.find((x) => x.id === fishId);
      if (!f) return;
      f.catching = false;
      f.rare = Math.random() < RARE_CHANCE;
      resetUnassigned(f);
      bump();
    },
    [resetUnassigned, bump],
  );

  const getPond = useCallback((id: PondId) => pondsRef.current.get(id), []);

  // ---- the simulation loop -------------------------------------------------
  useEffect(() => {
    function tick(now: number) {
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;

      const ripples2 = ripplesRef.current;
      while (ripples2.length && now - ripples2[0].t > RIPPLE_LIFE_MS) ripples2.shift();

      // the cursor came to rest: one normal ripple where it stopped
      const tr = trailRef.current;
      if (tr.moving && now - tr.lastMoveAt > MOVE_STOP_MS) {
        tr.moving = false;
        if (pondsRef.current.has(tr.pond)) emitRipple(tr.pond, tr.cx, tr.cy, "scare");
      }

      const ponds = [...pondsRef.current.values()];
      // the visible window and scroll offset are only needed for pointer /
      // hop / orphan geometry — fish positions themselves are content px,
      // so a pane's transform animation never touches them. A pane whose DOM
      // is already detached (React unmounts before the cleanup that
      // unregisters it) measures as all zeros: keep the last good snapshot.
      for (const p of ponds) {
        if (!p.el.isConnected) continue;
        const r = p.el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        p.rect = { x: r.left, y: r.top, w: r.width, h: r.height };
        p.vw = p.el.clientWidth;
        p.vh = p.el.clientHeight;
        p.scrollX = p.el.scrollLeft;
        p.scrollY = p.el.scrollTop;
        const ch = Math.max(p.el.scrollHeight, p.el.clientHeight);
        if (Math.abs(p.vw - p.walls.w) > 1 || Math.abs(ch - p.walls.h) > 1) rebuildWalls(p); // safety net behind the observers
      }

      // ---- settle → clear → lock: walls lock once no fish is under text ----
      for (const p of ponds) {
        if (p.wallsLocked) continue;
        if (p.settleStart < 0) p.settleStart = now;
        if (!p.collectObstacles) {
          p.wallsLocked = true; // home: no text walls
          continue;
        }
        const inside = fishRef.current.filter((f) => f.pond === p.id && !f.catching && distAt(p.walls, f.x, f.y) < CLEAR_OUT);
        const elapsed = now - p.settleStart;
        if ((inside.length === 0 && elapsed > SETTLE_MIN_MS) || elapsed > SETTLE_MAX_MS) {
          // failsafe: never lock a fish *in* — one merely grazing text is fine
          let moved = false;
          for (const f of inside) {
            if (distAt(p.walls, f.x, f.y) < MIN_CLEAR) {
              swimIn(f, p);
              moved = true;
            }
          }
          p.wallsLocked = true;
          if (moved) bump();
        }
      }

      if (ponds.length > 0) {
        const totalArea = ponds.reduce((s, p) => s + p.vw * p.vh, 0) || 1;
        let assigned = 0;
        ponds.forEach((p, i) => {
          if (i === ponds.length - 1) {
            p.targetCount = FISH_COUNT - assigned;
          } else {
            const c = Math.max(1, Math.round(((p.vw * p.vh) / totalArea) * FISH_COUNT));
            p.targetCount = c;
            assigned += c;
          }
        });
      }

      const counts = new Map<PondId, number>();
      for (const f of fishRef.current) if (f.pond) counts.set(f.pond, (counts.get(f.pond) ?? 0) + 1);

      // ---- bring unassigned fish in — never by appearing. Either the exact
      // viewport spot it had is still water (a layout change merely moved
      // ponds around it), or it swims in from the closest pond's nearest edge.
      for (const f of fishRef.current) {
        if (f.pond !== null || f.activity === "flying" || f.catching) continue;
        if (ponds.length === 0) continue;

        if (f.orphanX !== null && f.orphanY !== null) {
          const ox = f.orphanX, oy = f.orphanY;
          const home = ponds.find((p) => rectDist(p, ox, oy) === 0);
          if (home) {
            const c = toContent(home, ox, oy);
            f.pond = home.id;
            f.x = c.x;
            f.y = c.y;
            f.targetHeading = f.heading;
            f.activity = "wander"; // if text now covers it, the trapped rule below makes it swim out
            f.orphanX = null;
            f.orphanY = null;
          } else {
            const nearest = ponds.reduce((a, b) => (rectDist(b, ox, oy) < rectDist(a, ox, oy) ? b : a));
            swimIn(f, nearest, toContent(nearest, ox, oy));
          }
          counts.set(f.pond!, (counts.get(f.pond!) ?? 0) + 1);
          bump();
          continue;
        }

        if (f.awayUntil !== null) {
          if (now < f.awayUntil) continue; // off-screen on the home pond, coming back later
          f.awayUntil = null;
          f.started = true;
        }
        if (!f.started) {
          if (now < f.startAt) continue;
          f.started = true;
        }
        let dest = ponds[0];
        let bestDeficit = -Infinity;
        for (const p of ponds) {
          const deficit = p.targetCount - (counts.get(p.id) ?? 0);
          if (deficit > bestDeficit) {
            bestDeficit = deficit;
            dest = p;
          }
        }
        counts.set(dest.id, (counts.get(dest.id) ?? 0) + 1);
        swimIn(f, dest);
        bump();
      }

      // ---- AFK bite: the idle cursor is the target ----
      for (const p of ponds) {
        const idle = !!p.bait && now - p.lastMoveAt > BAIT_IDLE_MS;
        const bf = p.biteFish !== null ? fishRef.current.find((f) => f.id === p.biteFish) : undefined;
        if (!idle) {
          // cursor moved: whoever was nosing at it loses interest (a take in
          // progress still completes — that fish is already caught)
          if (bf && !bf.catching && (bf.activity === "approach" || bf.activity === "nibble")) leave(bf, p);
          else if (bf === undefined && p.biteFish !== null) endBite(p);
          continue;
        }
        if (p.biteFish !== null || now < p.biteCooldownUntil) continue;
        const b = p.bait!;
        if (distAt(p.walls, b.x, b.y) < BAIT_CLEAR) continue; // cursor sits on text / an edge — no fish comes
        let nearest: FishSim | null = null;
        let nd = Infinity;
        for (const g of fishRef.current) {
          if (g.pond !== p.id || g.catching || g.activity !== "wander" || !inView(p, g.x, g.y)) continue;
          const d = Math.hypot(g.x - b.x, g.y - b.y);
          if (d < nd) {
            nd = d;
            nearest = g;
          }
        }
        if (!nearest) continue;
        const ang = Math.atan2(nearest.y - b.y, nearest.x - b.x); // pause on the fish's own side
        let rx = b.x + Math.cos(ang) * REST_DIST, ry = b.y + Math.sin(ang) * REST_DIST;
        if (distAt(p.walls, rx, ry) < MIN_CLEAR) {
          const alt = nearestFree(p.walls, rx, ry, ESCAPE_CLEAR);
          if (!alt || Math.hypot(alt.x - b.x, alt.y - b.y) > REST_DIST * 2) continue;
          rx = alt.x;
          ry = alt.y;
        }
        nearest.activity = "approach";
        nearest.restX = rx;
        nearest.restY = ry;
        nearest.phaseUntil = now + APPROACH_TIMEOUT_MS;
        p.biteFish = nearest.id;
      }

      // schedule the occasional cross-pond hop
      const anyMidJump = fishRef.current.some((f) => f.activity === "flying" || f.activity === "windup" || f.activity === "charge");
      if (!anyMidJump && ponds.length >= 2 && now > nextJumpAtRef.current) {
        nextJumpAtRef.current = now + JUMP_MIN_MS + Math.random() * JUMP_SPREAD_MS;
        attemptJump(now, ponds, counts);
      }

      function attemptJump(now: number, ponds: Pond[], counts: Map<PondId, number>) {
        type Candidate = { src: Pond; dst: Pond; wall: Wall; range: { start: number; end: number }; score: number };
        const candidates: Candidate[] = [];
        for (let i = 0; i < ponds.length; i++) {
          for (let j = i + 1; j < ponds.length; j++) {
            const w = sharedWall(ponds[i].rect, ponds[j].rect);
            if (!w) continue;
            const surplusI = (counts.get(ponds[i].id) ?? 0) - ponds[i].targetCount;
            const deficitJ = ponds[j].targetCount - (counts.get(ponds[j].id) ?? 0);
            candidates.push({ src: ponds[i], dst: ponds[j], wall: w.wall, range: { start: w.start, end: w.end }, score: surplusI + deficitJ });
            const surplusJ = (counts.get(ponds[j].id) ?? 0) - ponds[j].targetCount;
            const deficitI = ponds[i].targetCount - (counts.get(ponds[i].id) ?? 0);
            candidates.push({ src: ponds[j], dst: ponds[i], wall: OPPOSITE[w.wall], range: { start: w.start, end: w.end }, score: surplusJ + deficitI });
          }
        }
        if (!candidates.length) return;
        candidates.sort((a, b) => b.score - a.score);
        // occasionally hop even near balance, so it doesn't go still forever
        const pick = candidates[0].score > 0 || Math.random() < 0.4 ? candidates[0] : null;
        if (!pick) return;
        const { src, dst, wall, range } = pick;
        const horizontal = wall === "left" || wall === "right";

        // a candidate fish is visible, already near the shared wall, and
        // lined up with the stretch the two ponds actually share
        const pool = fishRef.current.filter((f) => {
          if (f.pond !== src.id || f.activity !== "wander" || f.catching || !inView(src, f.x, f.y)) return false;
          if (toWallDist(src, wall, f.x, f.y) > HOP_NEAR) return false;
          const v = toViewport(src, f.x, f.y);
          const along = horizontal ? v.y : v.x;
          return along >= range.start - HOP_RANGE_MARGIN && along <= range.end + HOP_RANGE_MARGIN;
        });
        if (!pool.length) return;
        const fish = pool[Math.floor(Math.random() * pool.length)];

        // cross at the fish's own coordinate along the wall (straight run),
        // land just past it: mirrored point a little way into the other pond
        const v = toViewport(src, fish.x, fish.y);
        const alongV = clamp(horizontal ? v.y : v.x, range.start + 10, range.end - 10);
        let landV: { x: number; y: number };
        if (wall === "right") landV = { x: dst.rect.x + rand(HOP_INSET_MIN, HOP_INSET_MAX), y: alongV };
        else if (wall === "left") landV = { x: dst.rect.x + dst.vw - rand(HOP_INSET_MIN, HOP_INSET_MAX), y: alongV };
        else if (wall === "bottom") landV = { x: alongV, y: dst.rect.y + rand(HOP_BAR_MIN, HOP_BAR_MAX) }; // dst.rect starts below its title bar
        else landV = { x: alongV, y: dst.rect.y + dst.vh - rand(HOP_INSET_MIN, HOP_INSET_MAX) };
        let land = toContent(dst, landV.x, landV.y);
        if (distAt(dst.walls, land.x, land.y) < LAND_CLEAR) {
          const alt = nearestFree(dst.walls, land.x, land.y, LAND_CLEAR);
          if (!alt || Math.hypot(alt.x - land.x, alt.y - land.y) > LAND_SEARCH) return; // nowhere to land — no hop
          land = alt;
        }

        const wallPointC = toContent(src, alongV, alongV); // same value on both axes; pick the right one below
        const wallPoint = horizontal ? wallPointC.y : wallPointC.x;
        fish.jump = { toPond: dst.id, wall, wallPoint, landX: land.x, landY: land.y };
        // coil anchor: COIL_ANCHOR px out from the crossing point
        const dir = WALL_DIR[wall];
        const ex = wall === "left" ? src.scrollX : wall === "right" ? src.scrollX + src.vw : wallPoint;
        const ey = wall === "top" ? src.scrollY : wall === "bottom" ? src.scrollY + src.vh : wallPoint;
        fish.restX = ex - dir[0] * COIL_ANCHOR;
        fish.restY = ey - dir[1] * COIL_ANCHOR;
        fish.activity = "windup";
        fish.sub = toWallDist(src, wall, fish.x, fish.y) < RETREAT_NEAR ? "retreat" : "coil";
        fish.phaseStart = now;
        fish.phaseUntil = now + (fish.sub === "retreat" ? RETREAT_TIMEOUT_MS : rand(COIL_MIN_MS, COIL_MAX_MS));
      }

      // ---- per-fish update ----
      for (const f of fishRef.current) {
        if (f.catching || (f.pond === null && f.activity !== "flying")) continue;

        if (f.activity === "flying") {
          const fl = f.flight!;
          const t = Math.min(1, (now - fl.t0) / fl.dur);
          // constant ground velocity (no easing — easing is what read as
          // "stop and plop"); height is a clean ballistic arc
          f.x = fl.x0 + (fl.x1 - fl.x0) * t;
          f.y = fl.y0 + (fl.y1 - fl.y0) * t;
          f.heading = Math.atan2(fl.y1 - fl.y0, fl.x1 - fl.x0);
          const h = 4 * fl.peak * t * (1 - t);
          const lift = h / fl.peak;
          const upness = 1 - 2 * t; // +1 rising, −1 falling
          const dive = t > DIVE_START ? (t - DIVE_START) / (1 - DIVE_START) : 0;
          if (f.el) {
            f.el.style.transform = `translate(-50%, -50%) translate(${f.x}px, ${f.y}px) rotate(${(f.heading * 180) / Math.PI + upness * FLIGHT_PITCH_DEG}deg)`;
            f.el.style.setProperty("--arch", `${upness * FLIGHT_ARCH_DEG}deg`);
            const sp = sprite(f), sh = shadow(f);
            if (sp) {
              sp.style.transform = `translateY(${-h}px) scale(${(1 + FLIGHT_LIFT_SCALE * lift) * (1 - (1 - DIVE_SCALE) * dive)})`;
              sp.style.opacity = String(1 - (1 - DIVE_OPACITY) * dive);
            }
            if (sh) {
              sh.style.opacity = String(0.4 + 0.6 * (1 - lift));
              sh.style.transform = `translate(-50%, -50%) scale(${1 - 0.3 * lift})`;
            }
          }
          writeBeat(f, true);
          if (t >= 1) {
            const destId = f.jump!.toPond;
            const dest = pondsRef.current.get(destId);
            f.el?.style.setProperty("--arch", "0deg");
            const sh = shadow(f);
            if (sh) sh.style.opacity = "0";
            if (dest) {
              f.pond = destId;
              f.x = f.jump!.landX;
              f.y = f.jump!.landY;
              f.targetHeading = f.heading;
              f.speed *= LAND_SPEED_KEEP; // glides on rather than stopping dead
              f.submerged = true;
              f.surfaceUntil = now + SURFACE_MS;
              sprite(f)?.classList.add("koi-land");
              emitRipple(destId, f.x, f.y, "splash"); // one normal ripple, nothing else
            } else {
              resetUnassigned(f, { x: f.x, y: f.y });
            }
            f.activity = "wander";
            f.jump = null;
            f.flight = null;
            bump();
          }
          continue;
        }

        const pond = f.pond ? pondsRef.current.get(f.pond) : null;
        if (!pond) continue;
        const wl = pond.walls;
        const dist2 = distFn(pond);

        // ---- open pond (home): swim off the screen and come back later ----
        if (pond.edges === "open" && f.activity === "wander" && outOfView(pond, f.x, f.y) > AWAY_MARGIN) {
          f.pond = null;
          f.awayUntil = now + rand(AWAY_MIN_MS, AWAY_MAX_MS);
          bump();
          continue;
        }

        const d0 = dist2(wl, f.x, f.y);
        const settling = pond.collectObstacles && !pond.wallsLocked;

        /** The one way a fish moves inside a pond. Locked walls: a step must
         * keep MIN_CLEAR, or at least not go deeper; otherwise it slides
         * (x-only, then y-only) instead of freezing. Unlocked: free. */
        const stepTo = (nx: number, ny: number): boolean => {
          const ok = (x: number, y: number) => {
            if (!pond.wallsLocked) return true;
            const d = dist2(wl, x, y);
            return d >= MIN_CLEAR || d >= d0;
          };
          if (ok(nx, ny)) { f.x = nx; f.y = ny; }
          else if (ok(nx, f.y)) f.x = nx;
          else if (ok(f.x, ny)) f.y = ny;
          else {
            f.blockedSince ??= now;
            return false;
          }
          f.blockedSince = null;
          return true;
        };
        /** Drop whatever it was doing (bite, hop) cleanly. */
        const cancelActivity = () => {
          if (pond.biteFish === f.id) endBite(pond);
          if (f.jump) { f.jump = null; setCoil(f, false); }
          f.escape = null;
          f.speed = f.baseSpeed;
        };
        /** Flee to open water the way it flees a ripple. */
        const flee = () => {
          cancelActivity();
          const target = nearestFree(wl, f.x, f.y, ESCAPE_CLEAR);
          if (!target) {
            swimIn(f, pond); // no open water anywhere (tiny pond full of text) — re-enter from an edge
            return;
          }
          f.activity = "escaping";
          f.escape = target;
          f.sub = "wait";
          f.phaseUntil = now + ESCAPE_TIMEOUT_MS;
          f.blockedSince = null;
          f.anchorX = f.x;
          f.anchorY = f.y;
          f.anchorAt = now;
        };

        // ---- under text (settling: anywhere near it) or stuck ⇒ run out, whatever it was doing ----
        if (f.activity !== "escaping") {
          if ((settling && d0 < CLEAR_OUT) || d0 < MIN_CLEAR) {
            flee();
            continue;
          }
          if (f.blockedSince !== null && now - f.blockedSince > BLOCKED_MS) {
            flee();
            continue;
          }
          if (now - f.anchorAt > STALL_MS) {
            const moved = Math.hypot(f.x - f.anchorX, f.y - f.anchorY);
            f.anchorX = f.x;
            f.anchorY = f.y;
            f.anchorAt = now;
            const parked = (f.activity === "nibble" && f.sub === "wait") || (f.activity === "windup" && f.sub === "coil");
            if (moved < STALL_PX && f.speed > 1 && !parked) {
              flee();
              continue;
            }
          }
        }

        // ---- hop wind-up: retreat to the anchor, then coil facing the wall ----
        if (f.activity === "windup") {
          const wall = f.jump!.wall;
          const dir = WALL_DIR[wall];
          const faceWall = Math.atan2(dir[1], dir[0]);
          if (f.sub === "retreat") {
            const dx = f.restX - f.x, dy = f.restY - f.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d < 8 || now > f.phaseUntil) {
              f.sub = "coil";
              f.phaseStart = now;
              f.phaseUntil = now + rand(COIL_MIN_MS, COIL_MAX_MS);
            } else {
              turnToward(f, Math.atan2(dy, dx), TURN_RATE_FLEEING, dt);
              f.speed += (f.baseSpeed * 0.8 - f.speed) * Math.min(1, SPEED_EASE * dt);
              stepTo(f.x + Math.cos(f.heading) * f.speed * dt, f.y + Math.sin(f.heading) * f.speed * dt);
            }
            writeTransform(f, now);
            writeBeat(f, false);
            continue;
          }
          // coil: square up to the wall, come to a stop, drift back a few px,
          // tail thrashing
          const dur = f.phaseUntil - f.phaseStart;
          const k = clamp((now - f.phaseStart) / dur, 0, 1);
          turnToward(f, faceWall, TURN_RATE_CHARGE, dt);
          f.speed += (0 - f.speed) * Math.min(1, 6 * dt);
          const drift = (COIL_DRIFT / (dur / 1000)) * dt;
          stepTo(f.x + Math.cos(f.heading) * f.speed * dt - dir[0] * drift, f.y + Math.sin(f.heading) * f.speed * dt - dir[1] * drift);
          setCoil(f, true);
          writeTransform(f, now);
          writeBeat(f, true);
          if (k >= 1) {
            setCoil(f, false);
            f.activity = "charge";
            f.phaseUntil = now + CHARGE_TIMEOUT_MS;
          }
          continue;
        }

        // ---- charge: burst dead-straight at the wall, leap on reaching it ----
        if (f.activity === "charge") {
          const wall = f.jump!.wall;
          const dir = WALL_DIR[wall];
          const horizontal = wall === "left" || wall === "right";
          let fx = dir[0] * 6, fy = dir[1] * 6;
          const td = textDistAt(wl, f.x, f.y);
          if (td < AVOID_DIST) {
            const g = gradAt(wl, f.x, f.y, textDistAt);
            const k = (1 - td / AVOID_DIST) ** 2 * AVOID_STRENGTH;
            fx += g.x * k;
            fy += g.y * k;
          }
          turnToward(f, Math.atan2(fy, fx), TURN_RATE_CHARGE, dt);
          f.targetHeading = f.heading;
          f.speed = Math.min(f.baseSpeed * CHARGE_MAX_SPEED, f.speed + CHARGE_ACCEL * dt);
          stepTo(f.x + Math.cos(f.heading) * f.speed * dt, f.y + Math.sin(f.heading) * f.speed * dt);
          writeTransform(f, now);
          writeBeat(f, true);
          const toWall = toWallDist(pond, wall, f.x, f.y);
          if (toWall < LAUNCH_DIST || now > f.phaseUntil) {
            const dest = pondsRef.current.get(f.jump!.toPond);
            if (dest && toWall < LAUNCH_DIST) {
              // any along-wall miss just shifts the landing the same amount
              if (horizontal) f.jump!.landY += f.y - f.jump!.wallPoint;
              else f.jump!.landX += f.x - f.jump!.wallPoint;
              const a = toViewport(pond, f.x, f.y);
              const b = toViewport(dest, f.jump!.landX, f.jump!.landY);
              const dist = Math.hypot(b.x - a.x, b.y - a.y);
              emitRipple(pond.id, f.x, f.y, "splash", "small"); // takeoff: one small ripple
              f.flight = { x0: a.x, y0: a.y, x1: b.x, y1: b.y, t0: now, dur: clamp((dist / f.speed) * 1000, FLIGHT_MIN_MS, FLIGHT_MAX_MS), peak: rand(FLIGHT_PEAK_MIN, FLIGHT_PEAK_MAX) };
              f.pond = null;
              f.activity = "flying";
            } else {
              f.activity = "wander";
              f.jump = null;
            }
            bump();
          }
          continue;
        }

        // ---- bite choreography ----
        if (f.activity === "approach" || f.activity === "nibble" || f.activity === "take") {
          const b = pond.bait;
          if (!b || (pond.biteFish !== f.id && f.activity !== "take")) {
            f.activity = "wander";
          } else if (f.activity === "approach") {
            const dx = f.restX - f.x, dy = f.restY - f.y;
            const dist = Math.hypot(dx, dy) || 1;
            if (now > f.phaseUntil) {
              leave(f, pond); // couldn't get there (text in the way) — give up
              continue;
            }
            if (dist < 6) {
              f.activity = "nibble";
              f.sub = "wait";
              f.nibbles = Math.floor(rand(NIBBLE_MIN, NIBBLE_MAX + 1));
              f.phaseUntil = now + rand(NIBBLE_WAIT_MIN_MS, NIBBLE_WAIT_MAX_MS);
            } else {
              let fx = (dx / dist) * APPROACH_STRENGTH, fy = (dy / dist) * APPROACH_STRENGTH;
              if (d0 < AVOID_DIST) {
                const g = gradAt(wl, f.x, f.y, dist2);
                const k = (1 - d0 / AVOID_DIST) ** 2 * AVOID_STRENGTH;
                fx += g.x * k;
                fy += g.y * k;
              }
              f.targetHeading = lerpAngle(f.targetHeading, Math.atan2(fy, fx), HEADING_SMOOTH);
              turnToward(f, f.targetHeading, TURN_RATE, dt);
              const target = f.baseSpeed * APPROACH_SPEED * clamp(dist / 40, 0.35, 1);
              f.speed += (target - f.speed) * Math.min(1, SPEED_EASE * dt);
              stepTo(f.x + Math.cos(f.heading) * f.speed * dt, f.y + Math.sin(f.heading) * f.speed * dt);
              writeTransform(f, now);
              writeBeat(f, false);
              continue;
            }
          }
          if (b && f.activity === "nibble") {
            // face the cursor; lunge until the nose just touches it, ease back, wait
            turnToward(f, Math.atan2(b.y - f.y, b.x - f.x), TURN_RATE_FLEEING, dt);
            f.targetHeading = f.heading;
            const reach = 1 - NIBBLE_REACH / REST_DIST; // fraction of rest→cursor a nibble covers
            // exact choreography: if the walls refuse a point, the spot was bad — just lose interest
            const at = (k: number) => stepTo(f.restX + (b.x - f.restX) * k, f.restY + (b.y - f.restY) * k);
            if (f.sub === "wait") {
              if (!at(0)) { leave(f, pond); continue; }
              if (now > f.phaseUntil) {
                f.sub = "lunge";
                f.phaseStart = now;
              }
            } else if (f.sub === "lunge") {
              const t = Math.min(1, (now - f.phaseStart) / NIBBLE_LUNGE_MS);
              if (!at(reach * t)) { leave(f, pond); continue; }
              if (t >= 1) {
                f.sub = "back";
                f.phaseStart = now;
                emitRipple(pond.id, b.x, b.y, "splash", "small");
              }
            } else {
              const t = Math.min(1, (now - f.phaseStart) / NIBBLE_BACK_MS);
              if (!at(reach * (1 - t))) { leave(f, pond); continue; }
              if (t >= 1) {
                f.nibbles -= 1;
                if (f.nibbles > 0) {
                  f.sub = "wait";
                  f.phaseUntil = now + rand(NIBBLE_WAIT_MIN_MS, NIBBLE_WAIT_MAX_MS);
                } else if (Math.random() < TAKE_CHANCE) {
                  // going for it: swimming over the cursor IS the catch
                  f.activity = "take";
                  f.phaseStart = now;
                  f.restX = f.x;
                  f.restY = f.y;
                  f.escape = { x: b.x, y: b.y };
                } else {
                  leave(f, pond);
                }
              }
            }
            f.speed = f.sub === "wait" ? 0 : f.baseSpeed * 2;
            writeTransform(f, now);
            writeBeat(f, f.sub !== "wait");
            continue;
          }
          if (f.activity === "take") {
            const to = f.escape!;
            const t = Math.min(1, (now - f.phaseStart) / TAKE_MS);
            if (!stepTo(f.restX + (to.x - f.restX) * t, f.restY + (to.y - f.restY) * t)) {
              f.activity = "wander"; // the cursor sits somewhere the walls won't allow — call it off
              f.escape = null;
              endBite(pond);
              continue;
            }
            turnToward(f, Math.atan2(to.y - f.restY, to.x - f.restX), TURN_RATE_CHARGE, dt);
            f.targetHeading = f.heading;
            f.speed = f.baseSpeed * 2;
            writeTransform(f, now);
            writeBeat(f, true);
            if (t >= 1) {
              f.escape = null;
              catchFish(f, pond);
            }
            continue;
          }
        }

        // ---- fleeing to open water (trapped, stuck, or arriving): fast, tail
        // thrashing, steering toward the target and away from the wall. Locked
        // walls let it slide out but never deeper; while settling it may pass
        // straight through text — the point is just to get out.
        if (f.activity === "escaping") {
          const e = f.escape!;
          const dist = Math.hypot(e.x - f.x, e.y - f.y);
          if (dist < 6 || (d0 >= ESCAPE_CLEAR && inView(pond, f.x, f.y))) {
            f.activity = "wander";
            f.escape = null;
            f.targetHeading = f.heading; // keep going the way it got out
            f.anchorX = f.x;
            f.anchorY = f.y;
            f.anchorAt = now;
            f.blockedSince = null;
          } else {
            const stuck = f.blockedSince !== null && now - f.blockedSince > BLOCKED_MS;
            if (now > f.phaseUntil || stuck) {
              // not getting there: one fresh target, then give up and re-enter
              if (f.sub === "wait") {
                f.sub = "back";
                f.phaseUntil = now + ESCAPE_TIMEOUT_MS;
                f.escape = nearestFree(wl, f.x, f.y, ESCAPE_CLEAR) ?? f.escape;
                f.blockedSince = null;
              } else {
                swimIn(f, pond);
                continue;
              }
            }
            let fx = e.x - f.x, fy = e.y - f.y;
            const dd = Math.hypot(fx, fy) || 1;
            fx /= dd;
            fy /= dd;
            const g = gradAt(wl, f.x, f.y, dist2);
            fx += g.x * 0.8;
            fy += g.y * 0.8;
            turnToward(f, Math.atan2(fy, fx), TURN_RATE_FLEEING, dt);
            f.targetHeading = f.heading;
            f.speed = f.baseSpeed * ESCAPE_SPEED;
            stepTo(f.x + Math.cos(f.heading) * f.speed * dt, f.y + Math.sin(f.heading) * f.speed * dt);
            writeTransform(f, now);
            writeBeat(f, true);
            continue;
          }
        }

        // ---- normal wander ----
        f.wander += (Math.random() - 0.5) * WANDER_JITTER;
        f.wander -= f.wander * WANDER_DECAY * dt;
        f.wander = clamp(f.wander, -WANDER_MAX, WANDER_MAX);
        let fx = Math.cos(f.heading + f.wander * WANDER_STRENGTH);
        let fy = Math.sin(f.heading + f.wander * WANDER_STRENGTH);

        let fleeing = false;
        for (const r of ripplesRef.current) {
          if (r.pond !== pond.id || r.kind !== "scare") continue;
          const radius = r.size === "small" ? SCARE_RADIUS_SMALL : SCARE_RADIUS;
          const dx = f.x - r.x, dy = f.y - r.y;
          const dist = Math.hypot(dx, dy);
          if (dist < radius && dist > 1) {
            if (r.size !== "small") fleeing = true;
            const strength = (1 - dist / radius) * (r.size === "small" ? FLEE_STRENGTH_SMALL : FLEE_STRENGTH);
            fx += (dx / dist) * strength;
            fy += (dy / dist) * strength;
          }
        }

        // open pond: past the edge there's a gentle pull back toward the
        // screen, so most strays turn around and only some actually leave
        if (pond.edges === "open") {
          const ov = outOfView(pond, f.x, f.y);
          if (ov > 0) {
            const cx = pond.scrollX + pond.vw / 2, cy = pond.scrollY + pond.vh / 2;
            const d = Math.hypot(cx - f.x, cy - f.y) || 1;
            fx += ((cx - f.x) / d) * AWAY_PULL;
            fy += ((cy - f.y) / d) * AWAY_PULL;
          }
        }

        // walls (+ edges for panels): one continuous push away from whatever
        // is nearest, plus a look-ahead that turns toward the more open side
        if (d0 < AVOID_DIST) {
          const g = gradAt(wl, f.x, f.y, dist2);
          const k = (1 - d0 / AVOID_DIST) ** 2 * AVOID_STRENGTH;
          fx += g.x * k;
          fy += g.y * k;
        }
        const ahead = dist2(wl, f.x + Math.cos(f.heading) * LOOKAHEAD, f.y + Math.sin(f.heading) * LOOKAHEAD);
        if (ahead < AVOID_DIST) {
          const l = f.heading - Math.PI / 4, r = f.heading + Math.PI / 4;
          const dl = dist2(wl, f.x + Math.cos(l) * LOOKAHEAD, f.y + Math.sin(l) * LOOKAHEAD);
          const dr = dist2(wl, f.x + Math.cos(r) * LOOKAHEAD, f.y + Math.sin(r) * LOOKAHEAD);
          const side = dl > dr ? l : r;
          const k = (1 - Math.max(0, ahead) / AVOID_DIST) * LOOKAHEAD_STRENGTH;
          fx += Math.cos(side) * k;
          fy += Math.sin(side) * k;
        }

        f.targetHeading = lerpAngle(f.targetHeading, Math.atan2(fy, fx), HEADING_SMOOTH);
        turnToward(f, f.targetHeading, fleeing ? TURN_RATE_FLEEING : TURN_RATE, dt);

        // ease off next to a wall so a brush is a glide, not a bounce; speed
        // relaxes toward the target so a landing glide or flee tapers off
        const targetSpeed = f.baseSpeed * clamp(d0 / AVOID_DIST, 0.4, 1) * (fleeing ? 1.4 : 1);
        f.speed += (targetSpeed - f.speed) * Math.min(1, SPEED_EASE * dt);
        stepTo(f.x + Math.cos(f.heading) * f.speed * dt, f.y + Math.sin(f.heading) * f.speed * dt);
        writeTransform(f, now);
        writeBeat(f, fleeing);
      }

      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const api = useMemo<PondApi>(
    () => ({
      fishRef,
      pondIds,
      renderTick,
      ripples,
      caught,
      registerPond,
      unregisterPond,
      refreshWalls,
      pointerMove,
      pointerLeave,
      pointerClick,
      notifyPopEnd,
      getPond,
    }),
    [pondIds, renderTick, ripples, caught, registerPond, unregisterPond, refreshWalls, pointerMove, pointerLeave, pointerClick, notifyPopEnd, getPond],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export type { Activity };
