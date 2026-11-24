import Link from "next/link";
import { CodeLines, type Line } from "@/components/CodeBlock";
import { CodeTabs, type CodeTab } from "@/components/CodeTabs";
import { CopyButton } from "@/components/CopyButton";
import { Reveal } from "@/components/Reveal";
import { Spotlight } from "@/components/Spotlight";
import { GITHUB_URL } from "@/lib/docs";

const QUICK_START = "npx migrate-pack run --repo . --dry-run";

const TABS: CodeTab[] = [
  {
    id: "diff",
    label: "dry-run.diff",
    lines: [
      { t: "--- a/src/routes/users.js", c: "dim" },
      { t: "+++ b/src/routes/users.js", c: "dim" },
      { t: "@@ -9,11 +9,11 @@", c: "dim" },
      { t: ' router.get("/:id", loadUser);' },
      { t: '-app.del("/users/:id", removeUser);', c: "del" },
      { t: '+app.delete("/users/:id", removeUser);', c: "add" },
      { t: " " },
      { t: " function notFound(req, res) {" },
      { t: '-  res.json({ error: "not found" }, 404);', c: "del" },
      { t: '+  res.status(404).json({ error: "not found" });', c: "add" },
      { t: " }" },
      { t: " " },
      { t: " function download(req, res) {" },
      { t: '-  res.sendfile("report.pdf");', c: "del" },
      { t: '+  res.sendFile("report.pdf");', c: "add" },
      { t: " }" },
    ],
  },
  {
    id: "summary",
    label: "summary",
    lines: [
      { t: "migrate-pack: express-4-to-5 (dry run, nothing written)" },
      { t: "  pack: /usr/lib/node_modules/migrate-pack/rules.yaml", c: "dim" },
      { t: "  scanned 42 files" },
      { t: "  would change 3 files, 5 edits" },
      { t: "    app-del-to-delete: 2", c: "key" },
      { t: "    res-json-status-arg: 2", c: "key" },
      { t: "    res-sendfile-camelcase: 1", c: "key" },
      { t: "  needs manual review: 2" },
      { t: "    src/routes/users.js:18 [req-param-removed] Use req.params, ...", c: "key" },
      { t: "    src/app.js:31 [route-wildcard] Wildcards must be named ...", c: "key" },
    ],
  },
  {
    id: "rules",
    label: "rules.yaml",
    lines: [
      { t: "# one rule, as it appears in the bundled pack", c: "cmt" },
      { t: "- id: res-json-status-arg" },
      { t: "  type: reorder-args" },
      { t: "  match:" },
      { t: "    call: res.json" },
      { t: "  reorder:" },
      { t: "    chain: status" },
      { t: "    forms: [status-last, status-first]" },
      { t: "" },
      { t: "# reported for review, never edited", c: "cmt" },
      { t: "- id: req-param-removed" },
      { t: "  type: manual" },
      { t: "  match:" },
      { t: "    call: req.param" },
    ],
  },
];

const FIX_MANUAL: Line[] = [
  { t: "[1/2] src/routes/users.js:18  req-param-removed" },
  { t: "  Use req.params, req.body or req.query explicitly.", c: "dim" },
  { t: '    16 | router.get("/:id/avatar", (req, res) => {', c: "dim" },
  { t: "    17 |   const size = Number(req.query.size);", c: "dim" },
  { t: '  > 18 |   const id = req.param("id");', c: "hl" },
  { t: "    19 |   res.sendFile(avatarPath(id, size));", c: "dim" },
  { t: "    20 | });", c: "dim" },
  { t: "" },
  { t: "[2/2] src/app.js:31  route-wildcard" },
  { t: '  Wildcards must be named in Express 5 (e.g. "/*splat").', c: "dim" },
  { t: '  > 31 | app.get("/assets/*", serveAsset);', c: "hl" },
];

