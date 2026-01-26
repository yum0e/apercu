import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createTestRenderer } from "@opentui/core/testing";
import { DiffViewerRuntime, buildDiffDocument } from "./tui/index.js";
import { loadJjDiffOutput } from "./jj.js";

const DEBUG_LOG_PATH = resolve(process.cwd(), "apercu.tui.debug.log");
const DEBUG_LOG_MAX_LINES = 4000;

export async function runDebug(): Promise<void> {
  const document = loadDocumentForDebug();
  const { renderer, renderOnce, captureCharFrame } = await createTestRenderer({
    width: 120,
    height: 40,
  });

  const runtime = new DiffViewerRuntime(document, {
    renderer,
    exitProcess: false,
    setupTerminal: false,
  });
  await runtime.start();
  await renderOnce();

  const steps = [
    { label: "initial", action: () => void 0 },
    { label: "jump-next-file", action: () => emitKey(renderer, "J") },
    { label: "jump-next-hunk", action: () => emitKey(renderer, ")") },
    { label: "next-unreviewed", action: () => emitKey(renderer, "n") },
    { label: "scroll-down", action: () => emitKey(renderer, "j") },
    { label: "scroll-up", action: () => emitKey(renderer, "k") },
    { label: "prev-unreviewed", action: () => emitKey(renderer, "p") },
    { label: "prev-hunk", action: () => emitKey(renderer, "(") },
    { label: "prev-file", action: () => emitKey(renderer, "K") },
  ];

  writeBoundedLog([`=== apercu debug ${new Date().toISOString()} ===`]);

  for (const step of steps) {
    step.action();
    await renderOnce();
    const snapshot = runtime.getViewSnapshot();
    const frame = captureCharFrame();
    const trimmedFrame = frame
      .split(/\r?\n/)
      .slice(0, 20)
      .map((line) => line.replace(/\s+$/g, ""))
      .join("\n");

    writeBoundedLog([
      `-- step=${step.label}`,
      `topBar: ${snapshot.topBar}`,
      `stickyHeader: ${snapshot.stickyHeader}`,
      `leftRail: ${snapshot.leftRail.split("\n")[0] ?? ""}`,
      `status: ${snapshot.status}`,
      "frame:",
      trimmedFrame,
    ]);
  }

  renderer.destroy();
}

function emitKey(
  renderer: { keyInput: { emit: (event: string, key: any) => void } },
  name: string,
) {
  renderer.keyInput.emit("keypress", { name, ctrl: false, shift: false });
}

function loadDocumentForDebug() {
  try {
    const { diff, stat } = loadJjDiffOutput();
    const document = buildDiffDocument(diff, stat);
    if (document.files.length > 0) {
      return document;
    }
  } catch {
    // Ignore and fall back to sample diff.
  }
  return buildDiffDocument(sampleDiff(), sampleStat());
}

function writeBoundedLog(lines: string[]): void {
  const existing = readExistingLog();
  const next = existing.concat(lines);
  const trimmed =
    next.length > DEBUG_LOG_MAX_LINES ? next.slice(next.length - DEBUG_LOG_MAX_LINES) : next;
  writeFileSync(DEBUG_LOG_PATH, `${trimmed.join("\n")}\n`, "utf8");
}

function readExistingLog(): string[] {
  try {
    const content = readFileSync(DEBUG_LOG_PATH, "utf8");
    return content.split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function sampleDiff(): string {
  return [
    "diff --git a/a.txt b/a.txt",
    "--- a/a.txt",
    "+++ b/a.txt",
    "@@ -1,1 +1,1 @@",
    "-old",
    "+new",
    "",
    "diff --git a/b.txt b/b.txt",
    "--- a/b.txt",
    "+++ b/b.txt",
    "@@ -1,2 +1,2 @@",
    "-line1",
    "-line2",
    "+line1 changed",
    "+line2",
  ].join("\n");
}

function sampleStat(): string {
  return ["a.txt | 2 +-", "b.txt | 4 ++--"].join("\n");
}
