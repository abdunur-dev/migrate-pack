// A template remounts on every navigation, so the fade-in replays for each docs page.
export default function DocsTemplate({ children }: { children: React.ReactNode }) {
  return <div className="doc-fade">{children}</div>;
}
