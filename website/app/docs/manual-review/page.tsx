import { CodeBlock } from "@/components/CodeBlock";
import { DocPage } from "@/components/Pager";

export const metadata = { title: "Manual review" };

export default function Page() {
  return (
    <DocPage href="/docs/manual-review" group="Guides" title="Manual review" lede="fix-manual shows each item that needs a person, and can ask an AI model for a suggested fix.">
      <h2 id="list">List the items</h2>
      <CodeBlock
        copy="npx migrate-pack fix-manual --repo ."
        code={`$ npx migrate-pack fix-manual --repo .
[1/1] src/routes/users.js:18  req-param-removed
  Use req.params, req.body or req.query explicitly.
    16 | router.get("/:id/avatar", (req, res) => {
    17 |   const size = Number(req.query.size);
  > 18 |   const id = req.param("id");
    19 |   res.sendFile(avatarPath(id, size));
    20 | });`}
      />
      <p>Add <code>--item 1</code> to show only that item.</p>

      <h2 id="suggest">Ask for a fix</h2>
      <CodeBlock code="npx migrate-pack fix-manual --repo . --item 1 --suggest" />
      <ul>
        <li>Needs an <code>ANTHROPIC_API_KEY</code> environment variable. Without it the command stops before scanning.</li>
        <li>Sends <strong>only</strong> the rule note and 15 lines of code around the item. No file names, paths or other code.</li>
        <li>Uses <code>claude-opus-5-5</code>. If the model declines on safety grounds, the API retries on a fallback model.</li>
        <li>Prints the proposal as a diff with a short explanation. <strong>Writes nothing.</strong></li>
        <li>Each call is billed to your API key.</li>
      </ul>

      <h2 id="errors">Errors</h2>
      <ul>
        <li>The model declined: no fix is shown.</li>
        <li>The reply was cut off, or came back in the wrong format: the command stops with an error.</li>
      </ul>
      <p>AI suggestions can be wrong. Read the diff before you apply it.</p>
    </DocPage>
  );
}
