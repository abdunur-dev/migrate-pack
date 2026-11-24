#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createTwoFilesPatch } from "diff";
import { Project } from "ts-morph";
import { applyRules, Edit, ManualItem } from "./engine";
import { loadPack } from "./pack";

// Resolved from this file's location (src/ under tsx, dist/ when built), never from the cwd.
const PACKAGE_ROOT = join(__dirname, "..");
export const DEFAULT_PACK_PATH = join(PACKAGE_ROOT, "rules.yaml");

const HELP = `migrate-pack: migrate Express 4 code to Express 5 using a rules file

Usage:
  migrate-pack run --repo <path> [--pack <rules.yaml>] [--dry-run]

Options:
  --repo <path>     Repo to migrate (required). node_modules and .git are skipped.
  --pack <path>     Rules file to apply. Default: the bundled Express 4 -> 5 pack.
  --dry-run         Print a unified diff and write nothing.
  -h, --help        Show this help.
  -v, --version     Show the version.
`;

const SKIP_DIRS = new Set(["node_modules", ".git"]);

export interface Io {
  out: (text: string) => void;
  err: (text: string) => void;
}

const defaultIo: Io = {
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
};

function version(): string {
  return JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8")).version;
}

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

function run(repoArg: string, packPath: string, dryRun: boolean, io: Io): number {
  const repo = resolve(repoArg);
  const pack = loadPack(packPath);
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
        io.out(createTwoFilesPatch(`a/${rel}`, `b/${rel}`, result.before, result.after));
      } else {
        writeFileSync(file, result.after);
      }
    }
  }

  const perRule = new Map<string, number>();
  for (const e of edits) perRule.set(e.ruleId, (perRule.get(e.ruleId) ?? 0) + 1);

  const lines = [
    "",
    `migrate-pack: ${pack.name}${dryRun ? " (dry run, nothing written)" : ""}`,
    `  pack: ${packPath}`,
    `  scanned ${files.length} files`,
    `  ${dryRun ? "would change" : "changed"} ${changed.length} files, ${edits.length} edits`,
    ...[...perRule].map(([id, n]) => `    ${id}: ${n}`),
    `  needs manual review: ${manual.length}`,
    ...manual.map((m) => `    ${m.file}:${m.line} [${m.ruleId}] ${m.note}`),
  ];
  io.out(lines.join("\n") + "\n");
  return 0;
}

export function main(argv: string[], io: Io = defaultIo): number {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        pack: { type: "string" },
        repo: { type: "string" },
        "dry-run": { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", short: "v", default: false },
      },
    });

    if (values.help) {
      io.out(HELP);
      return 0;
    }
    if (values.version) {
      io.out(version() + "\n");
      return 0;
    }
    if (positionals[0] !== "run" || !values.repo) {
      io.err(HELP);
      return 2;
    }

    const packPath = values.pack ? resolve(values.pack) : DEFAULT_PACK_PATH;
    return run(values.repo, packPath, values["dry-run"] === true, io);
  } catch (err) {
    io.err(`migrate-pack: ${(err as Error).message}\n`);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
