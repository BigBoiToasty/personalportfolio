import { useEffect, useState } from "react";
import Dock from "./components/Dock";
import Home from "./components/Home";
import WindowManager, { type PaneSpec } from "./components/WindowManager";
import { APPS, APP_MAP, type AppId } from "./apps/registry";
import { PondProvider } from "./pond/PondContext";
import FishLayer from "./pond/FishLayer";

const EXIT_MS = 180; // keep in sync with --animate-pane-out in index.css

export default function App() {
  const [open, setOpen] = useState<AppId[]>([]);
  const [closing, setClosing] = useState<AppId[]>([]);

  function toggle(id: AppId) {
    if (!open.includes(id)) {
      // cap the grid at 4; a 5th click evicts the oldest
      setOpen((o) => [...o, id].slice(-4));
      return;
    }
    setClosing((c) => [...c, id]);
    window.setTimeout(() => {
      setOpen((o) => o.filter((x) => x !== id));
      setClosing((c) => c.filter((x) => x !== id));
    }, EXIT_MS);
  }

  // keys 1-4 toggle the matching window, Escape closes everything
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") return setOpen([]);
      const n = Number(e.key);
      if (n >= 1 && n <= APPS.length) toggle(APPS[n - 1].id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // toggle closes over `open`; re-bind when it changes
  }, [open]);

  const panes: PaneSpec[] = open.map((id) => {
    const app = APP_MAP[id];
    const Content = app.Component;
    return {
      id,
      title: app.label,
      icon: app.icon,
      path: `~/${id}`,
      content: <Content />,
      closing: closing.includes(id),
    };
  });

  return (
    <PondProvider>
      <main className="relative h-full w-full overflow-hidden bg-mizu-abyss">
        {open.length === 0 ? (
          <Home />
        ) : (
          <WindowManager panes={panes} onClose={(id) => toggle(id as AppId)} />
        )}
        <FishLayer />
        <Dock open={open} onToggle={toggle} docked={open.length > 0} />
      </main>
    </PondProvider>
  );
}
