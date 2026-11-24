import { DocPage } from "@/components/Pager";
import { EXPRESS_GUIDE_URL, GITHUB_URL } from "@/lib/docs";

export const metadata = { title: "Limits and roadmap" };

export default function Page() {
  return (
    <DocPage href="/docs/limits" group="Project" title="Limits and roadmap" lede="What migrate-pack does not do yet, and what comes next.">
      <h2 id="limits">Known limits</h2>
      <ul>
        <li><strong>Matches by variable name.</strong> It does not check that <code>app</code>, <code>req</code> or <code>res</code> came from Express. Other names are missed.</li>
        <li><strong>Literal route paths only.</strong> Paths in variables or built at runtime are missed.</li>
        <li><strong>.js and .ts only.</strong> <code>.mjs</code>, <code>.cjs</code>, <code>.jsx</code> and <code>.tsx</code> are skipped.</li>
        <li><strong>Small coverage.</strong> Most Express 5 changes are not handled. A clean run does not mean your app is ready.</li>
      </ul>

      <h2 id="roadmap">Roadmap</h2>
      <ul>
        <li>Check that variables really come from <code>express()</code>.</li>
        <li>More AI help for ambiguous items.</li>
        <li>More rules from the migration guide.</li>
        <li>Packs for other libraries.</li>
      </ul>

      <h2 id="guide">The official guide wins</h2>
      <p>Check every rule against the <a href={EXPRESS_GUIDE_URL}>Express 5 migration guide</a>.</p>

      <h2 id="issues">Report a problem</h2>
      <p>Open an issue on <a href={`${GITHUB_URL}/issues`}>GitHub</a>.</p>
    </DocPage>
  );
}
