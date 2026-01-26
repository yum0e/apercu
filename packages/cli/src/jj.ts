import { spawnSync } from "node:child_process";

export interface JjDiffOutput {
  diff: string;
  stat: string;
}

export function loadJjDiffOutput(cwd = process.cwd()): JjDiffOutput {
  const stat = runJj(["diff", "--stat"], cwd);
  const diff = runJj(["diff", "--git", "--color=never"], cwd);
  return { diff, stat };
}

function runJj(args: string[], cwd: string): string {
  const result = spawnSync("jj", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    const error = result.stderr?.trim() || "jj diff failed";
    throw new Error(error);
  }

  return result.stdout ?? "";
}
