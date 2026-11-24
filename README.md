# migrate-pack

migrate-pack migrates Express 4 code to Express 5 by applying the rules in a YAML rules file (a "pack") to a JavaScript/TypeScript repo. This is an early version: it covers a small number of changes and is not a complete migration.

## Why

When a library ships a breaking release, the people who know the changes best are its maintainers. The idea is that maintainers publish a rules file describing the migration, and a generic tool applies it for their users. That gives users safe, reviewable edits for the mechanical changes, and a clear list of what still needs a human. The pack in this repo (`rules.yaml`) was written for this project. It is not published by the Express team.

## How it works

- The tool scans the repo for `.js` and `.ts` files. It skips `node_modules`, `.git` and `.d.ts` files.
- Each file is parsed with [ts-morph](https://ts-morph.com/), and rules match on syntax tree nodes, not text. Strings and comments that happen to contain `app.del` are never touched. No regex is used on source code.
- **Automatic rules** (`deterministic` and `reorder-args` in the pack) edit the code.
- **Manual rules** report a file and line with a note, and never edit.
- When a call is ambiguous, the tool reports it and does not guess. For example, `res.json(404, someVar)` or `res.json(200, 201)` is reported for review instead of being rewritten.

## Install and usage

Requires Node 20+.

```sh
npm install
npm test
```

```
migrate-pack run --repo <path> [--pack <rules.yaml>] [--dry-run]
migrate-pack fix-manual --repo <path> [--pack <rules.yaml>] [--dry-run] [--item <n> [--suggest]]
migrate-pack --help
migrate-pack --version
```

`fix-manual` lists every manual review item with its note and the code around it: the reported line plus 2 lines above and below. It never changes files.

`fix-manual --item <n> --suggest` asks an AI model (`claude-opus-5-5`, via the Anthropic API) to propose a fix for one item, and prints the proposal as a diff.
- It needs an `ANTHROPIC_API_KEY` environment variable.
- It sends only the rule's note and the 15 lines of code around the item. It does not send file names, paths or any other code.
- It writes nothing. Review the diff and apply it yourself if it is right.
- AI suggestions can be wrong.

If you leave out `--pack`, the tool uses the Express 4 to 5 pack bundled with migrate-pack (`rules.yaml`). It finds that file inside the package, not in the current directory. Pass `--pack <path>` to use your own rules file.

Preview the changes. `--dry-run` prints a unified diff and writes nothing:

```sh
npm start -- run --repo /path/to/your/app --dry-run
```

Apply the changes, which edits the files in place:

```sh
npm start -- run --repo /path/to/your/app
```

Or build first and run the compiled CLI:

```sh
npm run build
node dist/cli.js run --repo /path/to/your/app [--dry-run]
```

Without `--dry-run`, files are overwritten with no backup. Run it on a clean git working tree so you can review and revert with git.

At the end, the tool prints a summary to the terminal:
- how many files it scanned and changed
- the number of edits per rule
- every manual item as `file:line [rule-id] note`

It does not write a report file.

## Automatic rules

| Rule id | Old | New |
| --- | --- | --- |
| `app-del-to-delete` | `app.del(...)` | `app.delete(...)` |
| `req-accepts-charset-plural` | `req.acceptsCharset(...)` | `req.acceptsCharsets(...)` |
| `req-accepts-encoding-plural` | `req.acceptsEncoding(...)` | `req.acceptsEncodings(...)` |
| `req-accepts-language-plural` | `req.acceptsLanguage(...)` | `req.acceptsLanguages(...)` |
| `res-sendfile-camelcase` | `res.sendfile(...)` | `res.sendFile(...)` |
| `res-json-status-arg` | `res.json(obj, 201)` | `res.status(201).json(obj)` |
| `res-json-status-arg` | `res.json(404, { ... })` | `res.status(404).json({ ... })` |

`res-json-status-arg` only rewrites calls with exactly 2 arguments:
- **Status last:** the second argument is a number literal and the first is not.
- **Status first:** the first argument is a number literal, and the second is written directly in the call as an object, array, string, template, `true`, `false` or `null`. In Express 4, a second argument that is a number at runtime is used as the status. So `res.json(404, someVar)` cannot be rewritten safely.

## Manual detectors

These report `file:line` and never edit:

- **`res-json-two-args-unhandled`:** reports `res.json(a, b)` calls that `res-json-status-arg` did not rewrite. Examples are `res.json(obj, status)`, `res.json(404, someVar)` and `res.json(200, 201)`.
- **`req-param-removed`:** reports `req.param(...)`, which was removed in Express 5. You need to choose `req.params`, `req.body` or `req.query` yourself.
- **`route-wildcard`:** reports route paths containing `*` in calls to `all`, `delete`, `get`, `head`, `options`, `patch`, `post`, `put`, `use` or `route` on `app` or `router`. Express 5 changed path matching, and wildcards must now be named.

## Known limits

- **Matching is by variable name only.** Rules match `app`, `req`, `res` and `router` by name and do not check that the variable comes from `express()` or an Express handler. Calls on differently named variables are missed, for example `request.acceptsCharset(...)` or `server.del(...)`. Unrelated objects that happen to use these names would be matched.
- **Only literal route paths are checked.** `route-wildcard` reads plain strings, template strings without `${}` and arrays of those. It misses paths held in variables or built at runtime, and it ignores regex routes.
- **Wildcard routes and `req.param` are reported, not fixed.**
- **Only `.js` and `.ts` files are scanned.** `.mjs`, `.cjs`, `.jsx` and `.tsx` files are skipped.
- **Most Express 5 changes are not covered yet.** A clean run does not mean the app is ready for Express 5.

## Roadmap

- Check that `app`, `req` and `res` actually come from `express()` or route handlers, instead of matching by name.
- Hand ambiguous items to an AI agent that proposes a fix for a human to review. Today, those items are only reported.
- More rules from the Express 5 migration guide.
- Packs for other libraries.

## Check against the official guide

Every rule here should be checked against the official [Express 5 migration guide](https://expressjs.com/en/guide/migrating-5.html) before you rely on it. If a rule and the guide disagree, the guide is right.
