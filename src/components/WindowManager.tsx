import type { ReactNode } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { usePond } from "../pond/usePond";
import { useReducedMotion } from "../pond/useReducedMotion";

export interface PaneSpec {
  id: string;
  /** app name shown in the title bar */
  title: string;
  /** app icon shown before the name */
  icon?: ReactNode;
  /** muted path hint, e.g. ~/professional */
  path?: string;
  content: ReactNode;
  closing?: boolean;
}

interface WindowManagerProps {
  panes: PaneSpec[];
  onClose: (id: string) => void;
}

/**
 * Content-agnostic tiling layout engine.
 * Knows nothing about the portfolio — hand it panes, it tiles them.
 * ponytail: four fixed cases beat a recursive split tree; there are only ever four.
 */
export default function WindowManager({ panes, onClose }: WindowManagerProps) {
  // key resets panel sizes whenever the set of panes changes, so a new pane
  // doesn't inherit a stale percentage from the previous layout.
  const groupKey = panes.map((p) => p.id).join();
  const p = (i: number) => <Pane pane={panes[i]} onClose={onClose} />;

  if (panes.length === 0) return <div className="h-full w-full" />;

  if (panes.length === 1) {
    return <div className="h-full w-full p-2">{p(0)}</div>;
  }

  if (panes.length === 2) {
    return (
      <PanelGroup key={groupKey} direction="horizontal" className="p-2">
        <Panel defaultSize={50} minSize={20}>
          {p(0)}
        </Panel>
        <Handle dir="horizontal" />
        <Panel defaultSize={50} minSize={20}>
          {p(1)}
        </Panel>
      </PanelGroup>
    );
  }

  if (panes.length === 3) {
    // sidebar + stacked pair
    return (
      <PanelGroup key={groupKey} direction="horizontal" className="p-2">
        <Panel defaultSize={50} minSize={20}>
          {p(0)}
        </Panel>
        <Handle dir="horizontal" />
        <Panel defaultSize={50} minSize={20}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={50} minSize={15}>
              {p(1)}
            </Panel>
            <Handle dir="vertical" />
            <Panel defaultSize={50} minSize={15}>
              {p(2)}
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    );
  }

  // 4 → 2x2 grid
  return (
    <PanelGroup key={groupKey} direction="vertical" className="p-2">
      <Panel defaultSize={50} minSize={15}>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={50} minSize={20}>
            {p(0)}
          </Panel>
          <Handle dir="horizontal" />
          <Panel defaultSize={50} minSize={20}>
            {p(1)}
          </Panel>
        </PanelGroup>
      </Panel>
      <Handle dir="vertical" />
      <Panel defaultSize={50} minSize={15}>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={50} minSize={20}>
            {p(2)}
          </Panel>
          <Handle dir="horizontal" />
          <Panel defaultSize={50} minSize={20}>
            {p(3)}
          </Panel>
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );
}

function Handle({ dir }: { dir: "horizontal" | "vertical" }) {
  const h = dir === "horizontal";
  return (
    <PanelResizeHandle
      className={`group relative flex shrink-0 items-center justify-center ${
        h ? "w-2" : "h-2"
      }`}
    >
      <div
        className={`bg-mizu-legend/50 transition-colors group-hover:bg-mizu-accent group-data-[resize-handle-active]:bg-mizu-cap ${
          h ? "h-10 w-1 rounded-full" : "h-1 w-10 rounded-full"
        }`}
      />
    </PanelResizeHandle>
  );
}

function Pane({
  pane,
  onClose,
}: {
  pane: PaneSpec;
  onClose: (id: string) => void;
}) {
  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden rounded-md border border-mizu-cap/40 bg-mizu-surface shadow-[0_12px_40px_-12px_rgba(36,43,59,0.5)] ${
        pane.closing ? "animate-pane-out" : "animate-pane-in"
      }`}
    >
      {/* title bar: a navy "modifier cap" with light legends — icon, name
          and path — so it's always obvious which panel this is */}
      <div className="flex items-center justify-between gap-3 border-b border-mizu-cap bg-mizu-cap px-3 py-2 text-mizu-legend">
        <div className="flex min-w-0 items-center gap-2">
          {pane.icon && <span className="flex shrink-0 items-center [&>svg]:h-4 [&>svg]:w-4">{pane.icon}</span>}
          <span className="truncate text-[13px] font-semibold">{pane.title}</span>
          {pane.path && <span className="truncate font-mono text-[11px] text-mizu-legend/70">{pane.path}</span>}
        </div>
        <button
          onClick={() => onClose(pane.id)}
          aria-label={`Close ${pane.title}`}
          className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-lg leading-none text-mizu-legend/70 transition-colors hover:bg-mizu-legend/15 hover:text-mizu-legend"
        >
          &times;
        </button>
      </div>

      <PaneWater id={pane.id}>{pane.content}</PaneWater>
    </div>
  );
}

/**
 * Registers this pane's scroller as a pond. The fish layer lives *inside*
 * the scrolled content, sized to the full scroll height — fish scroll and
 * clip with the text and are never drawn over the title bar. It sits
 * *under* the content (first child, content stacked above) so a fish can
 * never cover a word. The interior is the powder-blue alpha cap;
 * `pane-water` re-scopes the ripple colour to the rare koi navy.
 */
function PaneWater({ id, children }: { id: string; children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const pond = usePond(id, { obstacles: true, enabled: !reducedMotion });

  return (
    <div
      ref={pond.ref}
      onMouseMove={pond.onMouseMove}
      onMouseLeave={pond.onMouseLeave}
      onClick={pond.onClick}
      className="pane-water min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-mizu-surface"
    >
      <div className="relative min-h-full">
        <div ref={pond.layerRef} data-fish-layer className="pointer-events-none absolute inset-0 overflow-hidden" />
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}
