import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_PACK_PATH, main } from "../src/cli";

function capture(argv: string[]) {
  let out = "";
  let err = "";
  const code = main(argv, { out: (t) => (out += t), err: (t) => (err += t) });
  return { code, out, err };
}

test("without --pack, the bundled rules.yaml is used, independent of the current directory", () => {
  const repo = mkdtempSync(join(tmpdir(), "migrate-pack-repo-"));
  const elsewhere = mkdtempSync(join(tmpdir(), "migrate-pack-cwd-")); // has no rules.yaml
  const source = `app.del("/users/:id", handler);\n`;
  writeFileSync(join(repo, "server.js"), source);

  const originalCwd = process.cwd();
  process.chdir(elsewhere);
  try {
    const { code, out, err } = capture(["run", "--repo", repo, "--dry-run"]);

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

test("--help and --version", () => {
  const help = capture(["--help"]);
  assert.equal(help.code, 0);
  assert.ok(help.out.includes("migrate-pack run --repo <path>"), help.out);

  const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"));
  const version = capture(["--version"]);
  assert.equal(version.code, 0);
  assert.equal(version.out, `${pkg.version}\n`);
});
