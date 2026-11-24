"use client";

import { useRef, useState } from "react";

/** Copies `text`. If the clipboard is refused, selects the code in the surrounding block instead. */
export function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [label, setLabel] = useState("Copy");
  const timer = useRef<number | undefined>(undefined);

  function flash(next: string) {
    setLabel(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLabel("Copy"), 1600);
  }

  async function copy(e: React.MouseEvent<HTMLButtonElement>) {
    try {
      await navigator.clipboard.writeText(text);
      flash("Copied");
    } catch {
      const box = e.currentTarget.closest(".install, .codeblock");
      const target = box?.querySelector("code, pre");
      if (target) {
        const range = document.createRange();
        range.selectNodeContents(target);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      flash("Selected");
    }
  }

  return (
    <button type="button" className={`btn small copy ${className}`} onClick={copy} aria-live="polite">
      {label}
    </button>
  );
}
