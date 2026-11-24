import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { transformSource } from "../src/engine";
import { loadPack } from "../src/pack";

const pack = loadPack(join(__dirname, "..", "rules.yaml"));

function ruleById(id: string) {
  const rule = pack.rules.find((r) => r.id === id);
  assert.ok(rule, `rule ${id} missing from rules.yaml`);
  return rule;
}

test("req-accepts-charset-plural renames req.acceptsCharset(...) and nothing else", () => {
  const before = [
    `const cs = req.acceptsCharset("utf-8");`,
    `req.acceptsCharsets("utf-8");`,
    `res.acceptsCharset("utf-8");`,
    `request.acceptsCharset("utf-8"); // known limit: only an identifier named req matches`,
    `const s = "req.acceptsCharset";`,
    `// req.acceptsCharset in a comment`,
    ``,
  ].join("\n");
  const after = [
    `const cs = req.acceptsCharsets("utf-8");`,
    `req.acceptsCharsets("utf-8");`,
    `res.acceptsCharset("utf-8");`,
    `request.acceptsCharset("utf-8"); // known limit: only an identifier named req matches`,
    `const s = "req.acceptsCharset";`,
    `// req.acceptsCharset in a comment`,
    ``,
  ].join("\n");

  const result = transformSource(before, [ruleById("req-accepts-charset-plural")], "a.js");

  assert.equal(result.after, after);
  assert.deepEqual(result.edits, [{ ruleId: "req-accepts-charset-plural", line: 1 }]);
});

test("req-accepts-encoding-plural renames req.acceptsEncoding(...) and nothing else", () => {
  const before = [
    `if (req.acceptsEncoding("gzip")) {}`,
    `req.acceptsEncodings("gzip");`,
    `res.acceptsEncoding("gzip");`,
    `const s = "req.acceptsEncoding";`,
    `// req.acceptsEncoding in a comment`,
    ``,
  ].join("\n");
  const after = [
    `if (req.acceptsEncodings("gzip")) {}`,
    `req.acceptsEncodings("gzip");`,
    `res.acceptsEncoding("gzip");`,
    `const s = "req.acceptsEncoding";`,
    `// req.acceptsEncoding in a comment`,
    ``,
  ].join("\n");

  const result = transformSource(before, [ruleById("req-accepts-encoding-plural")], "a.ts");

  assert.equal(result.after, after);
  assert.deepEqual(result.edits, [{ ruleId: "req-accepts-encoding-plural", line: 1 }]);
});

test("req-accepts-language-plural renames req.acceptsLanguage(...) and nothing else", () => {
  const before = [
    `const lang = req.acceptsLanguage("en", "de");`,
    `req.acceptsLanguages("en");`,
    `req.acceptsLanguage; // property access, not a call`,
    `const s = "req.acceptsLanguage";`,
    `const lang2 = req.acceptsLanguage("fr");`,
    ``,
  ].join("\n");
  const after = [
    `const lang = req.acceptsLanguages("en", "de");`,
    `req.acceptsLanguages("en");`,
    `req.acceptsLanguage; // property access, not a call`,
    `const s = "req.acceptsLanguage";`,
    `const lang2 = req.acceptsLanguages("fr");`,
    ``,
  ].join("\n");

  const result = transformSource(before, [ruleById("req-accepts-language-plural")], "a.js");

  assert.equal(result.after, after);
  assert.deepEqual(result.edits, [
    { ruleId: "req-accepts-language-plural", line: 1 },
    { ruleId: "req-accepts-language-plural", line: 5 },
  ]);
});

test("res-sendfile-camelcase renames res.sendfile(...) and nothing else", () => {
  const before = [
    `app.get("/", (req, res) => res.sendfile("index.html"));`,
    `res.sendFile("/abs/path.html");`,
    `fs.sendfile(out, inp, 0, 10, cb);`,
    `const s = "res.sendfile";`,
    `// res.sendfile in a comment`,
    ``,
  ].join("\n");
  const after = [
    `app.get("/", (req, res) => res.sendFile("index.html"));`,
    `res.sendFile("/abs/path.html");`,
    `fs.sendfile(out, inp, 0, 10, cb);`,
    `const s = "res.sendfile";`,
    `// res.sendfile in a comment`,
    ``,
  ].join("\n");

  const result = transformSource(before, [ruleById("res-sendfile-camelcase")], "a.js");

  assert.equal(result.after, after);
  assert.deepEqual(result.edits, [{ ruleId: "res-sendfile-camelcase", line: 1 }]);
});
