import { createTwoFilesPatch } from "diff";

/** The item's line plus this many lines above and below: 7 + 1 + 7 = 15 lines. */
export const SUGGEST_RADIUS = 7;

export const MODEL = "claude-opus-5-5";

export interface ModelPrompt {
  system: string;
  user: string;
}

/** Sends one prompt to a model and returns its text reply. Injected so tests can mock it. */
export type CallModel = (prompt: ModelPrompt) => Promise<string>;

export interface Suggestion {
  /** Unified diff against the file. Empty when the model proposed no change. */
  diff: string;
  explanation: string;
  changed: boolean;
}

const SYSTEM = `You help migrate code from Express 4 to Express 5.
You get a short code snippet and a note describing what must change.
Rewrite only the snippet. Keep every line that does not need to change exactly as it is, including indentation.
If the snippet alone is not enough to fix it safely, return the snippet unchanged and say what is missing.
Reply in exactly this format and nothing else:
<replacement>
the full rewritten snippet
</replacement>
<explanation>one or two sentences</explanation>`;

function splitLines(text: string): { lines: string[]; eol: string } {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  return { lines: text.split("\n").map((l) => (l.endsWith("\r") ? l.slice(0, -1) : l)), eol };
}

/** 1-based inclusive line range of the window around `line`, clipped to the file. */
export function windowRange(lineCount: number, line: number, radius = SUGGEST_RADIUS) {
  return { start: Math.max(1, line - radius), end: Math.min(lineCount, line + radius) };
}

/** The only data sent to the model: the rule note and the code window. */
export function buildPrompt(note: string, snippet: string, lineInSnippet: number): ModelPrompt {
  return {
    system: SYSTEM,
    user: [
      `Note: ${note}`,
      ``,
      `The flagged code is on line ${lineInSnippet} of the snippet.`,
      ``,
      `<snippet>`,
      snippet,
      `</snippet>`,
    ].join("\n"),
  };
}

function between(text: string, open: string, close: string): string | undefined {
  const a = text.indexOf(open);
  const b = text.indexOf(close, a + open.length);
  if (a === -1 || b === -1) return undefined;
  return text.slice(a + open.length, b);
}

export function parseReply(reply: string): { replacement: string; explanation: string } {
  const raw = between(reply, "<replacement>", "</replacement>");
  if (raw === undefined) throw new Error("model reply had no <replacement> block");
  // Drop the single newline that follows <replacement> and precedes </replacement>.
  const replacement = raw.replace(/^\r?\n/, "").replace(/\r?\n$/, "");
  const explanation = (between(reply, "<explanation>", "</explanation>") ?? "").trim();
  return { replacement, explanation };
}

/**
 * Asks the model for a fix to the window around `line` and returns it as a diff.
 * Never writes to disk.
 */
export async function suggestFix(
  input: { rel: string; text: string; line: number; note: string },
  callModel: CallModel,
): Promise<Suggestion> {
  const { lines, eol } = splitLines(input.text);
  const { start, end } = windowRange(lines.length, input.line);
  const snippet = lines.slice(start - 1, end).join("\n");

  const reply = await callModel(buildPrompt(input.note, snippet, input.line - start + 1));
  const { replacement, explanation } = parseReply(reply);

  if (replacement === snippet) return { diff: "", explanation, changed: false };

  const newLines = [...lines.slice(0, start - 1), ...replacement.split(/\r?\n/), ...lines.slice(end)];
  const before = lines.join(eol);
  const after = newLines.join(eol);
  const diff = createTwoFilesPatch(`a/${input.rel}`, `b/${input.rel}`, before, after);
  return { diff, explanation, changed: true };
}

/** Real model call through the Anthropic SDK. Loaded lazily so other commands never need it. */
export function anthropicCallModel(apiKey: string): CallModel {
  return async ({ system, user }) => {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      // On a safety decline, the API retries on a fallback model it picks by category.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: user }],
    });

    if (response.stop_reason === "refusal") {
      throw new Error("the model declined to propose a fix for this code");
    }
    if (response.stop_reason === "max_tokens") {
      throw new Error("the model's reply was cut off (max_tokens)");
    }
    return response.content.map((block) => (block.type === "text" ? block.text : "")).join("");
  };
}
