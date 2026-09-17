import { useEffect, useRef, useState } from "react";
import { APPS, type AppId } from "../apps/registry";
import { usePondCtx } from "../pond/PondContext";
import { CatchBadge } from "./FishPond";

const PEEK_MS = 1500; // how long the tucked dock rises to show a new catch

interface DockProps {
  open: AppId[];
  onToggle: (id: AppId) => void;
  /** false → centered splash position, true → docked at the bottom */
  docked: boolean;
}

export default function Dock({ open, onToggle, docked }: DockProps) {
  // while a mouse button is held down *outside the dock* (text selection,
  // drag), don't let the dock's hover zone pop up or intercept the drag — a
  // selection ending near the bottom of the screen shouldn't get interrupted
  // or copy dock labels. A mousedown that starts ON the dock is a normal
  // click and must not trigger this, or the dock could never be clicked.
  const [draggingElsewhere, setDraggingElsewhere] = useState(false);
  // explicit state instead of CSS :hover — toggling pointer-events on this
  // element (below) doesn't reliably re-run the browser's hover hit-test,
  // which left the dock stuck open after a drag ended near it
  const [hovering, setHovering] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setDraggingElsewhere(true);
    };
    const up = () => setDraggingElsewhere(false);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  // the catch counter lives here (never over a panel); a new catch briefly
  // lifts a tucked-away dock so the +1 is actually seen
  const { caught } = usePondCtx();
  const total = caught.common + caught.rare;
  const [peek, setPeek] = useState({ total: 0, on: false });
  if (total !== peek.total) setPeek({ total, on: total > 0 }); // derive-on-change during render
  const peeking = peek.on;
  useEffect(() => {
    if (!peeking) return;
    const t = window.setTimeout(() => setPeek((p) => ({ ...p, on: false })), PEEK_MS);
    return () => clearTimeout(t);
  }, [peeking]);

  const revealable = docked && !draggingElsewhere;
  const revealed = revealable && (hovering || peeking);

  return (
    <div
      ref={rootRef}
      className={`pointer-events-none fixed left-1/2 z-50 -translate-x-1/2 transition-[bottom] duration-500 ease-out ${
        docked ? "bottom-0" : "bottom-[20%]"
      }`}
    >
      {/* extra headroom above the pill so hovering nearby (not just the lip
          itself) counts as "close enough" to reveal it — proximity, not
          pixel-perfect targeting */}
      <div
        className={`flex items-end justify-center ${revealable ? "pointer-events-auto h-24" : ""}`}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div
          className={`select-none flex items-center gap-2 rounded-xl border border-mizu-cap/30 bg-mizu-surface/95 p-2 shadow-[0_12px_40px_-12px_rgba(36,43,59,0.5)] backdrop-blur transition-transform duration-300 ease-out [@media(hover:none)]:translate-y-0 [@media(hover:none)]:pointer-events-auto ${
            revealable
              ? `pointer-events-auto focus-within:translate-y-0 ${revealed ? "translate-y-0" : "translate-y-[calc(100%-0.5rem)]"}`
              : docked
                ? "pointer-events-none translate-y-[calc(100%-0.5rem)]"
                : "pointer-events-auto"
          }`}
        >
          {APPS.map((app) => {
            const active = open.includes(app.id);
            return (
              <button
                key={app.id}
                onClick={(e) => {
                  onToggle(app.id);
                  // don't let a mouse click's lingering focus keep the dock
                  // pinned open — reveal should track the cursor, not clicks
                  e.currentTarget.blur();
                }}
                title={app.label}
                aria-pressed={active}
                className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-mizu-cap/15 hover:text-mizu-foam ${
                  active
                    ? "-translate-y-0.5 bg-mizu-cap/15 text-mizu-foam ring-1 ring-mizu-cap/40"
                    : "text-mizu-deep"
                }`}
              >
                {app.icon}
                <span className="text-[10px] font-medium tracking-wide">
                  {app.label}
                </span>
              </button>
            );
          })}
          {total > 0 && (
            <>
              <div className="mx-1 h-8 w-px bg-mizu-cap/25" />
              <CatchBadge caught={caught} revealed={!docked || revealed} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
