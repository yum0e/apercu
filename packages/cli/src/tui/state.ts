import type { DiffDocument, FileMeta } from "./diff.js";

export interface LineRange {
  start: number;
  end: number;
}

export interface FileReview {
  meta: FileMeta;
  seenHunks: boolean[];
  seenRanges: LineRange[];
  seenLineCount: number;
  viewed: boolean;
}

export interface AppState {
  diffContent: string;
  totalLines: number;
  files: FileReview[];
  scrollY: number;
  cursorLine: number;
  dimensions: { width: number; height: number };
  status: "running" | "exiting";
}

export function createInitialState(document: DiffDocument): AppState {
  return {
    diffContent: document.diffText,
    totalLines: document.totalLines,
    files: document.files.map(initFileReview),
    scrollY: 0,
    cursorLine: 0,
    dimensions: { width: 80, height: 24 },
    status: "running",
  };
}

function initFileReview(meta: FileMeta): FileReview {
  return {
    meta,
    seenHunks: Array.from({ length: meta.hunks.length }, () => false),
    seenRanges: [],
    seenLineCount: 0,
    viewed: false,
  };
}
