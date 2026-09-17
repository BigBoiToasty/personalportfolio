import { useEffect, useRef } from "react";
import { usePondCtx } from "./PondContext";
import type { PondId } from "./types";

/**
 * Registers a scroll container as a pond. Attach `ref` + the pointer handlers
 * to the scroller and `layerRef` to an empty `absolute inset-0` div placed
 * *inside* its scrolled content (last child, so it paints above the text) —
 * that's where this pond's fish get portalled. `obstacles` turns on text
 * walls; `enabled: false` (prefers-reduced-motion) skips registration so no
 * fish ever enter.
 */
export function usePond(id: PondId, opts?: { obstacles?: boolean; enabled?: boolean; edges?: "wall" | "open" }) {
  const ctx = usePondCtx();
  const elRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const enabled = opts?.enabled ?? true;
  const obstacles = opts?.obstacles ?? false;
  const edges = opts?.edges ?? "wall";

  useEffect(() => {
    if (!enabled) return;
    const el = elRef.current, layer = layerRef.current;
    if (!el || !layer) return;
    ctx.registerPond(id, el, layer, { obstacles, edges });

    // walls only change when layout/content does — never on scroll, since
    // everything lives in content coordinates
    let queued = 0;
    const refresh = () => {
      clearTimeout(queued);
      queued = window.setTimeout(() => ctx.refreshWalls(id), 0);
    };
    const ro = new ResizeObserver(refresh);
    ro.observe(el);
    if (layer.parentElement) ro.observe(layer.parentElement);
    const mo = new MutationObserver((records) => {
      if (records.some((r) => !layer.contains(r.target))) refresh();
    });
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    document.fonts.ready.then(refresh);
    window.addEventListener("resize", refresh);
    return () => {
      clearTimeout(queued);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", refresh);
      ctx.unregisterPond(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, obstacles, enabled, edges]);

  return {
    ref: elRef,
    layerRef,
    onMouseMove: enabled ? (e: React.MouseEvent) => ctx.pointerMove(id, e.clientX, e.clientY) : undefined,
    onMouseLeave: enabled ? () => ctx.pointerLeave(id) : undefined,
    onClick: enabled ? (e: React.MouseEvent) => ctx.pointerClick(id, e.clientX, e.clientY) : undefined,
  };
}
