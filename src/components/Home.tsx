import { usePond } from "../pond/usePond";
import { useReducedMotion } from "../pond/useReducedMotion";

const GITHUB_URL = "https://github.com/BigBoiToasty";
const LINKEDIN_URL = "https://www.linkedin.com/in/christopherle05/";
const EMAIL = "christopherle777@gmail.com";

export default function Home() {
  const reducedMotion = useReducedMotion();
  const pond = usePond("home", { enabled: !reducedMotion, edges: "open" }); // open: fish may swim off-screen and return

  return (
    <div
      ref={pond.ref}
      onMouseMove={pond.onMouseMove}
      onMouseLeave={pond.onMouseLeave}
      onClick={pond.onClick}
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      {/* fish layer first, content above it — fish swim behind the name, never over it */}
      <div ref={pond.layerRef} data-fish-layer className="pointer-events-none absolute inset-0" />

      <div className="relative z-10 -translate-y-12">
        <h1 className="font-display text-[clamp(2.25rem,9vw,6rem)] font-semibold tracking-tight whitespace-nowrap text-mizu-cap">
          Christopher Le
        </h1>
        <p className="mt-4 px-4 text-lg text-balance text-mizu-cap">
          CS @ Santa Clara · Building full-stack apps and the servers they run on
        </p>

        <div className="mt-6 flex items-center justify-center gap-5">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="text-mizu-cap/80 transition-all duration-200 hover:-translate-y-0.5 hover:text-mizu-cap"
          >
            <GitHubIcon />
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            className="text-mizu-cap/80 transition-all duration-200 hover:-translate-y-0.5 hover:text-mizu-cap"
          >
            <LinkedInIcon />
          </a>
          <a
            href={`mailto:${EMAIL}`}
            aria-label="Email"
            className="text-mizu-cap/80 transition-all duration-200 hover:-translate-y-0.5 hover:text-mizu-cap"
          >
            <EmailIcon />
          </a>
          <a
            href="/Christopher-Le-Resume.pdf"
            target="_blank"
            rel="noreferrer"
            aria-label="Resume"
            title="Resume"
            className="text-mizu-cap/80 transition-all duration-200 hover:-translate-y-0.5 hover:text-mizu-cap"
          >
            <ResumeIcon />
          </a>
        </div>
      </div>
    </div>
  );
}

function ResumeIcon() {
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
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.5 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.21-3.37-1.21-.46-1.19-1.11-1.51-1.11-1.51-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.11 2.91.85.09-.67.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05a9.34 9.34 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.95.68 1.92 0 1.39-.01 2.51-.01 2.85 0 .28.18.61.69.5C19.14 20.61 22 16.77 22 12.25 22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <path d="M6.94 8.5H3.56V20.5H6.94V8.5ZM5.25 3.5a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92ZM20.5 20.5v-6.6c0-3.53-1.89-5.17-4.4-5.17-2.03 0-2.94 1.12-3.44 1.9V8.5H9.28c.04.94 0 12 0 12h3.38v-6.7c0-.36.03-.72.13-.98.29-.72.94-1.47 2.04-1.47 1.44 0 2.02 1.1 2.02 2.71V20.5h3.65Z" />
    </svg>
  );
}

function EmailIcon() {
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}
