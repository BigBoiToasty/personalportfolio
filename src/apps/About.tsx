import Tags, { SECTION_LABEL } from "./Tags";

export default function About() {
  return (
    <article className="mx-auto max-w-2xl px-8 py-8 text-[15px] leading-relaxed text-mizu-foam/90">
      <h1 className="font-display text-xl font-semibold text-mizu-foam">About</h1>

      <p className="mt-4 text-mizu-foam/85">
        I'm a Computer Science student at Santa Clara University with a minor in Math, graduating
        December 2027. I like working where software meets hardware, whether that's testing AI
        hardware at Innodisk or running my own server rack at home.
      </p>
      <p className="mt-3 text-mizu-foam/85">
        Outside of code, I led a 20+ person trumpet section in marching band and tutor students in
        calculus.
      </p>

      <h2 className={`mt-8 ${SECTION_LABEL}`}>Currently</h2>
      <p className="text-mizu-foam/85">Looking for software engineering internships and new grad roles</p>

      <h2 className={`mt-6 ${SECTION_LABEL}`}>Skills</h2>
      <Tags items={["C/C++", "Python", "TypeScript", "Java", "Swift", "React", "Svelte", "Node.js", "AWS", "Docker", "PostgreSQL"]} />

      <a
        href="/Christopher-Le-Resume.pdf"
        download="Christopher-Le-Resume.pdf"
        className="mt-8 inline-block rounded-md bg-mizu-cap px-4 py-2 text-sm font-medium text-mizu-legend transition-colors hover:bg-mizu-cap/90"
      >
        Download Resume
      </a>
    </article>
  );
}
