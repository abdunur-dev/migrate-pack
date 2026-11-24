import { CallExpression, Node, Project, SourceFile, SyntaxKind } from "ts-morph";
import type { CallMatch, Match, ReorderSpec, RouteStringMatch, Rule } from "./pack";

export interface Edit {
  ruleId: string;
  line: number;
}

export interface ManualItem {
  ruleId: string;
  line: number;
  note: string;
}

export interface FileResult {
  before: string;
  after: string;
  edits: Edit[];
  manual: ManualItem[];
}

/** For `<identifier>.<method>(...)`, returns the identifier and method names; otherwise undefined. */
function calleeParts(call: CallExpression): { object: string; method: string } | undefined {
  const callee = call.getExpression();
  if (!Node.isPropertyAccessExpression(callee)) return undefined;
  const target = callee.getExpression();
  if (!Node.isIdentifier(target)) return undefined;
  return { object: target.getText(), method: callee.getName() };
}

/** A literal written in the source whose runtime value can never be a number. */
function isDefinitelyNotNumber(node: Node): boolean {
  return (
    Node.isObjectLiteralExpression(node) ||
    Node.isArrayLiteralExpression(node) ||
    Node.isStringLiteral(node) ||
    Node.isNoSubstitutionTemplateLiteral(node) ||
    Node.isTemplateExpression(node) ||
    Node.isTrueLiteral(node) ||
    Node.isFalseLiteral(node) ||
    Node.isNullLiteral(node)
  );
}

/**
 * Which argument is the status and which is the value, or undefined if the call must not be
 * rewritten. Mirrors Express 4: with 2 args, a numeric second arg is the status; otherwise
 * the first arg is. We only rewrite when that is decidable from literals in the source.
 */
function reorderPlan(call: CallExpression, spec: ReorderSpec): { status: Node; value: Node } | undefined {
  const args = call.getArguments();
  if (args.length !== 2) return undefined;
  const [first, second] = args;

  if (spec.forms.includes("status-last") && Node.isNumericLiteral(second)) {
    return { status: second, value: first };
  }
  if (spec.forms.includes("status-first") && Node.isNumericLiteral(first) && isDefinitelyNotNumber(second)) {
    return { status: first, value: second };
  }
  return undefined;
}

function isCallMatch(call: CallExpression, m: CallMatch): boolean {
  const parts = calleeParts(call);
  if (!parts || parts.object !== m.object || parts.method !== m.method) return false;
  if (m.args !== undefined && call.getArguments().length !== m.args) return false;
  if (m.exceptReorder && reorderPlan(call, m.exceptReorder)) return false;
  return true;
}

/** String-literal values of a route path argument: a string, or an array of strings. */
function routePaths(arg: Node | undefined): string[] {
  if (!arg) return [];
  if (Node.isStringLiteral(arg) || Node.isNoSubstitutionTemplateLiteral(arg)) {
    return [arg.getLiteralValue()];
  }
  if (Node.isArrayLiteralExpression(arg)) {
    return arg.getElements().flatMap((el) => routePaths(el));
  }
  return [];
}

function isRouteStringMatch(call: CallExpression, m: RouteStringMatch): boolean {
  const parts = calleeParts(call);
  if (!parts || !m.objects.includes(parts.object) || !m.methods.includes(parts.method)) return false;
  return routePaths(call.getArguments()[0]).some((p) => p.includes(m.contains));
}

function findCalls(sf: SourceFile, match: Match): CallExpression[] {
  return sf
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((call) => (match.kind === "call" ? isCallMatch(call, match) : isRouteStringMatch(call, match)));
}

export function applyRules(sf: SourceFile, rules: Rule[]): FileResult {
  const before = sf.getFullText();
  const edits: Edit[] = [];
  const manual: ManualItem[] = [];

  for (const rule of rules) {
    // Work from the end of the file backwards so earlier nodes are untouched by later edits.
    const calls = findCalls(sf, rule.match).reverse();

    for (const call of calls) {
      const line = call.getStartLineNumber();

      if (rule.type === "manual") {
        manual.push({ ruleId: rule.id, line, note: rule.note ?? "" });
        continue;
      }

      const callee = call.getExpression();
      if (!Node.isPropertyAccessExpression(callee)) continue;

      if (rule.type === "deterministic") {
        callee.getNameNode().replaceWithText(rule.replace!.method);
        edits.push({ ruleId: rule.id, line });
      } else if (rule.type === "reorder-args") {
        const plan = reorderPlan(call, rule.reorder!);
        if (!plan) continue;
        const object = callee.getExpression().getText();
        call.replaceWithText(
          `${object}.${rule.reorder!.chain}(${plan.status.getText()}).${callee.getName()}(${plan.value.getText()})`,
        );
        edits.push({ ruleId: rule.id, line });
      }
    }
  }

  edits.sort((a, b) => a.line - b.line);
  manual.sort((a, b) => a.line - b.line);
  return { before, after: sf.getFullText(), edits, manual };
}

/** Convenience for tests: run rules over a string of code. */
export function transformSource(code: string, rules: Rule[], fileName = "input.ts"): FileResult {
  const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true } });
  return applyRules(project.createSourceFile(fileName, code), rules);
}
