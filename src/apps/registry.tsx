import type { ComponentType, ReactNode } from "react";
import Experience from "./Experience";
import Projects from "./Projects";
import Homelab from "./Homelab";
import About from "./About";

export type AppId = "experience" | "projects" | "homelab" | "about";

export interface AppDef {
  id: AppId;
  label: string;
  icon: ReactNode;
  Component: ComponentType;
}

/** The one place apps are declared. Swap this list to reuse the shell elsewhere. */
export const APPS: AppDef[] = [
  {
    id: "experience",
    label: "Experience",
    icon: <Glyph d="M4 7h16v13H4zM9 7V4h6v3" />,
    Component: Experience,
  },
  {
    id: "projects",
    label: "Projects",
    icon: <Glyph d="M8 8l-4 4 4 4M16 8l4 4-4 4M13 5l-2 14" />,
    Component: Projects,
  },
  {
    id: "homelab",
    label: "Homelab",
    icon: <Glyph d="M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01" />,
    Component: Homelab,
  },
  {
    id: "about",
    label: "About",
    icon: <Glyph d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />,
    Component: About,
  },
];

export const APP_MAP: Record<AppId, AppDef> = Object.fromEntries(
  APPS.map((a) => [a.id, a]),
) as Record<AppId, AppDef>;

function Glyph({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d={d} />
    </svg>
  );
}
