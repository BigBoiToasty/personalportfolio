/** Small tech chips under a project / section. */
export default function Tags({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {items.map((t) => (
        <li key={t} className="rounded-full border border-mizu-dim px-2 py-0.5 text-xs text-mizu-deep">
          {t}
        </li>
      ))}
    </ul>
  );
}

export const LINK = "text-mizu-bright underline-offset-2 hover:underline";
export const SECTION_LABEL = "font-display mb-2 text-xs font-semibold uppercase tracking-widest text-mizu-bright/90";
