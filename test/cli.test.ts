import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_PACK_PATH, main } from "../src/cli";

async function capture(argv: string[]) {
  let out = "";
  let err = "";
  const code = await main(argv, { out: (t) => (out += t), err: (t) => (err += t) });
  return { code, out, err };
}

test("without --pack, the bundled rules.yaml is used, independent of the current directory", async () => {
  const repo = mkdtempSync(join(tmpdir(), "migrate-pack-repo-"));
  const elsewhere = mkdtempSync(join(tmpdir(), "migrate-pack-cwd-")); // has no rules.yaml
  const source = `app.del("/users/:id", handler);\n`;
  writeFileSync(join(repo, "server.js"), source);

  const originalCwd = process.cwd();
  process.chdir(elsewhere);
  try {
    const { code, out, err } = await capture(["run", "--repo", repo, "--dry-run"]);

    assert.equal(err, "");
    assert.equal(code, 0);
    assert.equal(DEFAULT_PACK_PATH, join(__dirname, "..", "rules.yaml"));
    assert.ok(out.includes(`pack: ${DEFAULT_PACK_PATH}`), out);
    assert.ok(out.includes("migrate-pack: express-4-to-5 (dry run, nothing written)"), out);
    assert.ok(out.includes(`+app.delete("/users/:id", handler);`), out);
    assert.equal(readFileSync(join(repo, "server.js"), "utf8"), source, "dry run must not write");
  } finally {
    process.chdir(originalCwd);
    rmSync(repo, { recursive: true, force: true });
    rmSync(elsewhere, { recursive: true, force: true });
  }
});

test("fix-manual prints each manual item with surrounding code and writes nothing", async () => {
  const repo = mkdtempSync(join(tmpdir(), "migrate-pack-repo-"));
  const source = [
    `const express = require("express");`,
    `const app = express();`,
    `app.get("/users", (req, res) => {`,
    `  const id = req.param("id");`,
    `  res.json({ id });`,
    `});`,
    ``,
  ].join("\n");
  writeFileSync(join(repo, "server.js"), source);

  try {
    const { code, out, err } = await capture(["fix-manual", "--repo", repo]);

    assert.equal(err, "");
    assert.equal(code, 0);
    assert.ok(out.includes("[1/1] server.js:4  req-param-removed"), out);
    assert.ok(out.includes("Use req.params, req.body or req.query"), out);
    assert.ok(out.includes(`  > 4 |   const id = req.param("id");`), out);
    assert.ok(out.includes(`    2 | const app = express();`), out);
    assert.ok(out.includes(`    6 | });`), out);
    assert.ok(!out.includes(`const express = require("express");`), "only 2 lines above are shown");
    assert.equal(readFileSync(join(repo, "server.js"), "utf8"), source, "fix-manual must not write");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("--help and --version", async () => {
  const help = await capture(["--help"]);
  assert.equal(help.code, 0);
  assert.equal(help.err, "");

  // Each command has its own usage line (spacing between columns is free) with all its options.
  const lines = help.out.split("\n").map((l) => l.trim());
  for (const command of ["run", "fix-manual"]) {
    const usage = lines.find((l) => l.startsWith(`migrate-pack ${command} `));
    assert.ok(usage, `no usage line for "${command}" in:\n${help.out}`);
    for (const option of ["--repo <path>", "--pack", "--dry-run"]) {
      assert.ok(usage.includes(option), `usage line for "${command}" lacks ${option}: ${usage}`);
    }
  }

  // Each option is also explained in the options list.
  for (const option of ["--repo", "--pack", "--dry-run", "--help", "--version"]) {
    assert.ok(lines.some((l) => l.startsWith(option) || l.startsWith(`-h, ${option}`) || l.startsWith(`-v, ${option}`)),
      `option ${option} is not documented in:\n${help.out}`);
  }

  const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"));
  const version = await capture(["--version"]);
  assert.equal(version.code, 0);
  assert.equal(version.out, `${pkg.version}\n`);
});
