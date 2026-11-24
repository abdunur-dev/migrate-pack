import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { transformSource } from "../src/engine";
import { loadPack } from "../src/pack";

const pack = loadPack(join(__dirname, "..", "rules.yaml"));
const rule = pack.rules.find((r) => r.id === "res-json-status-arg")!;

test("res-json-status-arg (status-last) reorders res.json(obj, <number>) and nothing else", () => {
  const before = [
    `res.json({ ok: true }, 201);`,
    `res.json({ ok: true }, status);`,
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
    `res.json({ ok: true });`,
    `res.json(a, 200, extra);`,
    `other.json({ ok: true }, 201);`,
    `res.status(201).json({ ok: true });`,
    `return res.status(500).json(buildBody(req));`,
    ``,
  ].join("\n");

  const result = transformSource(before, [rule], "a.js");

  assert.equal(result.after, after);
  assert.deepEqual(result.edits.map((e) => e.line), [1, 7]);
});

test("res-json-status-arg (status-first) reorders res.json(<number>, <non-number literal>) and nothing else", () => {
  const before = [
    `res.json(404, { error: "not found" });`, // 1  status-first: rewrite
    `res.json(201, [1, 2]);`, //                  2  status-first: rewrite
    `res.json(500, "oops");`, //                  3  status-first: rewrite
    `res.json(404);`, //                          4  1 arg: unchanged
    `res.json(404, { a: 1 }, extra);`, //         5  3 args: unchanged
    `other.json(201, x);`, //                     6  not res: unchanged
    `res.json(404, count);`, //                   7  count may be a number at runtime: unchanged
    `res.json(200, 201);`, //                     8  2nd is a number: status-last wins (Express 4 semantics)
    `res.json({ ok: true }, 201);`, //            9  status-last still applies
    ``,
  ].join("\n");

  const after = [
    `res.status(404).json({ error: "not found" });`,
    `res.status(201).json([1, 2]);`,
    `res.status(500).json("oops");`,
    `res.json(404);`,
    `res.json(404, { a: 1 }, extra);`,
    `other.json(201, x);`,
    `res.json(404, count);`,
    `res.status(201).json(200);`,
    `res.status(201).json({ ok: true });`,
    ``,
  ].join("\n");

  const result = transformSource(before, [rule], "a.js");

  assert.equal(result.after, after);
  assert.deepEqual(result.edits.map((e) => e.line), [1, 2, 3, 8, 9]);
});
