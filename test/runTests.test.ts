import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { runTests } from "../src/runTests";

const fixtures = join(__dirname, "fixtures");

test("runTests reports pass with output for a repo whose npm test succeeds", () => {
  const result = runTests(join(fixtures, "passing-repo"));
  assert.equal(result.passed, true, result.output);
  assert.equal(result.exitCode, 0);
  assert.ok(result.output.includes("fixture tests passed"), result.output);
});

test("runTests reports fail with output for a repo whose npm test fails", () => {
  const result = runTests(join(fixtures, "failing-repo"));
  assert.equal(result.passed, false);
  assert.equal(result.exitCode, 1);
  assert.ok(result.output.includes("fixture failure: expected 1 to equal 2"), result.output);
});

test("runTests reports fail when the repo path does not exist", () => {
  const result = runTests(join(fixtures, "does-not-exist"));
  assert.equal(result.passed, false);
});
