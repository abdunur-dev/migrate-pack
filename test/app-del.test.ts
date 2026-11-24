import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { transformSource } from "../src/engine";
import { loadPack } from "../src/pack";

const pack = loadPack(join(__dirname, "..", "rules.yaml"));

test("app-del-to-delete renames app.del(...) and nothing else", () => {
  const before = [
    `app.del("/users/:id", (req, res) => res.sendStatus(204));`,
    `app.delete("/already/fine", handler);`,
    `router.del("/not-app", handler);`,
    `const label = "app.del";`,
    `// app.del in a comment`,
    `app.del("/two", handler);`,
    ``,
  ].join("\n");

  const after = [
    `app.delete("/users/:id", (req, res) => res.sendStatus(204));`,
    `app.delete("/already/fine", handler);`,
    `router.del("/not-app", handler);`,
    `const label = "app.del";`,
    `// app.del in a comment`,
    `app.delete("/two", handler);`,
    ``,
  ].join("\n");

  const result = transformSource(before, pack.rules, "server.js");

  assert.equal(result.after, after);
  assert.deepEqual(result.edits, [
    { ruleId: "app-del-to-delete", line: 1 },
    { ruleId: "app-del-to-delete", line: 6 },
  ]);
  assert.deepEqual(result.manual, []);
});
