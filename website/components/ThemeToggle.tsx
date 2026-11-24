"use client";

function currentTheme(): "light" | "dark" {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = currentTheme() === "dark" ? "light" : "dark";
    root.classList.add("theming");
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("mp-theme", next);
    } catch {
      // Storage can be blocked; the theme still changes for this visit.
    }
    window.setTimeout(() => root.classList.remove("theming"), 350);
  }

  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label="Switch light or dark theme" title="Switch theme">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" />
      </svg>
    </button>
  );
}
