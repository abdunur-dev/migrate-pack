import { spawnSync } from "node:child_process";

export interface TestRunResult {
  passed: boolean;
  /** Exit code of `npm test`, or null if it could not start or was killed (e.g. timeout). */
  exitCode: number | null;
  /** stdout followed by stderr. */
  output: string;
}

/** Runs `npm test` in repoPath and reports whether it passed. */
export function runTests(repoPath: string, timeoutMs = 10 * 60 * 1000): TestRunResult {
  // A fixed command string through the shell, so `npm` resolves to npm.cmd on Windows.
  const result = spawnSync("npm test", {
    cwd: repoPath,
    shell: true,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, CI: "true" }, // keeps watch-mode test runners from waiting forever
  });

  const output = (result.stdout ?? "") + (result.stderr ?? "");
  if (result.error) {
    return { passed: false, exitCode: null, output: `${output}${result.error.message}\n` };
  }
  return { passed: result.status === 0, exitCode: result.status, output };
}
