"use client";

import { useEffect, useRef, useState } from "react";

type State = "idle" | "hidden" | "shown";

/**
 * Fades a section in as it scrolls into view. Only content that starts below the fold is ever hidden,
 * and only after JS runs, so the first screen and no-JS visitors always see everything.
 */
export function Reveal({
  as = "section",
  className = "",
  id,
  children,
}: {
  as?: "section" | "div";
  className?: string;
  id?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setState("hidden");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cls = `${className}${state === "hidden" ? " reveal" : state === "shown" ? " reveal in" : ""}`;
  const Tag = as;
  const setRef = (el: HTMLElement | null) => {
    ref.current = el;
  };
  return (
    <Tag ref={setRef} className={cls} id={id}>
      {children}
    </Tag>
  );
}
