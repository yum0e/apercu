import { describe, expect, it } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { DiffViewerRuntime } from "../runtime.js";
import type { DiffDocument } from "../diff.js";

describe("DiffViewerRuntime interactivity", () => {
  it("updates header when jumping between files", async () => {
    const document = createTestDocument();
    const { renderer, renderOnce } = await createTestRenderer({
      width: 80,
      height: 10,
    });

    const runtime = new DiffViewerRuntime(document, {
      renderer,
      exitProcess: false,
      setupTerminal: false,
    });
    await runtime.start();
    await renderOnce();

    const initial = runtime.getViewSnapshot();
    renderer.keyInput.emit("keypress", { name: "J", ctrl: false, shift: false });
    await renderOnce();

    const afterJump = runtime.getViewSnapshot();
    expect(afterJump.topBar).not.toBe(initial.topBar);
    expect(afterJump.stickyHeader).not.toBe(initial.stickyHeader);
  });
});

function createTestDocument(): DiffDocument {
  return {
    diffText: [
      "a.txt",
      "--- a/a.txt",
      "+++ b/a.txt",
      "@@ -1,1 +1,1 @@",
      "-old",
      "+new",
      "",
      "b.txt",
      "--- a/b.txt",
      "+++ b/b.txt",
      "@@ -1,1 +1,1 @@",
      "-oldb",
      "+newb",
    ].join("\n"),
    files: [
      {
        path: "a.txt",
        status: "modified",
        added: 1,
        removed: 1,
        startLine: 0,
        endLine: 6,
        hunks: [{ startLine: 3, endLine: 5 }],
        diffText: "--- a/a.txt\n+++ b/a.txt\n@@ -1,1 +1,1 @@\n-old\n+new",
      },
      {
        path: "b.txt",
        status: "modified",
        added: 1,
        removed: 1,
        startLine: 7,
        endLine: 12,
        hunks: [{ startLine: 10, endLine: 12 }],
        diffText: "--- a/b.txt\n+++ b/b.txt\n@@ -1,1 +1,1 @@\n-oldb\n+newb",
      },
    ],
    totalLines: 13,
  };
}
