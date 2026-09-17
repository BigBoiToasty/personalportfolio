const ROLES = [
  {
    role: "Software Engineering Intern",
    org: "Innodisk",
    place: "Fremont, CA",
    dates: "Jun – Aug 2026",
    points: [
      "Validated Innodisk's APEX and AXMB AI solutions within a 50-person engineering department.",
      "Ran hundreds of diagnostic test cases across hardware configurations, catching memory leaks under sustained AI workloads and thermal limits before client deployment.",
      "Led a project that took apart 20+ legacy servers and reused their parts to build high-performance AI test environments.",
    ],
  },
  {
    role: "Software Engineering Intern",
    org: "Innodisk",
    place: "Fremont, CA",
    dates: "Jul – Sep 2023",
    points: [
      "Wrote 50+ automated test scripts and internal tools for SSD/HDD firmware, cutting manual testing time by 40%.",
      "Debugged storage drivers and firmware on Linux and Windows and logged 100+ critical pre-release defects.",
    ],
  },
  {
    role: "Underclassmen Representative",
    org: "Competitive Programming Club",
    place: "Santa Clara University",
    dates: "2024 – 2025",
    points: ["Ran 3 coding competitions and doubled turnout from 50 to 100+ attendees."],
  },
];

export default function Experience() {
  return (
    <article className="mx-auto max-w-2xl px-8 py-8 text-[15px] leading-relaxed text-mizu-foam/90">
      <h1 className="font-display text-xl font-semibold text-mizu-foam">Experience</h1>

      {ROLES.map((r) => (
        <section key={r.org + r.dates} className="mt-7">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-medium text-mizu-foam">
              {r.org} <span className="text-mizu-deep">·</span> {r.role}
            </h2>
            <span className="shrink-0 text-sm text-mizu-deep">{r.dates}</span>
          </div>
          <p className="text-sm text-mizu-deep">{r.place}</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-mizu-foam/85">
            {r.points.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
