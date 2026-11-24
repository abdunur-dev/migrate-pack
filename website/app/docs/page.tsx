import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { DocPage } from "@/components/Pager";

export const metadata = { title: "Introduction" };

export default function Page() {
  return (
    <DocPage href="/docs" group="Get started" title="Introduction" lede="migrate-pack migrates Express 4 code to Express 5 by applying a rules file to your project. It is an early version and covers a small set of changes.">
      <h2 id="quick-start">Quick start</h2>
      <p>Requires Node 20+. Preview the changes first. This writes nothing:</p>
      <CodeBlock code="npx migrate-pack run --repo ./my-app --dry-run" />
      <p>Apply them by running the same command without <code>--dry-run</code>:</p>
      <CodeBlock code="npx migrate-pack run --repo ./my-app" />
      <div className="callout" style={{ marginTop: 14 }}>
        <strong>Use a clean git working tree.</strong> Files are overwritten in place with no backup, so git is how you review and undo.
      </div>

      <h2 id="results">What you get</h2>
      <ul>
        <li><strong>Automatic edits</strong> for calls that can be rewritten safely.</li>
        <li><strong>Manual items</strong> listed as <code>file:line</code> with a note. Never edited.</li>
        <li><strong>Ambiguous calls</strong> reported instead of guessed.</li>
      </ul>
      <CodeBlock
        label="example summary"
        code={`migrate-pack: express-4-to-5 (dry run, nothing written)
  scanned 42 files
  would change 3 files, 5 edits
    app-del-to-delete: 2
    res-json-status-arg: 3
  needs manual review: 1
    src/routes/users.js:18 [req-param-removed] Use req.params, ...`}
      />

      <h2 id="why">Why a rules file</h2>
      <p>The people who know a breaking change best are the library's maintainers. The idea: they publish a rules file, and one tool applies it for everyone. The bundled pack was written for this project, not by the Express team.</p>

      <h2 id="next">Next steps</h2>
      <div className="next-links">
        <Link className="card-link" href="/docs/commands"><span className="t">Commands</span><span className="d">Every command, option and exit code.</span></Link>
        <Link className="card-link" href="/docs/rules"><span className="t">Rules</span><span className="d">What the bundled pack changes and reports.</span></Link>
      </div>
    </DocPage>
  );
}
