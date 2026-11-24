"use client";

/** Sets --mx / --my to the pointer position so CSS can draw a soft light that follows it. */
export function Spotlight({
  as = "div",
  className = "",
  id,
  children,
}: {
  as?: "div" | "section";
  className?: string;
  id?: string;
  children: React.ReactNode;
}) {
  function onMove(e: React.PointerEvent<HTMLElement>) {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }
  const Tag = as;
  return (
    <Tag className={className} id={id} onPointerMove={onMove}>
      {children}
    </Tag>
  );
}
