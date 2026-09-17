import { useEffect, useRef, useState } from "react";

interface Caught {
  common: number;
  rare: number;
}

/**
 * The GMK Mizu deskmat koi, top-down, facing right in a 44×24 box: a white
 * body with a light-blue outline, a round light-blue spot on the head,
 * swept-back pectoral fins, a small dorsal, a long forked flowing tail and
 * two little barbels. The rare one is the deskmat's second koi — the same
 * drawing as navy-bodied line art. Three nested groups let it bend:
 * `koi-arch` (leap), `koi-rear` (swim sway), `koi-tail` (lags a quarter
 * beat); pectorals carry `koi-fin`. Colours are the koi-* tokens, never
 * re-scoped, so a fish looks the same on the desk and in a panel.
 */
export function FishIcon({
  className,
  rare = false,
  onAnimationEnd,
}: {
  className?: string;
  rare?: boolean;
  onAnimationEnd?: React.AnimationEventHandler<SVGSVGElement>;
}) {
  const body = rare ? "fill-koi-deep stroke-koi-light" : "fill-white stroke-koi-light";
  const fin = body;
  const spot = "fill-koi-light";

  return (
    <svg
      viewBox="0 0 44 24"
      className={`overflow-visible ${className ?? ""}`}
      onAnimationEnd={onAnimationEnd}
      strokeWidth={0.9}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <g className="koi-arch">
        <g className="koi-rear">
          <g className="koi-tail">
            {/* long forked tail with a wavy trailing edge */}
            <path className={fin} d="M13 12C10 10.5 7 8.5 4.5 5.5C2.5 3.5 1 4 1.5 5.5C3 8 4 10 3.5 12C4 14 3 16 1.5 18.5C1 20 2.5 20.5 4.5 18.5C7 15.5 10 13.5 13 12Z" />
          </g>
          {/* rear body — tucks under the front so the joint never shows */}
          <path className={body} d="M25 6C20 6.2 15.5 9 12 12C15.5 15 20 17.8 25 18Z" />
          {/* small dorsal fin */}
          <path className={fin} d="M17 12C19 11.4 21.5 11.4 24 12C21.5 12.6 19 12.6 17 12Z" />
        </g>
      </g>
      {/* front body + head */}
      <path className={body} d="M42.5 12C42.5 8.6 37.5 5.5 30.5 5.5C27.5 5.5 24.8 5.7 22 6.2L22 17.8C24.8 18.3 27.5 18.5 30.5 18.5C37.5 18.5 42.5 15.4 42.5 12Z" />
      {/* the deskmat's round head spot */}
      <circle cx="35" cy="12" r="2.6" className={spot} />
      {/* swept-back pectoral fins */}
      <path className={`koi-fin koi-fin-top ${fin}`} d="M31 6C30 3.5 27 2.2 25.5 3C27.5 4 29 5.2 31 6Z" />
      <path className={`koi-fin koi-fin-bottom ${fin}`} d="M31 18C30 20.5 27 21.8 25.5 21C27.5 20 29 18.8 31 18Z" />
      {/* barbels */}
      <path className="stroke-koi-light" fill="none" strokeWidth={0.7} d="M42 10.5C43.5 9.5 44 8.5 43.5 7.5M42 13.5C43.5 14.5 44 15.5 43.5 16.5" />
      {/* eyes */}
      <circle cx="39.5" cy="9.8" r="0.8" className="fill-koi-light" />
      <circle cx="39.5" cy="14.2" r="0.8" className="fill-koi-light" />
    </svg>
  );
}

/** Lives at the end of the dock. The popover opens upward (the dock sits at
 * the bottom) and closes on any click elsewhere, Escape, or the dock tucking
 * away — it must never linger over a panel. */
export function CatchBadge({ caught, revealed }: { caught: Caught; revealed: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const total = caught.common + caught.rare;

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [open]);

  if (open && !revealed) setOpen(false); // derive-on-change during render: tucked dock ⇒ closed popover

  return (
    <div ref={rootRef} className="relative text-left text-xs">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title="Fish caught"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-mizu-foam transition-colors hover:bg-mizu-cap/10"
      >
        <FishIcon className="h-4 w-7" />
        <span key={total} className="animate-count-pop inline-block font-medium">
          {total}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-2 min-w-36 rounded-md border border-mizu-cap/30 bg-mizu-surface/95 p-2.5 shadow-[0_8px_24px_-8px_rgba(36,43,59,0.5)] backdrop-blur">
          <div className="flex items-center justify-between gap-4 text-mizu-deep">
            <span>common</span>
            <span className="text-mizu-foam">{caught.common}</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-4">
            <span className="text-mizu-bright">rare</span>
            <span className="text-mizu-foam">{caught.rare}</span>
          </div>
        </div>
      )}
    </div>
  );
}
