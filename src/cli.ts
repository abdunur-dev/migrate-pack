#!/usr/bin/env node
import { readdirSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createTwoFilesPatch } from "diff";
import { Project } from "ts-morph";
import { applyRules, Edit, ManualItem } from "./engine";
import { loadPack } from "./pack";

const USAGE = "usage: migrate-pack run --pack <rules.yaml> --repo <path> [--dry-run]";
const SKIP_DIRS = new Set(["node_modules", ".git"]);

function findFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) findFiles(full, out);
    } else if (
      entry.isFile() &&
      (extname(entry.name) === ".js" || extname(entry.name) === ".ts") &&
      !entry.name.endsWith(".d.ts")
    ) {
      out.push(full);
    }
  }
  return out;
}

function main(): number {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      pack: { type: "string" },
      repo: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });

  if (positionals[0] !== "run" || !values.pack || !values.repo) {
    console.error(USAGE);
    return 2;
  }

  const dryRun = values["dry-run"] === true;
  const repo = resolve(values.repo);
  const pack = loadPack(values.pack);
  const files = findFiles(repo);

  const project = new Project({
    compilerOptions: { allowJs: true },
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  });

  const changed: string[] = [];
  const edits: (Edit & { file: string })[] = [];
  const manual: (ManualItem & { file: string })[] = [];

  for (const file of files) {
    const rel = relative(repo, file).split("\\").join("/");
    const result = applyRules(project.addSourceFileAtPath(file), pack.rules);

    result.edits.forEach((e) => edits.push({ ...e, file: rel }));
    result.manual.forEach((m) => manual.push({ ...m, file: rel }));

    if (result.after !== result.before) {
      changed.push(rel);
      if (dryRun) {
        process.stdout.write(createTwoFilesPatch(`a/${rel}`, `b/${rel}`, result.before, result.after));
      } else {
        writeFileSync(file, result.after);
      }
    }
  }

  const perRule = new Map<string, number>();
  for (const e of edits) perRule.set(e.ruleId, (perRule.get(e.ruleId) ?? 0) + 1);

  console.log(`\nmigrate-pack: ${pack.name}${dryRun ? " (dry run, nothing written)" : ""}`);
  console.log(`  scanned ${files.length} files`);
  console.log(`  ${dryRun ? "would change" : "changed"} ${changed.length} files, ${edits.length} edits`);
  for (const [id, n] of perRule) console.log(`    ${id}: ${n}`);
  console.log(`  needs manual review: ${manual.length}`);
  for (const m of manual) console.log(`    ${m.file}:${m.line} [${m.ruleId}] ${m.note}`);
  return 0;
}

try {
  process.exitCode = main();
} catch (err) {
  console.error(`migrate-pack: ${(err as Error).message}`);
  process.exitCode = 1;
}