const RULES: [string, string[], string[]][] = [
  ["app-del-to-delete", ["app.del(...)"], ["app.delete(...)"]],
  ["req-accepts-charset-plural", ["req.acceptsCharset(...)"], ["req.acceptsCharsets(...)"]],
  ["req-accepts-encoding-plural", ["req.acceptsEncoding(...)"], ["req.acceptsEncodings(...)"]],
  ["req-accepts-language-plural", ["req.acceptsLanguage(...)"], ["req.acceptsLanguages(...)"]],
  ["res-sendfile-camelcase", ["res.sendfile(...)"], ["res.sendFile(...)"]],
  ["res-json-status-arg", ["res.json(obj, 201)", "res.json(404, { ... })"], ["res.status(201).json(obj)", "res.status(404).json({ ... })"]],
];

const d = (n: number) => ({ "--d": n }) as React.CSSProperties;

export default function Home() {
  return (
    <main className="wrap">
      <div className="frame">
        <Spotlight as="section" className="row pad hero">
          <div className="hero-copy">
            <span className="eyebrow enter" style={d(0)}>
              <span className="pip" aria-hidden="true" />
              Express 4 → 5 · early version
            </span>
            <h1 className="display enter" style={d(1)}>
              Move to Express 5 with edits you can review.
            </h1>
            <p className="lede enter" style={d(2)}>
              migrate-pack applies a rules file to your code with AST edits. It rewrites what is safe to rewrite and
              lists everything else by file and line.
            </p>
            <div className="install enter" style={d(3)} role="group" aria-label="Quick start command">
              <span className="prompt">$</span>
              <code>{QUICK_START}</code>
              <CopyButton text={QUICK_START} />
            </div>
            <div className="actions enter" style={d(4)}>
              <Link className="btn primary" href="/docs">
                Get started <span className="arr">→</span>
              </Link>
              <a className="btn" href={GITHUB_URL}>
                View on GitHub
              </a>
            </div>
            <p className="meta-line enter" style={d(5)}>
              Node 20+ · MIT · <code>--dry-run</code> writes nothing
            </p>
          </div>
          <CodeTabs tabs={TABS} footLeft="example output" footRight="express-4-to-5" />
        </Spotlight>

        <Reveal className="row" id="how">
          <div className="section-head">
            <span className="eyebrow">How it works</span>
            <h2 className="section">Three kinds of result, and you can tell them apart.</h2>
          </div>
          <div className="cells">
            <Spotlight className="cell spot">
              <span className="tag">automatic</span>
              <h3>Edits on the syntax tree</h3>
              <p>
                Each file is parsed with ts-morph and rules match real calls. Strings and comments that mention{" "}
                <code>app.del</code> are never touched. No regex runs on your code.
              </p>
            </Spotlight>
            <Spotlight className="cell spot">
              <span className="tag">manual</span>
              <h3>Reported by file and line</h3>
              <p>
                Changes that need a decision, like <code>req.param()</code> or wildcard routes, are listed with a note.
                The tool never edits them.
              </p>
            </Spotlight>
            <Spotlight className="cell spot">
              <span className="tag">ambiguous</span>
              <h3>Reported, never guessed</h3>
              <p>
                <code>res.json(404, someVar)</code> could mean either order at runtime, so it is listed for review
                instead of rewritten.
              </p>
            </Spotlight>
          </div>
        </Reveal>

        <Reveal className="row" id="rules">
          <div className="section-head">
            <span className="eyebrow">Rules in the bundled pack</span>
            <h2 className="section">Six automatic rewrites. Three detectors.</h2>
            <p className="muted">
              This is the complete list. Most Express 5 changes are not covered yet, so a clean run does not mean your
              app is ready.
            </p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Rule</th>
                  <th scope="col">Express 4</th>
                  <th scope="col">Express 5</th>
                </tr>
              </thead>
              <tbody>
                {RULES.map(([id, from, to]) => (
                  <tr key={id}>
                    <td>
                      <code className="muted">{id}</code>
                    </td>
                    <td>
                      {from.map((f, i) => (
                        <div key={i}>
                          <code>{f}</code>
                        </div>
                      ))}
                    </td>
                    <td>
                      {to.map((f, i) => (
                        <div key={i}>
                          <code>{f}</code>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cells">
            <Spotlight className="cell spot">
              <code className="id">res-json-two-args-unhandled</code>
              <p>
                Two-argument <code>res.json</code> calls that could not be rewritten safely, such as{" "}
                <code>res.json(obj, status)</code> or <code>res.json(200, 201)</code>.
              </p>
            </Spotlight>
            <Spotlight className="cell spot">
              <code className="id">req-param-removed</code>
              <p>
                <code>req.param(name)</code> is gone. You choose <code>req.params</code>, <code>req.body</code> or{" "}
                <code>req.query</code>.
              </p>
            </Spotlight>
            <Spotlight className="cell spot">
              <code className="id">route-wildcard</code>
              <p>
                Route paths containing <code>*</code> on <code>app</code> or <code>router</code>. Express 5 wildcards
                must be named.
              </p>
            </Spotlight>
          </div>
        </Reveal>

        <Reveal className="row pad split" id="review">
          <div className="text">
            <span className="eyebrow">Manual review</span>
            <h2 className="section">See each item in context. Ask for a fix if you want one.</h2>
            <p className="muted">
              <code>fix-manual</code> lists every item with the code around it. Add <code>--item 1 --suggest</code> and
              an AI model proposes a fix for that one item, printed as a diff.
            </p>
            <ul className="checks">
              <li>
                <span>Sends only the rule note and 15 lines of code. No file names, paths or other code.</span>
              </li>
              <li>
                <span>
                  Needs <code>ANTHROPIC_API_KEY</code>. Without it, the command stops before doing anything.
                </span>
              </li>
              <li>
                <span>Writes nothing. You read the diff and apply it yourself.</span>
              </li>
            </ul>
            <div className="actions">
              <Link className="btn" href="/docs/manual-review">
                Read the guide <span className="arr">→</span>
              </Link>
            </div>
          </div>
          <div className="codeblock">
            <div className="label">$ npx migrate-pack fix-manual --repo .</div>
            <CodeLines lines={FIX_MANUAL} />
          </div>
        </Reveal>

        <Reveal className="row" id="limits">
          <div className="section-head">
            <span className="eyebrow">Known limits</span>
            <h2 className="section">What it does not do yet.</h2>
          </div>
          <div className="cells two">
            <Spotlight className="cell spot">
              <h3>Matches by variable name</h3>
              <p>
                Rules look for <code>app</code>, <code>req</code>, <code>res</code> and <code>router</code> by name.
                They do not check that the value came from <code>express()</code>.
              </p>
            </Spotlight>
            <Spotlight className="cell spot">
              <h3>Literal route paths only</h3>
              <p>Wildcard detection reads paths written as strings. Paths built at runtime or held in variables are missed.</p>
            </Spotlight>
            <Spotlight className="cell spot">
              <h3>.js and .ts files</h3>
              <p>
                <code>.mjs</code>, <code>.cjs</code>, <code>.jsx</code> and <code>.tsx</code> are skipped.{" "}
                <code>node_modules</code> and <code>.git</code> are never scanned.
              </p>
            </Spotlight>
            <Spotlight className="cell spot">
              <h3>Check the official guide</h3>
              <p>
                Compare every rule against the Express 5 migration guide. Where they disagree, the guide is right.
              </p>
            </Spotlight>
          </div>
        </Reveal>

        <Reveal className="row pad cta">
          <h2 className="section">Preview the changes on your project.</h2>
          <p className="lede">
            A dry run prints a diff and the review list. Nothing on disk changes until you run it again without{" "}
            <code>--dry-run</code>.
          </p>
          <div className="actions">
            <Link className="btn primary" href="/docs">
              Read the docs <span className="arr">→</span>
            </Link>
            <Link className="btn" href="/docs/commands">
              Command reference
            </Link>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
