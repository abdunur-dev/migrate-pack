"use client";

import { useRef, useState } from "react";
import { CodeLines, type Line } from "./CodeBlock";

export interface CodeTab {
  id: string;
  label: string;
  lines: Line[];
}

/** Tabbed example window. Switching tabs remounts the panel, which replays the line animation. */
export function CodeTabs({ tabs, footLeft, footRight }: { tabs: CodeTab[]; footLeft: string; footRight: string }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: React.KeyboardEvent, i: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    if (next >= 0) {
      e.preventDefault();
      setActive(next);
      refs.current[next]?.focus();
    }
  }

  const tab = tabs[active];
  return (
    <div className="window enter" style={{ "--d": 3 } as React.CSSProperties}>
      <div className="tabs" role="tablist" aria-label="Example output">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="tab"
            role="tab"
            id={`tab-${t.id}`}
            aria-controls={`panel-${t.id}`}
            aria-selected={i === active}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`} key={tab.id}>
        <CodeLines lines={tab.lines} play />
      </div>
      <div className="window-foot">
        <span>{footLeft}</span>
        <span>{footRight}</span>
      </div>
    </div>
  );
}
