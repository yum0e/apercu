export type FileStatus = "added" | "modified" | "deleted";

export interface HunkRange {
  startLine: number;
  endLine: number;
}

export interface FileMeta {
  path: string;
  status: FileStatus;
  added: number;
  removed: number;
  startLine: number;
  endLine: number;
  hunks: HunkRange[];
  diffText: string;
}

export interface DiffDocument {
  diffText: string;
  files: FileMeta[];
  totalLines: number;
}

interface DiffBlock {
  path: string;
  status: FileStatus;
  renderLines: string[];
  renderHunkStarts: number[];
  added: number;
  removed: number;
}

interface StatEntry {
  added: number;
  removed: number;
}

const DIFF_HEADER = /^diff --git a\/(.+?) b\/(.+)$/;
const STAT_LINE = /^(.+?)\s+\|\s+(\d+)\s+(.+)$/;

export function buildDiffDocument(diffText: string, statText: string): DiffDocument {
  const blocks = parseDiffBlocks(diffText);
  if (blocks.length === 0) {
    return { diffText: "", files: [], totalLines: 0 };
  }

  const stats = parseDiffStat(statText);
  const orderedBlocks = orderBlocks(blocks);
  const { diffLines, files } = assembleDocument(orderedBlocks, stats);
  return {
    diffText: diffLines.join("\n"),
    files,
    totalLines: diffLines.length,
  };
}

function parseDiffBlocks(diffText: string): DiffBlock[] {
  const lines = diffText.split(/\r?\n/);
  const blocks: DiffBlock[] = [];
  let current: DiffBlock | null = null;
  let renderLineIndex = 0;

  const finishBlock = () => {
    if (!current) return;
    blocks.push(current);
    current = null;
    renderLineIndex = 0;
  };

  for (const line of lines) {
    const headerMatch = line.match(DIFF_HEADER);
    if (headerMatch) {
      finishBlock();
      const aPath = headerMatch[1];
      const bPath = headerMatch[2];
      const path = bPath === "/dev/null" ? aPath : bPath;
      current = {
        path,
        status: "modified",
        renderLines: [],
        renderHunkStarts: [],
        added: 0,
        removed: 0,
      };
      renderLineIndex = 0;
      continue;
    }

    if (!current) {
      continue;
    }

    if (line.startsWith("@@")) {
      current.renderHunkStarts.push(renderLineIndex);
    } else if (line.startsWith("new file mode") || line.startsWith("--- /dev/null")) {
      current.status = "added";
    } else if (line.startsWith("deleted file mode") || line.startsWith("+++ /dev/null")) {
      current.status = "deleted";
    } else if (line.startsWith("rename to ")) {
      current.path = line.slice("rename to ".length).trim();
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      current.added += 1;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      current.removed += 1;
    }

    if (shouldRenderLine(line)) {
      current.renderLines.push(line);
      renderLineIndex += 1;
    }
  }

  finishBlock();
  return blocks;
}

function parseDiffStat(statText: string): Map<string, StatEntry> {
  const stats = new Map<string, StatEntry>();
  const lines = statText.split(/\r?\n/);

  for (const line of lines) {
    if (!line.includes("|")) continue;
    const match = line.match(STAT_LINE);
    if (!match) continue;
    const path = match[1].trim();
    const summary = match[3].trim();

    if (summary.startsWith("Bin")) {
      stats.set(path, { added: 0, removed: 0 });
      continue;
    }

    let added = 0;
    let removed = 0;
    for (const ch of summary) {
      if (ch === "+") added += 1;
      if (ch === "-") removed += 1;
    }
    stats.set(path, { added, removed });
  }

  return stats;
}

function orderBlocks(blocks: DiffBlock[]): DiffBlock[] {
  const weight = (status: FileStatus) => {
    switch (status) {
      case "added":
        return 0;
      case "modified":
        return 1;
      case "deleted":
        return 2;
    }
  };

  return [...blocks].sort((a, b) => weight(a.status) - weight(b.status));
}

function assembleDocument(
  blocks: DiffBlock[],
  stats: Map<string, StatEntry>,
): { diffLines: string[]; files: FileMeta[] } {
  const diffLines: string[] = [];
  const files: FileMeta[] = [];

  blocks.forEach((block, index) => {
    const headerLine = `${block.path}`;
    const startLine = diffLines.length;
    diffLines.push(headerLine);
    const diffStartLine = diffLines.length;
    const lines = block.renderLines;
    diffLines.push(...lines);

    if (index < blocks.length - 1) {
      diffLines.push("");
    }

    const endLine = diffLines.length - 1;
    const hunkRanges = buildHunkRanges(block.renderHunkStarts, lines.length, diffStartLine);
    const stat = stats.get(block.path);
    const added = stat?.added ?? block.added;
    const removed = stat?.removed ?? block.removed;

    files.push({
      path: block.path,
      status: block.status,
      added,
      removed,
      startLine,
      endLine,
      hunks: hunkRanges,
      diffText: lines.join("\n"),
    });
  });

  return { diffLines, files };
}

function buildHunkRanges(
  hunkStarts: number[],
  blockLineCount: number,
  blockStartLine: number,
): HunkRange[] {
  if (hunkStarts.length === 0) return [];
  const ranges: HunkRange[] = [];
  for (let i = 0; i < hunkStarts.length; i += 1) {
    const start = hunkStarts[i];
    const end = i + 1 < hunkStarts.length ? hunkStarts[i + 1] - 1 : blockLineCount - 1;
    ranges.push({
      startLine: blockStartLine + start,
      endLine: blockStartLine + end,
    });
  }
  return ranges;
}

function shouldRenderLine(line: string): boolean {
  if (line.startsWith("diff --git ")) return false;
  if (line.startsWith("index ")) return false;
  if (line.startsWith("new file mode")) return false;
  if (line.startsWith("deleted file mode")) return false;
  if (line.startsWith("similarity index")) return false;
  if (line.startsWith("rename from")) return false;
  if (line.startsWith("rename to")) return false;
  if (line.startsWith("old mode")) return false;
  if (line.startsWith("new mode")) return false;
  if (line.startsWith("copy from")) return false;
  if (line.startsWith("copy to")) return false;
  return true;
}
