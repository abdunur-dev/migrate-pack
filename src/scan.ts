import { readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { Project } from "ts-morph";
import { applyRules, Edit, ManualItem } from "./engine";
import type { Pack } from "./pack";

const SKIP_DIRS = new Set(["node_modules", ".git"]);

export interface ScannedFile {
  /** Absolute path. */
  file: string;
  /** Path relative to the repo, with forward slashes. */
  rel: string;
  before: string;
  /** Text after automatic rules. Manual item line numbers refer to this text. */
  after: string;
  edits: Edit[];
  manual: ManualItem[];
}

export function findFiles(dir: string, out: string[] = []): string[] {
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

/** Applies the pack to every file in memory. Never writes to disk. */
export function scanRepo(repo: string, pack: Pack): ScannedFile[] {
  const project = new Project({
    compilerOptions: { allowJs: true },
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  });

  return findFiles(repo).map((file) => {
    const result = applyRules(project.addSourceFileAtPath(file), pack.rules);
    return { file, rel: relative(repo, file).split("\\").join("/"), ...result };
  });
}
