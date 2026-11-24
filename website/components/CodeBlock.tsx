import { CopyButton } from "./CopyButton";

export interface Line {
  t: string;
  c?: "add" | "del" | "dim" | "cmt" | "key" | "hl";
}

/** Turns plain text into lines; a leading "+ " / "- " marks added / removed lines when `diff` is set. */
export function toLines(code: string, diff = false): Line[] {
  return code.replace(/\n$/, "").split("\n").map((t) => {
    if (diff && t.startsWith("+")) return { t, c: "add" };
    if (diff && t.startsWith("-")) return { t, c: "del" };
    if (t.trimStart().startsWith("#")) return { t, c: "cmt" };
    return { t };
  });
}

export function CodeLines({ lines, play = false }: { lines: Line[]; play?: boolean }) {
  return (
    <pre className={`code${play ? " play" : ""}`} tabIndex={0}>
      {lines.map((l, i) => (
        <span key={i} className={`ln${l.c ? ` ${l.c}` : ""}`} style={{ "--i": i } as React.CSSProperties}>
          {l.t === "" ? " " : l.t}
        </span>
      ))}
    </pre>
  );
}

/**
 * A bordered code block with an optional label and a copy button.
 * `copy` overrides what is copied (e.g. only the command, without sample output).
 */
export function CodeBlock({
  code,
  lines,
  label,
  copy,
  diff = false,
}: {
  code?: string;
  lines?: Line[];
  label?: string;
  copy?: string;
  diff?: boolean;
}) {
  const body = lines ?? toLines(code ?? "", diff);
  const copyText = copy ?? body.map((l) => l.t).join("\n");
  return (
    <div className="codeblock">
      {label && <div className="label">{label}</div>}
      <CopyButton text={copyText} />
      <CodeLines lines={body} />
    </div>
  );
}
