import { CallExpression, Node, Project, SourceFile, SyntaxKind } from "ts-morph";
import type { CallMatch, Match, RouteStringMatch, Rule } from "./pack";

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

function isCallMatch(call: CallExpression, m: CallMatch): boolean {
  const parts = calleeParts(call);
  if (!parts || parts.object !== m.object || parts.method !== m.method) return false;
  if (m.args !== undefined && call.getArguments().length !== m.args) return false;
  if (m.exceptReorderable && canReorder(call)) return false;
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

/** reorder-args applies only to exactly 2 arguments where the second is a number literal. */
function canReorder(call: CallExpression): boolean {
  const args = call.getArguments();
  return args.length === 2 && Node.isNumericLiteral(args[1]);
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
      } else if (rule.type === "reorder-args" && canReorder(call)) {
        const [value, status] = call.getArguments().map((a) => a.getText());
        const object = callee.getExpression().getText();
        call.replaceWithText(`${object}.${rule.reorder!.chain}(${status}).${callee.getName()}(${value})`);
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
