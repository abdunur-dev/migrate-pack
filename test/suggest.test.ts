import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Deps, main } from "../src/cli";
import type { ModelPrompt } from "../src/suggest";

// 25 lines; the manual item (req.param) is on line 12, so the 15-line window is lines 5-19.
const source =
  Array.from({ length: 25 }, (_, i) =>
    i + 1 === 12 ? `  const id = req.param("id");` : `const v${i + 1} = ${i + 1};`,
  ).join("\n") + "\n";

async function runCli(argv: string[], deps: Deps) {
  let out = "";
  let err = "";
  const code = await main(argv, { out: (t) => (out += t), err: (t) => (err += t) }, deps);
  return { code, out, err };
}

function withRepo(fn: (repo: string) => Promise<void>) {
  return async () => {
    const repo = mkdtempSync(join(tmpdir(), "migrate-pack-suggest-"));
    writeFileSync(join(repo, "server.js"), source);
    try {
      await fn(repo);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  };
}

test(
  "--suggest sends only the note and 15 lines, prints the model's fix as a diff, and writes nothing",
  withRepo(async (repo) => {
    const prompts: ModelPrompt[] = [];
    const deps: Deps = {
      env: { ANTHROPIC_API_KEY: "test-key" },
      makeCallModel: (apiKey) => {
        assert.equal(apiKey, "test-key");
        return async (prompt) => {
          prompts.push(prompt);
          const snippet = prompt.user.split("<snippet>\n")[1].split("\n</snippet>")[0];
          const fixed = snippet.replace(`req.param("id")`, `req.params.id`);
          return `<replacement>\n${fixed}\n</replacement>\n<explanation>Uses req.params because id is a route parameter.</explanation>`;
        };
      },
    };

    const { code, out, err } = await runCli(["fix-manual", "--repo", repo, "--item", "1", "--suggest"], deps);

    assert.equal(err, "");
    assert.equal(code, 0);

    // Exactly one model call, containing only the rule note and the 15-line window.
    assert.equal(prompts.length, 1);
    const { user, system } = prompts[0];
    assert.ok(user.includes("Note: Use req.params, req.body or req.query explicitly"), user);
    const snippet = user.split("<snippet>\n")[1].split("\n</snippet>")[0];
    assert.equal(snippet.split("\n").length, 15);
    assert.ok(snippet.startsWith("const v5 = 5;"), snippet);
    assert.ok(snippet.endsWith("const v19 = 19;"), snippet);
    assert.ok(user.includes("line 8 of the snippet"), user);
    for (const leaked of ["const v4 = 4;", "const v20 = 20;", "server.js", "req-param-removed", repo]) {
      assert.ok(!user.includes(leaked) && !system.includes(leaked), `prompt must not contain ${leaked}`);
    }

    // The proposal is printed as a diff.
    assert.ok(out.includes("--- a/server.js"), out);
    assert.ok(out.includes(`-  const id = req.param("id");`), out);
    assert.ok(out.includes(`+  const id = req.params.id;`), out);
    assert.ok(out.includes("Model: Uses req.params because id is a route parameter."), out);
    assert.ok(out.includes("Nothing was written."), out);

    assert.equal(readFileSync(join(repo, "server.js"), "utf8"), source, "--suggest must not write");
  }),
);

test(
  "--suggest without ANTHROPIC_API_KEY prints a clear error, exits 1 and never calls the model",
  withRepo(async (repo) => {
    let called = false;
    const deps: Deps = {
      env: {},
      makeCallModel: () => {
        called = true;
        throw new Error("must not be called");
      },
    };

    const { code, out, err } = await runCli(["fix-manual", "--repo", repo, "--item", "1", "--suggest"], deps);

    assert.equal(code, 1);
    assert.equal(called, false);
    assert.equal(out, "");
    assert.ok(err.includes("ANTHROPIC_API_KEY"), err);
  }),
);

test(
  "--suggest needs --item, and --item must exist",
  withRepo(async (repo) => {
    const deps: Deps = {
      env: { ANTHROPIC_API_KEY: "test-key" },
      makeCallModel: () => {
        throw new Error("must not be called");
      },
    };

    const noItem = await runCli(["fix-manual", "--repo", repo, "--suggest"], deps);
    assert.equal(noItem.code, 2);
    assert.ok(noItem.err.includes("--suggest needs --item"), noItem.err);

    const badItem = await runCli(["fix-manual", "--repo", repo, "--item", "5", "--suggest"], deps);
    assert.equal(badItem.code, 2);
    assert.ok(badItem.err.includes("--item 5 does not exist"), badItem.err);
  }),
);
