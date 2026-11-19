/** Long-form page layout for About, Privacy and Terms. */
export function Prose({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="wrap max-w-3xl py-14 sm:py-20">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
      {intro && <div className="mt-4 text-lg leading-relaxed text-muted">{intro}</div>}
      <div className="mt-10 space-y-8 text-[0.95rem] leading-relaxed text-text [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_li]:mt-1.5 [&_p+p]:mt-3 [&_strong]:font-medium [&_strong]:text-ink [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
