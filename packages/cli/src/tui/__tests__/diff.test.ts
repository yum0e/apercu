import { describe, expect, it } from "bun:test";
import { buildDiffDocument } from "../diff.js";

describe("buildDiffDocument", () => {
  it("orders files by status and captures stats", () => {
    const diff = [
      "diff --git a/a.txt b/a.txt",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/a.txt",
      "@@ -0,0 +1 @@",
      "+new",
      "diff --git a/b.txt b/b.txt",
      "--- a/b.txt",
      "+++ b/b.txt",
      "@@ -1 +1 @@",
      "-old",
      "+new",
      "diff --git a/c.txt b/c.txt",
      "deleted file mode 100644",
      "--- a/c.txt",
      "+++ /dev/null",
      "@@ -1 +0,0 @@",
      "-gone",
    ].join("\n");

    const stat = ["a.txt | 1 +", "b.txt | 2 +-", "c.txt | 1 -"].join("\n");
    const document = buildDiffDocument(diff, stat);

    expect(document.files.map((file) => file.path)).toEqual(["a.txt", "b.txt", "c.txt"]);
    expect(document.files[0].status).toBe("added");
    expect(document.files[2].status).toBe("deleted");
    expect(document.files[1].added).toBe(1);
    expect(document.files[1].removed).toBe(1);
  });
});
