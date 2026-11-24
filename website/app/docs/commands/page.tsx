import { CodeBlock } from "@/components/CodeBlock";
import { DocPage } from "@/components/Pager";

export const metadata = { title: "Commands" };

const OPTIONS: [string, string, string][] = [
  ["--repo <path>", "both", "Project to scan (required). node_modules and .git are skipped."],
  ["--pack <path>", "both", "Rules file to use. Default: the bundled Express 4 → 5 pack."],
  ["--dry-run", "both", "run: print a diff and write nothing. fix-manual never writes anyway."],
  ["--item <n>", "fix-manual", "Show only manual item n, as numbered in the listing."],
  ["--suggest", "fix-manual", "With --item: ask an AI model for a fix, printed as a diff."],
  ["-h, --help", "—", "Show help."],
  ["-v, --version", "—", "Show the version."],
];

export default function Page() {
  return (
    <DocPage href="/docs/commands" group="Guides" title="Commands" lede="Two commands: run applies the pack, fix-manual helps you with what is left.">
      <h2 id="run">run</h2>
      <CodeBlock code="migrate-pack run --repo <path> [--pack <rules.yaml>] [--dry-run]" />
      <p>Scans every <code>.js</code> and <code>.ts</code> file (not <code>.d.ts</code>), applies the automatic rules, and prints a summary with each manual item. With <code>--dry-run</code> it prints a unified diff instead of writing.</p>

      <h2 id="fix-manual">fix-manual</h2>
      <CodeBlock code="migrate-pack fix-manual --repo <path> [--pack <rules.yaml>] [--item <n> [--suggest]]" />
      <p>Lists each manual item with its note and 2 lines of code above and below. It never writes files. If automatic edits are still pending, it says so and shows the code as it will look after them.</p>

      <h2 id="options">Options</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Option</th><th>Command</th><th>What it does</th></tr></thead>
          <tbody>
            {OPTIONS.map(([o, c, d]) => (
              <tr key={o}><td><code>{o}</code></td><td>{c}</td><td>{d}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="exit-codes">Exit codes</h2>
      <ul>
        <li><code>0</code>: success.</li>
        <li><code>1</code>: error, such as an invalid rules file, an unknown option, a missing <code>ANTHROPIC_API_KEY</code> with <code>--suggest</code>, or a failed model call.</li>
        <li><code>2</code>: usage problem, such as a missing <code>--repo</code>, an unknown command, <code>--suggest</code> without <code>--item</code>, an item number that does not exist, or <code>--item</code> on <code>run</code>.</li>
      </ul>
    </DocPage>
  );
}
