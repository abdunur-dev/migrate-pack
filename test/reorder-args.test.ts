import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { transformSource } from "../src/engine";
import { loadPack } from "../src/pack";

const pack = loadPack(join(__dirname, "..", "rules.yaml"));
const rule = pack.rules.find((r) => r.id === "res-json-status-arg")!;

test("res-json-status-arg reorders res.json(obj, <number>) and nothing else", () => {
  const before = [
    `res.json({ ok: true }, 201);`,
    `res.json({ ok: true }, status);`,
    `res.json(404, { error: "x" });`,
    `res.json({ ok: true });`,
    `res.json(a, 200, extra);`,
    `other.json({ ok: true }, 201);`,
    `res.status(201).json({ ok: true });`,
    `return res.json(buildBody(req), 500);`,
    ``,
  ].join("\n");

  const after = [
    `res.status(201).json({ ok: true });`,
    `res.json({ ok: true }, status);`,
    `res.json(404, { error: "x" });`,
    `res.json({ ok: true });`,
    `res.json(a, 200, extra);`,
    `other.json({ ok: true }, 201);`,
    `res.status(201).json({ ok: true });`,
    `return res.status(500).json(buildBody(req));`,
    ``,
  ].join("\n");

  const result = transformSource(before, [rule], "a.js");

  assert.equal(result.after, after);
  assert.deepEqual(result.edits, [
    { ruleId: "res-json-status-arg", line: 1 },
    { ruleId: "res-json-status-arg", line: 8 },
  ]);
});
