import Tags, { LINK } from "./Tags";

type Link = { label: string; href: string };
const gh = (href: string): Link => ({ label: "GitHub", href });
const devpost = (href: string): Link => ({ label: "Devpost", href });

const PROJECTS: { name: string; badge?: string; links: Link[]; body: string; tags: string[] }[] = [
  {
    name: "Peter Parks",
    badge: "Finalist out of 300, Inrix Hack 2024",
    links: [devpost("https://devpost.com/software/parking-kjx41u"), gh("https://github.com/nikashs26/AI-Hack-2024")],
    body: "Real-time parking availability from live security camera feeds. I built the Express backend and the AWS Rekognition vehicle-detection pipeline.",
    tags: ["Express", "React", "Flask", "AWS"],
  },
  {
    name: "EduDeals",
    badge: "UC Berkeley AI Hackathon 2026",
    links: [devpost("https://devpost.com/software/edudeals"), gh("https://github.com/oh-a-cai/edudeals")],
    body: "A student-discount aggregator with 100+ deals per school. I built the Gemini-powered scraping pipeline that sources all the data.",
    tags: ["Python", "Gemini API", "React", "Supabase"],
  },
  {
    name: "Mush",
    links: [gh("https://github.com/BigBoiToasty/Mush")],
    body: "A full-stack card collection app that handles thousands of cards per user, self-hosted on a 13TB server.",
    tags: ["Svelte", "Supabase"],
  },
  {
    name: "Cabo",
    links: [gh("https://github.com/BigBoiToasty/Cabo")],
    body: "A real-time multiplayer card game with private rooms, turn enforcement and server-side game state.",
    tags: ["React", "Node.js", "Socket.io"],
  },
  {
    name: "Chorely",
    links: [gh("https://github.com/tianyudong16/ChoreApp")],
    body: "An iOS app for assigning and tracking household chores, with real-time sync across devices.",
    tags: ["Swift", "Firebase"],
  },
];

export default function Projects() {
  return (
    <article className="mx-auto max-w-2xl px-8 py-8 text-[15px] leading-relaxed text-mizu-foam/90">
      <h1 className="font-display text-xl font-semibold text-mizu-foam">Projects</h1>

      {PROJECTS.map((p) => (
        <section key={p.name} className="mt-7">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <h2 className="font-display text-lg font-semibold text-mizu-foam">{p.name}</h2>
            <span className="flex gap-3 text-sm">
              {p.links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className={LINK}>
                  {l.label} ↗
                </a>
              ))}
            </span>
          </div>
          {p.badge && <p className="text-sm text-mizu-deep">{p.badge}</p>}
          <p className="mt-2 text-mizu-foam/85">{p.body}</p>
          <Tags items={p.tags} />
        </section>
      ))}
    </article>
  );
}
