"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DOC_GROUPS, DOC_ORDER } from "@/lib/docs";

export function DocsSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the page changes.
  useEffect(() => setOpen(false), [pathname]);

  const current = DOC_ORDER.find((d) => d.href === pathname)?.title ?? "Docs";

  return (
    <>
      <button
        type="button"
        className="menu-btn"
        aria-expanded={open}
        aria-controls="docs-sidebar"
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">{open ? "×" : "≡"}</span>
        {open ? "Close menu" : current}
      </button>
      <aside id="docs-sidebar" className={`sidebar${open ? " open" : ""}`} aria-label="Docs">
        {DOC_GROUPS.map((g) => (
          <div key={g.title}>
            <p className="group-title">{g.title}</p>
            {g.links.map((l) => (
              <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
                {l.title}
              </Link>
            ))}
          </div>
        ))}
      </aside>
    </>
  );
}
