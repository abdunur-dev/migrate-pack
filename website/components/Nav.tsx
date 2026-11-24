"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { GITHUB_URL } from "@/lib/docs";
import { ThemeToggle } from "./ThemeToggle";

export function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="12" y="12" width="9" height="9" fill="currentColor" />
      <path d="M10 5.5h6.5V12" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const inDocs = pathname.startsWith("/docs");

  return (
    <header className={`nav${scrolled || inDocs ? " scrolled" : ""}`}>
      <div className="wrap">
        <div className="frame">
          <Link className="brand" href="/" aria-label="migrate-pack home">
            <Logo />
            migrate-pack
          </Link>
          <div className="nav-right">
            <nav className="nav-links" aria-label="Main">
              <Link href="/docs" aria-current={inDocs ? "page" : undefined}>
                Docs
              </Link>
              <Link href="/docs/rules" className="hide-sm">
                Rules
              </Link>
              <a href={GITHUB_URL}>GitHub</a>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
