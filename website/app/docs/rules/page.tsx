import { CodeBlock } from "@/components/CodeBlock";
import { DocPage } from "@/components/Pager";
import { EXPRESS_GUIDE_URL } from "@/lib/docs";

export const metadata = { title: "Rules" };

export default function Page() {
  return (
    <DocPage href="/docs/rules" group="Reference" title="Rules" lede="The bundled express-4-to-5 pack has six automatic rules and three manual detectors. Rules match variables by name: app, req, res and router.">
      <h2 id="app-del">app.del</h2>
      <p><code>app-del-to-delete</code></p>
      <CodeBlock diff code={`-app.del("/users/:id", handler);\n+app.delete("/users/:id", handler);`} />

      <h2 id="accepts">Plural accepts methods</h2>
      <p><code>req-accepts-charset-plural</code>, <code>req-accepts-encoding-plural</code>, <code>req-accepts-language-plural</code></p>
      <CodeBlock diff code={`-req.acceptsCharset("utf-8");\n+req.acceptsCharsets("utf-8");\n-req.acceptsEncoding("gzip");\n+req.acceptsEncodings("gzip");\n-req.acceptsLanguage("en");\n+req.acceptsLanguages("en");`} />

      <h2 id="sendfile">res.sendfile</h2>
      <p><code>res-sendfile-camelcase</code></p>
      <CodeBlock diff code={`-res.sendfile("index.html");\n+res.sendFile("index.html");`} />

      <h2 id="res-json">res.json with a status</h2>
      <p><code>res-json-status-arg</code> only rewrites calls with exactly 2 arguments. In Express 4, a second argument that is a number at runtime is the status, so the status-first form is rewritten only when the other argument is clearly not a number.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Call</th><th>Result</th></tr></thead>
          <tbody>
            <tr><td><code>res.json(obj, 201)</code></td><td><code>res.status(201).json(obj)</code></td></tr>
            <tr><td><code>res.json(404, {"{ ... }"})</code></td><td><code>res.status(404).json({"{ ... }"})</code></td></tr>
            <tr><td><code>res.json(obj, status)</code></td><td>Reported</td></tr>
            <tr><td><code>res.json(404, someVar)</code></td><td>Reported</td></tr>
            <tr><td><code>res.json(200, 201)</code></td><td>Reported</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="manual">Manual detectors</h2>
      <h3><code>res-json-two-args-unhandled</code></h3>
      <p>Two-argument <code>res.json</code> calls that <code>res-json-status-arg</code> did not rewrite.</p>
      <h3><code>req-param-removed</code></h3>
      <p><code>req.param(name)</code> was removed. Choose <code>req.params</code>, <code>req.body</code> or <code>req.query</code>.</p>
      <h3><code>route-wildcard</code></h3>
      <p>Route paths containing <code>*</code> in <code>all</code>, <code>delete</code>, <code>get</code>, <code>head</code>, <code>options</code>, <code>patch</code>, <code>post</code>, <code>put</code>, <code>use</code> or <code>route</code> calls on <code>app</code> or <code>router</code>. Express 5 wildcards must be named, for example <code>/*splat</code>.</p>

      <div className="callout" style={{ marginTop: 32 }}>
        Check every rule against the <a href={EXPRESS_GUIDE_URL}>Express 5 migration guide</a>. Where they disagree, the guide is right.
      </div>
    </DocPage>
  );
}
