import { readFileSync } from "node:fs";
import { parse } from "yaml";

export type RuleType = "deterministic" | "reorder-args" | "manual";

/**
 * A call of the form `<object>.<method>(...)`, e.g. `app.del(...)`. YAML: `call: app.del`
 * Optional filters:
 *   args: N                   only calls with exactly N arguments
 *   exceptReorderable: true   skip calls a reorder-args rule would rewrite
 *                             (exactly 2 args, second is a number literal)
 */
export interface CallMatch {
  kind: "call";
  object: string;
  method: string;
  args?: number;
  exceptReorderable?: boolean;
}

/**
 * A routing call (`<object>.<method>(path, ...)`) whose path string, or any string in a
 * path array, contains `contains`. YAML: `routeString: { objects, methods, contains }`
 */
export interface RouteStringMatch {
  kind: "route-string";
  objects: string[];
  methods: string[];
  contains: string;
}

export type Match = CallMatch | RouteStringMatch;

export interface Rule {
  id: string;
  description: string;
  type: RuleType;
  match: Match;
  /** deterministic: rename the method. */
  replace?: { method: string };
  /** reorder-args: `obj.m(a, <number>)` -> `obj.<chain>(<number>).m(a)`. */
  reorder?: { chain: string };
  /** manual: why a human must review it. */
  note?: string;
}

export interface Pack {
  name: string;
  rules: Rule[];
}

export function loadPack(path: string): Pack {
  return parsePack(readFileSync(path, "utf8"));
}

function stringList(value: unknown, where: string, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every((v) => typeof v === "string" && v)) {
    throw new Error(`${where}: ${field} must be a non-empty list of strings`);
  }
  return value;
}

function parseMatch(m: any, where: string): Match {
  if (m?.call !== undefined) {
    const parts = String(m.call).split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(`${where}: match.call must look like "object.method"`);
    }
    if (m.args !== undefined && (!Number.isInteger(m.args) || m.args < 0)) {
      throw new Error(`${where}: match.args must be a non-negative integer`);
    }
    if (m.exceptReorderable !== undefined && typeof m.exceptReorderable !== "boolean") {
      throw new Error(`${where}: match.exceptReorderable must be true or false`);
    }
    return {
      kind: "call",
      object: parts[0],
      method: parts[1],
      args: m.args,
      exceptReorderable: m.exceptReorderable,
    };
  }
  if (m?.routeString !== undefined) {
    const r = m.routeString;
    if (typeof r.contains !== "string" || !r.contains) {
      throw new Error(`${where}: match.routeString.contains must be a non-empty string`);
    }
    return {
      kind: "route-string",
      objects: stringList(r.objects, where, "match.routeString.objects"),
      methods: stringList(r.methods, where, "match.routeString.methods"),
      contains: r.contains,
    };
  }
  throw new Error(`${where}: match needs either "call" or "routeString"`);
}

export function parsePack(text: string): Pack {
  const raw = parse(text) as any;
  if (!raw || !Array.isArray(raw.rules)) {
    throw new Error("pack must have a `rules` list");
  }

  const rules = raw.rules.map((r: any, i: number): Rule => {
    const where = `rule #${i + 1}${r?.id ? ` (${r.id})` : ""}`;
    if (!r?.id || !r?.description) throw new Error(`${where}: needs id and description`);
    if (r.type !== "deterministic" && r.type !== "reorder-args" && r.type !== "manual") {
      throw new Error(`${where}: type must be "deterministic", "reorder-args" or "manual"`);
    }

    const match = parseMatch(r.match, where);

    // Code-editing rules only work on plain `object.method(...)` calls.
    if (r.type !== "manual" && match.kind !== "call") {
      throw new Error(`${where}: ${r.type} rules must use match.call`);
    }
    if (r.type === "deterministic" && !r.replace?.method) {
      throw new Error(`${where}: deterministic rules need replace.method`);
    }
    if (r.type === "reorder-args" && !r.reorder?.chain) {
      throw new Error(`${where}: reorder-args rules need reorder.chain`);
    }
    if (r.type === "manual" && !r.note) {
      throw new Error(`${where}: manual rules need a note`);
    }

    return {
      id: r.id,
      description: r.description,
      type: r.type,
      match,
      replace: r.replace ? { method: String(r.replace.method) } : undefined,
      reorder: r.reorder ? { chain: String(r.reorder.chain) } : undefined,
      note: r.note,
    };
  });

  return { name: raw.name ?? "unnamed-pack", rules };
}
