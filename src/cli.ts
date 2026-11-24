#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createTwoFilesPatch } from "diff";
import { loadPack } from "./pack";
import { scanRepo } from "./scan";

// Resolved from this file's location (src/ under tsx, dist/ when built), never from the cwd.
const PACKAGE_ROOT = join(__dirname, "..");
export const DEFAULT_PACK_PATH = join(PACKAGE_ROOT, "rules.yaml");

/** Lines of code shown for each manual item: the item's line plus this many above and below. */
const CONTEXT_RADIUS = 2;

const HELP = `migrate-pack: migrate Express 4 code to Express 5 using a rules file

Usage:
  migrate-pack run        --repo <path> [--pack <rules.yaml>] [--dry-run]
  migrate-pack fix-manual --repo <path> [--pack <rules.yaml>] [--dry-run]

Commands:
  run           Apply automatic rules and list items that need manual review.
  fix-manual    Show each manual review item with the code around it.
                Currently read-only: it never changes files.

Options:
  --repo <path>     Repo to migrate (required). node_modules and .git are skipped.
  --pack <path>     Rules file to apply. Default: the bundled Express 4 -> 5 pack.
  --dry-run         run: print a unified diff and write nothing.
                    fix-manual: accepted; it writes nothing either way for now.
  -h, --help        Show this help.
  -v, --version     Show the version.
`;

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

function run(repoArg: string, packPath: string, dryRun: boolean, io: Io): number {
  const pack = loadPack(packPath);
  const files = scanRepo(resolve(repoArg), pack);

  const changed = files.filter((f) => f.after !== f.before);
  for (const f of changed) {
    if (dryRun) {
      io.out(createTwoFilesPatch(`a/${f.rel}`, `b/${f.rel}`, f.before, f.after));
    } else {
      writeFileSync(f.file, f.after);
    }
  }

  const edits = files.flatMap((f) => f.edits);
  const manual = files.flatMap((f) => f.manual.map((m) => ({ ...m, rel: f.rel })));
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
    ...manual.map((m) => `    ${m.rel}:${m.line} [${m.ruleId}] ${m.note}`),
  ];
  io.out(lines.join("\n") + "\n");
  return 0;
}

/** The given 1-based line plus `radius` lines above and below, numbered, with the line marked. */
export function codeContext(text: string, line: number, radius = CONTEXT_RADIUS): string {
  const all = text.split("\n").map((l) => (l.endsWith("\r") ? l.slice(0, -1) : l));
  const from = Math.max(1, line - radius);
  const to = Math.min(all.length, line + radius);
  const width = String(to).length;
  const out: string[] = [];
  for (let n = from; n <= to; n++) {
    out.push(`  ${n === line ? ">" : " "} ${String(n).padStart(width)} | ${all[n - 1]}`);
  }
  return out.join("\n");
}

function fixManual(repoArg: string, packPath: string, dryRun: boolean, io: Io): number {
  const pack = loadPack(packPath);
  const files = scanRepo(resolve(repoArg), pack);
  const items = files.flatMap((f) => f.manual.map((m) => ({ ...m, file: f })));
  const pending = files.filter((f) => f.after !== f.before).length;

  const lines = [`migrate-pack fix-manual: ${pack.name}${dryRun ? " (dry run)" : ""}`, `  pack: ${packPath}`];
  if (pending > 0) {
    lines.push(
      `  note: ${pending} file(s) still have automatic edits pending (run \`migrate-pack run\` first).`,
      `        Code below is shown as it will look after those edits.`,
    );
  }
  lines.push("");

  items.forEach((item, i) => {
    lines.push(
      `[${i + 1}/${items.length}] ${item.file.rel}:${item.line}  ${item.ruleId}`,
      `  ${item.note}`,
      codeContext(item.file.after, item.line),
      "",
    );
  });

  lines.push(`${items.length} manual item(s). Nothing was changed: fix-manual is read-only for now.`);
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

    const command = positionals[0];
    if ((command !== "run" && command !== "fix-manual") || !values.repo) {
      io.err(HELP);
      return 2;
    }

    const packPath = values.pack ? resolve(values.pack) : DEFAULT_PACK_PATH;
    const dryRun = values["dry-run"] === true;
    return command === "run"
      ? run(values.repo, packPath, dryRun, io)
      : fixManual(values.repo, packPath, dryRun, io);
  } catch (err) {
    io.err(`migrate-pack: ${(err as Error).message}\n`);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
