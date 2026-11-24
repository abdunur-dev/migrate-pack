import { readFileSync } from "node:fs";
import { parse } from "yaml";

export type RuleType = "deterministic" | "reorder-args" | "manual";

/**
 * Which 2-argument shapes a reorder-args rule rewrites into `obj.<chain>(<status>).m(<value>)`:
 *   status-last:  m(value, <number literal>)
 *   status-first: m(<number literal>, value), only when `value` is a literal that is
 *                 definitely not a number (Express 4 treats a numeric 2nd arg as the status).
 */
export type ReorderForm = "status-last" | "status-first";
const REORDER_FORMS: ReorderForm[] = ["status-last", "status-first"];

export interface ReorderSpec {
  chain: string;
  forms: ReorderForm[];
}

/**
 * A call of the form `<object>.<method>(...)`, e.g. `app.del(...)`. YAML: `call: app.del`
 * Optional filters:
 *   args: N                       only calls with exactly N arguments
 *   exceptRewrittenBy: <rule id>  skip calls that reorder-args rule would rewrite
 */
export interface CallMatch {
  kind: "call";
  object: string;
  method: string;
  args?: number;
  exceptRewrittenBy?: string;
  /** Resolved from exceptRewrittenBy when the pack is parsed. */
  exceptReorder?: ReorderSpec;
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
  /** reorder-args: move the status argument into a chained call. */
  reorder?: ReorderSpec;
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
    if (m.exceptRewrittenBy !== undefined && (typeof m.exceptRewrittenBy !== "string" || !m.exceptRewrittenBy)) {
      throw new Error(`${where}: match.exceptRewrittenBy must be a rule id`);
    }
    return {
      kind: "call",
      object: parts[0],
      method: parts[1],
      args: m.args,
      exceptRewrittenBy: m.exceptRewrittenBy,
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

function parseReorder(r: any, where: string): ReorderSpec {
  if (!r?.chain) throw new Error(`${where}: reorder-args rules need reorder.chain`);
  const forms = stringList(r.forms, where, "reorder.forms");
  for (const f of forms) {
    if (!REORDER_FORMS.includes(f as ReorderForm)) {
      throw new Error(`${where}: unknown reorder form "${f}" (use ${REORDER_FORMS.join(", ")})`);
    }
  }
  return { chain: String(r.chain), forms: forms as ReorderForm[] };
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
    if (r.type === "manual" && !r.note) {
      throw new Error(`${where}: manual rules need a note`);
    }

    return {
      id: r.id,
      description: r.description,
      type: r.type,
      match,
      replace: r.replace ? { method: String(r.replace.method) } : undefined,
      reorder: r.type === "reorder-args" ? parseReorder(r.reorder, where) : undefined,
      note: r.note,
    };
  });

  // Resolve exceptRewrittenBy so the filter uses exactly the referenced rule's forms.
  for (const rule of rules) {
    const m = rule.match;
    if (m.kind !== "call" || !m.exceptRewrittenBy) continue;
    const target = rules.find((r: Rule) => r.id === m.exceptRewrittenBy);
    if (!target || target.type !== "reorder-args" || !target.reorder) {
      throw new Error(`rule ${rule.id}: exceptRewrittenBy must name a reorder-args rule in this pack`);
    }
    m.exceptReorder = target.reorder;
  }

  return { name: raw.name ?? "unnamed-pack", rules };
}
