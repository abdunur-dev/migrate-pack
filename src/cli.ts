#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createTwoFilesPatch } from "diff";
import { loadPack } from "./pack";
import { scanRepo } from "./scan";
import { anthropicCallModel, CallModel, MODEL, suggestFix } from "./suggest";

// Resolved from this file's location (src/ under tsx, dist/ when built), never from the cwd.
const PACKAGE_ROOT = join(__dirname, "..");
export const DEFAULT_PACK_PATH = join(PACKAGE_ROOT, "rules.yaml");

/** Lines of code shown for each manual item: the item's line plus this many above and below. */
const CONTEXT_RADIUS = 2;

const HELP = `migrate-pack: migrate Express 4 code to Express 5 using a rules file

Usage:
  migrate-pack run        --repo <path> [--pack <rules.yaml>] [--dry-run]
  migrate-pack fix-manual --repo <path> [--pack <rules.yaml>] [--dry-run] [--item <n> [--suggest]]

Commands:
  run           Apply automatic rules and list items that need manual review.
  fix-manual    Show each manual review item with the code around it.
                Never changes files.

Options:
  --repo <path>     Repo to migrate (required). node_modules and .git are skipped.
  --pack <path>     Rules file to apply. Default: the bundled Express 4 -> 5 pack.
  --dry-run         run: print a unified diff and write nothing.
                    fix-manual: accepted; it writes nothing either way.
  --item <n>        fix-manual: show only manual item number n (as numbered in the listing).
  --suggest         fix-manual, with --item: ask an AI model (${MODEL}) to propose a fix
                    and print it as a diff. Sends only the rule note and 15 lines of code
                    around the item. Needs ANTHROPIC_API_KEY. Writes nothing.
  -h, --help        Show this help.
  -v, --version     Show the version.
`;

export interface Io {
  out: (text: string) => void;
  err: (text: string) => void;
}

export interface Deps {
  env: NodeJS.ProcessEnv;
  /** Builds the model caller from the API key. Tests replace this with a mock. */
  makeCallModel: (apiKey: string) => CallModel;
}

const defaultIo: Io = {
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
};

const defaultDeps: Deps = { env: process.env, makeCallModel: anthropicCallModel };

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

interface FixManualOptions {
  repo: string;
  packPath: string;
  dryRun: boolean;
  item?: number;
  suggest: boolean;
}

async function fixManual(opts: FixManualOptions, io: Io, deps: Deps): Promise<number> {
  // Check the key before doing any work, so a missing key fails fast and clearly.
  const apiKey = deps.env.ANTHROPIC_API_KEY;
  if (opts.suggest && !apiKey) {
    io.err(
      "migrate-pack: --suggest needs an Anthropic API key in the ANTHROPIC_API_KEY environment variable.\n" +
        "  Set it and try again, or leave out --suggest to only list the items.\n",
    );
    return 1;
  }

  const pack = loadPack(opts.packPath);
  const files = scanRepo(resolve(opts.repo), pack);
  const items = files.flatMap((f) => f.manual.map((m) => ({ ...m, file: f })));
  const pending = files.filter((f) => f.after !== f.before).length;

  if (opts.item !== undefined && (opts.item < 1 || opts.item > items.length)) {
    io.err(`migrate-pack: --item ${opts.item} does not exist; there are ${items.length} manual item(s).\n`);
    return 2;
  }

  const lines = [`migrate-pack fix-manual: ${pack.name}${opts.dryRun ? " (dry run)" : ""}`, `  pack: ${opts.packPath}`];
  if (pending > 0) {
    lines.push(
      `  note: ${pending} file(s) still have automatic edits pending (run \`migrate-pack run\` first).`,
      `        Code below is shown as it will look after those edits.`,
    );
  }
  lines.push("");

  items.forEach((item, i) => {
    if (opts.item !== undefined && opts.item !== i + 1) return;
    lines.push(
      `[${i + 1}/${items.length}] ${item.file.rel}:${item.line}  ${item.ruleId}`,
      `  ${item.note}`,
      codeContext(item.file.after, item.line),
      "",
    );
  });

  if (!opts.suggest) {
    lines.push(`${items.length} manual item(s). Nothing was changed: fix-manual never writes files.`);
    io.out(lines.join("\n") + "\n");
    return 0;
  }

  io.out(lines.join("\n") + "\n");
  const item = items[opts.item! - 1];
  io.out(`Asking ${MODEL} for a fix (sending the rule note and 15 lines of code only)...\n\n`);

  const suggestion = await suggestFix(
    { rel: item.file.rel, text: item.file.after, line: item.line, note: item.note },
    deps.makeCallModel(apiKey!),
  );

  if (suggestion.explanation) io.out(`Model: ${suggestion.explanation}\n\n`);
  io.out(suggestion.changed ? suggestion.diff : "The model proposed no change.\n");
  io.out(`\nNothing was written. This is an AI suggestion: review it, then apply it yourself if it is right.\n`);
  return 0;
}

export async function main(argv: string[], io: Io = defaultIo, deps: Deps = defaultDeps): Promise<number> {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        pack: { type: "string" },
        repo: { type: "string" },
        "dry-run": { type: "boolean", default: false },
        item: { type: "string" },
        suggest: { type: "boolean", default: false },
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
    if (command === "run") {
      if (values.item !== undefined || values.suggest) {
        io.err("migrate-pack: --item and --suggest only apply to fix-manual.\n");
        return 2;
      }
      return run(values.repo, packPath, dryRun, io);
    }

    let item: number | undefined;
    if (values.item !== undefined) {
      item = Number(values.item);
      if (!Number.isInteger(item)) {
        io.err(`migrate-pack: --item must be a whole number, got "${values.item}".\n`);
        return 2;
      }
    }
    if (values.suggest && item === undefined) {
      io.err("migrate-pack: --suggest needs --item <n> to pick one manual item.\n");
      return 2;
    }

    return await fixManual({ repo: values.repo, packPath, dryRun, item, suggest: values.suggest === true }, io, deps);
  } catch (err) {
    io.err(`migrate-pack: ${(err as Error).message}\n`);
    return 1;
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
