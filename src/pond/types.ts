import type { Walls } from "./walls";

export type PondId = string;

export type Activity =
  | "wander"
  | "approach" // swimming up to the idle cursor
  | "nibble" // parked in front of it, nosing at the pointer a few times
  | "take" // swimming over the cursor — that IS the catch
  | "escaping" // trapped or off-pond: heading for open water
  | "windup" // hop: back off, face the wall, coil
  | "charge" // hop: burst straight at the wall
  | "flying";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A pond is a scroll container. Fish live in its *content* space (scroll px),
 * rendered through a portal into `layerEl` inside the scrolled content, so
 * the browser scrolls and clips them together with the text for free.
 */
export interface Pond {
  id: PondId;
  el: HTMLElement; // the scroller
  layerEl: HTMLElement; // absolutely-positioned fish layer inside the scroll content
  collectObstacles: boolean;
  edges: "wall" | "open"; // open: fish may swim off the edges (home); wall: hard pond edges (panels)
  rect: Rect; // viewport px of the visible window (re-measured every frame)
  vw: number; // visible window size (clientWidth/Height) in content px
  vh: number;
  scrollX: number;
  scrollY: number;
  walls: Walls; // distance field over the full content area — also holds content w/h
  // settle → clear → lock: after every wall rebuild the walls are known but
  // not enforced; fish under text run out; once none overlap, the walls lock
  // and nothing can move into text again
  wallsLocked: boolean;
  settleStart: number; // -1 = pending (stamped by the next tick)
  bait: { x: number; y: number } | null; // content px, last pointer spot
  lastMoveAt: number;
  biteFish: number | null; // the fish currently working the cursor
  biteCooldownUntil: number;
  targetCount: number;
}

export interface JumpPlan {
  toPond: PondId;
  wall: "left" | "right" | "top" | "bottom";
  wallPoint: number; // content px along the wall, in the axis parallel to `wall`
  landX: number; // dest content px
  landY: number;
}

export interface FishSim {
  id: number;
  el: HTMLDivElement | null; // ground-track element: [shadow, sprite]
  pond: PondId | null; // null while flying (rendered in the overlay layer, viewport px) or away
  x: number;
  y: number;
  heading: number; // radians
  targetHeading: number; // low-passed steering target — the thing heading turns toward
  wander: number;
  speed: number;
  baseSpeed: number;
  phase: number; // tail-beat phase (radians), advanced by the sim at a speed-driven rate
  rare: boolean;
  catching: boolean;
  activity: Activity;
  sub: "retreat" | "coil" | "wait" | "lunge" | "back"; // phase within windup / nibble
  phaseStart: number;
  phaseUntil: number;
  nibbles: number; // nibbles left before the fish decides
  restX: number; // parked spot (bite rest / coil anchor)
  restY: number;
  startAt: number;
  started: boolean;
  awayUntil: number | null; // home fish that swam off-screen comes back after this
  // stuck detection while wandering: when the move-safety rule started
  // refusing steps, and where it was ~400ms ago (jittering in place)
  blockedSince: number | null;
  anchorX: number;
  anchorY: number;
  anchorAt: number;
  jump: JumpPlan | null;
  flight: { x0: number; y0: number; x1: number; y1: number; t0: number; dur: number; peak: number } | null;
  surfaceUntil: number; // after a dive: resurfacing until this time
  submerged: boolean; // sprite currently dimmed/shrunk (so it's reset exactly once)
  escape: { x: number; y: number } | null; // nearest open water while "escaping"; the point to leave from while "leave"
  // last known viewport position while unassigned (pond === null) — lets a
  // fish reclaim the same spot instantly if a pond still covers it
  orphanX: number | null;
  orphanY: number | null;
}

export interface Ripple {
  id: number;
  pond: PondId;
  x: number; // content px
  y: number;
  t: number;
  kind: "scare" | "splash";
  size: "small" | "normal" | "big";
}
