import { CodeBlock } from "@/components/CodeBlock";
import { DocPage } from "@/components/Pager";

export const metadata = { title: "Rules file" };

const FIELDS: [string, string][] = [
  ["id", "Unique name. Shown in the summary."],
  ["description", "One line about the rule."],
  ["type", "deterministic, reorder-args or manual."],
  ["match", "What to find. See below."],
  ["replace.method", "deterministic: the new method name."],
  ["reorder.chain / reorder.forms", "reorder-args: chained method (e.g. status) and forms: status-last, status-first."],
  ["note", "manual: what the person should do. Required."],
];

export default function Page() {
  return (
    <DocPage href="/docs/rules-file" group="Reference" title="Rules file" lede="A pack is a YAML file with a name and a list of rules. Pass your own with --pack.">
      <h2 id="use">Use your own</h2>
      <CodeBlock code="npx migrate-pack run --repo . --pack ./my-rules.yaml --dry-run" />

      <h2 id="fields">Rule fields</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
          <tbody>{FIELDS.map(([f, m]) => <tr key={f}><td><code>{f}</code></td><td>{m}</td></tr>)}</tbody>
        </table>
      </div>

      <h2 id="match">Matching</h2>
      <ul>
        <li><code>call: object.method</code> matches calls like <code>app.del(...)</code> on a variable with that name.</li>
        <li><code>args: N</code> only matches calls with exactly N arguments.</li>
        <li><code>exceptRewrittenBy: rule-id</code> skips calls that reorder-args rule would rewrite.</li>
        <li><code>routeString</code> (manual rules only) matches route paths containing a string, with <code>objects</code>, <code>methods</code> and <code>contains</code>.</li>
      </ul>

      <h2 id="example">Example</h2>
      <CodeBlock
        label="my-rules.yaml"
        code={`name: my-pack
rules:
  - id: app-del-to-delete
    description: Replace app.del with app.delete
    type: deterministic
    match:
      call: app.del
    replace:
      method: delete

  - id: req-param-removed
    description: req.param was removed
    type: manual
    match:
      call: req.param
    note: Use req.params, req.body or req.query.`}
      />

      <h2 id="validation">Validation</h2>
      <p>The pack is checked when it loads. A missing field or wrong type stops the run with a message that names the rule, for example <code>rule #2 (my-rule): deterministic rules need replace.method</code>.</p>
    </DocPage>
  );
}
