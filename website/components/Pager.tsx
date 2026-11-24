import Link from "next/link";
import { DOC_ORDER } from "@/lib/docs";

export function Pager({ current }: { current: string }) {
  const i = DOC_ORDER.findIndex((d) => d.href === current);
  const prev = i > 0 ? DOC_ORDER[i - 1] : undefined;
  const next = i >= 0 && i < DOC_ORDER.length - 1 ? DOC_ORDER[i + 1] : undefined;

  return (
    <nav className="pager" aria-label="Previous and next page">
      {prev && (
        <Link href={prev.href}>
          <span className="dir">← Previous</span>
          {prev.title}
        </Link>
      )}
      {next && (
        <Link href={next.href} className="next">
          <span className="dir">Next →</span>
          {next.title}
        </Link>
      )}
    </nav>
  );
}

/** Wraps a docs page: breadcrumb, title, lede, body and the pager. */
export function DocPage({
  href,
  group,
  title,
  lede,
  children,
}: {
  href: string;
  group: string;
  title: string;
  lede: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="doc-inner">
      <p className="crumb">{group}</p>
      <h1>{title}</h1>
      <p className="lede">{lede}</p>
      {children}
      <Pager current={href} />
    </article>
  );
}
