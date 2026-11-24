import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { transformSource } from "../src/engine";
import { loadPack } from "../src/pack";

const pack = loadPack(join(__dirname, "..", "rules.yaml"));
const ruleById = (id: string) => pack.rules.find((r) => r.id === id)!;

test("req-param-removed reports req.param(...) lines and edits nothing", () => {
  const code = [
    `const id = req.param("id");`,
    `const p = req.params.id;`,
    `const q = req.query.id;`,
    `other.param("id");`,
    `const name = req.param("name", "anon");`,
    ``,
  ].join("\n");

  const result = transformSource(code, [ruleById("req-param-removed")], "a.js");

  assert.equal(result.after, code);
  assert.deepEqual(result.edits, []);
  assert.deepEqual(
    result.manual.map((m) => [m.ruleId, m.line]),
    [
      ["req-param-removed", 1],
      ["req-param-removed", 5],
    ],
  );
});

test("res-json-two-args-unhandled reports 2-arg res.json calls the reorder rule skips", () => {
  const code = [
    `res.json({ ok: true }, 201);`,
    `res.json({ ok: true }, status);`,
    `res.json(404, { error: "x" });`,
    `res.json({ ok: true });`,
    `res.json(a, 200, extra);`,
    `other.json(a, b);`,
    `res.status(201).json({ ok: true });`,
    ``,
  ].join("\n");
  const detector = ruleById("res-json-two-args-unhandled");

  // On its own: reports lines 2 and 3, skips the reorderable line 1, edits nothing.
  const alone = transformSource(code, [detector], "a.js");
  assert.equal(alone.after, code);
  assert.deepEqual(alone.edits, []);
  assert.deepEqual(alone.manual.map((m) => m.line), [2, 3]);

  // With the full pack: line 1 is rewritten, lines 2 and 3 are reported and left as-is.
  const full = transformSource(code, pack.rules, "a.js");
  assert.deepEqual(full.edits.map((e) => [e.ruleId, e.line]), [["res-json-status-arg", 1]]);
  assert.deepEqual(
    full.manual.filter((m) => m.ruleId === "res-json-two-args-unhandled").map((m) => m.line),
    [2, 3],
  );
  assert.equal(full.after, code.replace(`res.json({ ok: true }, 201);`, `res.status(201).json({ ok: true });`));
});

test("route-wildcard reports route strings containing * and edits nothing", () => {
  const code = [
    `app.get("*", handler);`,
    `app.get("/users/:id", handler);`,
    `router.use("/static/*", serve);`,
    `app.post(["/a", "/b/*"], handler);`,
    `app.get(/.*fly$/, handler);`,
    `res.send("*");`,
    `const glob = "src/**/*.js";`,
    `app.all(\`/files/*\`, handler);`,
    ``,
  ].join("\n");

  const result = transformSource(code, [ruleById("route-wildcard")], "a.ts");

  assert.equal(result.after, code);
  assert.deepEqual(result.edits, []);
  assert.deepEqual(
    result.manual.map((m) => m.line),
    [1, 3, 4, 8],
  );
});
