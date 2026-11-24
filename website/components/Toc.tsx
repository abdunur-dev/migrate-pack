"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface Heading {
  id: string;
  text: string;
}

/** "On this page": built from the page's h2 headings, highlighting the one being read. */
export function Toc() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLHeadingElement>(".doc h2[id]"));
    setHeadings(els.map((h) => ({ id: h.id, text: h.textContent ?? "" })));
    setActive(els[0]?.id ?? "");
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  if (headings.length === 0) return <aside className="toc" aria-hidden="true" />;

  return (
    <aside className="toc" aria-label="On this page">
      <p className="toc-title">On this page</p>
      <ol>
        {headings.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`} className={h.id === active ? "active" : undefined}>
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}
