import { createPortal } from "react-dom";
import { usePondCtx } from "./PondContext";
import { FishIcon } from "../components/FishPond";
import type { Ripple } from "./types";

/**
 * Each pond's fish and ripples are portalled into that pond's own
 * layer div, which sits inside its scrolled content — so they scroll, clip
 * and animate (pane enter/exit) together with the text, no per-frame rect
 * math. Only fish mid-hop render here in the fixed overlay, in viewport px,
 * so they can arc across a pane divider. Positions are written imperatively
 * by PondContext's loop — this component only mounts/unmounts nodes.
 */
export default function FishLayer() {
  const { fishRef, pondIds, renderTick, ripples, notifyPopEnd, getPond } = usePondCtx();
  void renderTick; // subscribing is enough — forces a re-render when pond membership changes

  return (
    <>
      {pondIds.map((id) => {
        const pond = getPond(id);
        if (!pond) return null;
        return createPortal(
          <>
            {fishRef.current
              .filter((f) => f.pond === id)
              .map((f) => (
                <FishDom key={f.id} fishId={f.id} onPopEnd={notifyPopEnd} />
              ))}
            {ripples
              .filter((r) => r.pond === id)
              .map((r) => (
                <RippleSpan key={r.id} ripple={r} />
              ))}
          </>,
          pond.layerEl,
          id,
        );
      })}

      <div className="pointer-events-none fixed inset-0 z-20">
        {fishRef.current
          .filter((f) => f.activity === "flying")
          .map((f) => (
            <FishDom key={f.id} fishId={f.id} onPopEnd={notifyPopEnd} />
          ))}
      </div>
    </>
  );
}

/**
 * Ground-track element (translated/rotated by the sim) holding a water
 * shadow and the sprite. During a hop the sim lifts and scales the sprite
 * and shrinks/fades the shadow to sell the height from a top-down view.
 */
function FishDom({ fishId, onPopEnd }: { fishId: number; onPopEnd: (id: number) => void }) {
  const { fishRef } = usePondCtx();
  const f = fishRef.current.find((x) => x.id === fishId);
  if (!f) return null;

  return (
    <div
      ref={(el) => {
        f.el = el;
        if (el) {
          const deg = (f.heading * 180) / Math.PI;
          el.style.transform = `translate(-50%, -50%) translate(${f.x}px, ${f.y}px) rotate(${deg}deg)`;
          el.style.setProperty("--beat", f.beat);
        }
      }}
      aria-hidden
      className="pointer-events-none absolute top-0 left-0"
    >
      <div className="absolute top-1/2 left-1/2 h-4 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-mizu-foam/25 opacity-0 blur-[2px]" />
      <div className="relative">
        <FishIcon rare={f.rare} onAnimationEnd={() => onPopEnd(f.id)} className={`h-6 w-11 ${f.catching ? "animate-catch-pop" : ""}`} />
      </div>
    </div>
  );
}

const RIPPLE_SCALE = { small: 0.45, normal: 1, big: 1.7 } as const;

function RippleSpan({ ripple: r }: { ripple: Ripple }) {
  const small = r.size === "small";
  return (
    <span
      aria-hidden
      className={`animate-ripple pointer-events-none absolute rounded-full border-mizu-ripple ${small ? "border opacity-60" : "border-2 opacity-90"}`}
      style={{ left: r.x, top: r.y, transform: `translate(-50%, -50%) scale(${RIPPLE_SCALE[r.size]})` }}
    />
  );
}
