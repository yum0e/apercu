import type { AppEvent } from "./events.js";
import type { AppState, FileReview, LineRange } from "./state.js";
import { getViewportHeight } from "./layout.js";
import { getFocusedFileIndex } from "./focus.js";

const PAGE_SIZE = 10;
const EXPOSURE_THRESHOLD = 0.7;

export function update(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case "EXIT":
      return { ...state, status: "exiting" };

    case "RESIZE": {
      const resized = {
        ...state,
        dimensions: { width: event.width, height: event.height },
      };
      return applyScroll(resized, resized.scrollY, resized.cursorLine, true);
    }

    case "SCROLL":
      return applyScroll(state, state.scrollY + event.delta, state.cursorLine + event.delta);

    case "KEYPRESS":
      return handleKeypress(state, event.key);

    default:
      return state;
  }
}

function handleKeypress(
  state: AppState,
  key: { name: string; ctrl: boolean; shift: boolean },
): AppState {
  const keyName = key.name;
  const isShift = key.shift;

  if (keyName === "q" || keyName === "escape") {
    return update(state, { type: "EXIT" });
  }

  if ((key.ctrl && keyName === "d") || keyName === "pagedown") {
    return update(state, { type: "SCROLL", delta: PAGE_SIZE });
  }

  if ((key.ctrl && keyName === "u") || keyName === "pageup") {
    return update(state, { type: "SCROLL", delta: -PAGE_SIZE });
  }

  if (keyName === "J" || (keyName === "j" && isShift)) {
    return jumpToAdjacentFile(state, 1);
  }

  if (keyName === "K" || (keyName === "k" && isShift)) {
    return jumpToAdjacentFile(state, -1);
  }

  if (keyName === ")") {
    return jumpToAdjacentHunk(state, 1);
  }

  if (keyName === "(") {
    return jumpToAdjacentHunk(state, -1);
  }

  if (keyName === "n") {
    return jumpToUnreviewedFile(state, 1);
  }

  if (keyName === "p") {
    return jumpToUnreviewedFile(state, -1);
  }

  if (keyName === "j" || keyName === "down") {
    return update(state, { type: "SCROLL", delta: 1 });
  }

  if (keyName === "k" || keyName === "up") {
    return update(state, { type: "SCROLL", delta: -1 });
  }

  return state;
}

function applyScroll(
  state: AppState,
  nextScrollY: number,
  nextCursorLine = state.cursorLine,
  forceExpose = false,
): AppState {
  if (state.totalLines === 0) {
    if (state.scrollY === 0 && state.cursorLine === 0) return state;
    return { ...state, scrollY: 0, cursorLine: 0 };
  }

  const viewportHeight = getViewportHeight(state.dimensions.height);
  const maxScroll = Math.max(0, state.totalLines - viewportHeight);
  const clamped = Math.min(Math.max(0, nextScrollY), maxScroll);
  const cursorLine = Math.min(Math.max(0, nextCursorLine), state.totalLines - 1);
  if (!forceExpose && clamped === state.scrollY && cursorLine === state.cursorLine) {
    return state;
  }

  const nextFiles = updateExposure(state, clamped, viewportHeight);
  return {
    ...state,
    scrollY: clamped,
    cursorLine,
    files: nextFiles,
  };
}

function updateExposure(state: AppState, scrollY: number, viewportHeight: number): FileReview[] {
  const viewStart = scrollY;
  const viewEnd = scrollY + viewportHeight - 1;
  let changed = false;

  const nextFiles = state.files.map((file) => {
    const fileStart = file.meta.startLine;
    const fileEnd = file.meta.endLine;
    if (viewEnd < fileStart || viewStart > fileEnd) {
      return file;
    }

    const localStart = Math.max(viewStart, fileStart) - fileStart;
    const localEnd = Math.min(viewEnd, fileEnd) - fileStart;
    const { ranges, addedLines } = addSeenRange(file.seenRanges, {
      start: localStart,
      end: localEnd,
    });
    const seenLineCount = file.seenLineCount + addedLines;

    let hunksChanged = false;
    const seenHunks = file.seenHunks.map((seen, index) => {
      if (seen) return seen;
      const hunk = file.meta.hunks[index];
      if (!hunk) return seen;
      const intersects = !(viewEnd < hunk.startLine || viewStart > hunk.endLine);
      if (intersects) {
        hunksChanged = true;
        return true;
      }
      return seen;
    });

    const totalLines = Math.max(1, file.meta.endLine - file.meta.startLine + 1);
    const allHunksSeen = seenHunks.length === 0 ? seenLineCount > 0 : seenHunks.every(Boolean);
    const viewed = allHunksSeen || seenLineCount / totalLines >= EXPOSURE_THRESHOLD;

    const lineChanged = addedLines > 0;
    const viewedChanged = file.viewed !== viewed;
    if (lineChanged || hunksChanged || viewedChanged) {
      changed = true;
      return {
        ...file,
        seenRanges: ranges,
        seenLineCount,
        seenHunks,
        viewed,
      };
    }

    return file;
  });

  return changed ? nextFiles : state.files;
}

function addSeenRange(
  ranges: LineRange[],
  nextRange: LineRange,
): { ranges: LineRange[]; addedLines: number } {
  if (nextRange.end < nextRange.start) {
    return { ranges, addedLines: 0 };
  }

  const merged = [...ranges, nextRange].sort((a, b) => a.start - b.start);
  if (merged.length === 0) {
    return { ranges, addedLines: 0 };
  }
  const result: LineRange[] = [];
  let addedLines = 0;
  let current = merged[0];

  for (let i = 1; i < merged.length; i += 1) {
    const range = merged[i];
    if (range.start <= current.end + 1) {
      current = {
        start: current.start,
        end: Math.max(current.end, range.end),
      };
    } else {
      result.push(current);
      current = range;
    }
  }
  result.push(current);

  const previousCount = countRanges(ranges);
  const nextCount = countRanges(result);
  addedLines = Math.max(0, nextCount - previousCount);

  return { ranges: result, addedLines };
}

function countRanges(ranges: LineRange[]): number {
  return ranges.reduce((total, range) => total + (range.end - range.start + 1), 0);
}

function jumpToAdjacentFile(state: AppState, direction: 1 | -1): AppState {
  const index = getFocusedFileIndex(state);
  if (index === null) return state;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= state.files.length) return state;
  return moveCursorTo(state, state.files[nextIndex].meta.startLine, "start");
}

function jumpToAdjacentHunk(state: AppState, direction: 1 | -1): AppState {
  const hunkStarts = state.files.flatMap((file) => file.meta.hunks.map((hunk) => hunk.startLine));
  if (hunkStarts.length === 0) return state;
  const currentLine = state.cursorLine;
  const sorted = [...hunkStarts].sort((a, b) => a - b);

  if (direction > 0) {
    const next = sorted.find((start) => start > currentLine);
    if (next === undefined) return state;
    return moveCursorTo(state, next, "start");
  }

  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (sorted[i] < currentLine) {
      return moveCursorTo(state, sorted[i], "start");
    }
  }
  return state;
}

function jumpToUnreviewedFile(state: AppState, direction: 1 | -1): AppState {
  if (state.files.length === 0) return state;
  const startIndex = getFocusedFileIndex(state) ?? (direction > 0 ? -1 : state.files.length);
  if (direction > 0) {
    for (let i = startIndex + 1; i < state.files.length; i += 1) {
      if (!state.files[i].viewed) {
        return moveCursorTo(state, state.files[i].meta.startLine, "start");
      }
    }
  } else {
    for (let i = startIndex - 1; i >= 0; i -= 1) {
      if (!state.files[i].viewed) {
        return moveCursorTo(state, state.files[i].meta.startLine, "start");
      }
    }
  }
  return state;
}

function moveCursorTo(
  state: AppState,
  targetLine: number,
  align: "nearest" | "start" = "nearest",
): AppState {
  if (state.totalLines === 0) return state;
  const viewportHeight = getViewportHeight(state.dimensions.height);
  const clampedLine = Math.min(Math.max(0, targetLine), state.totalLines - 1);
  let scrollY = state.scrollY;

  if (align === "start") {
    scrollY = clampedLine;
  } else {
    const viewStart = scrollY;
    const viewEnd = scrollY + viewportHeight - 1;

    if (clampedLine < viewStart) {
      scrollY = clampedLine;
    } else if (clampedLine > viewEnd) {
      scrollY = clampedLine - viewportHeight + 1;
    }
  }

  return applyScroll(state, scrollY, clampedLine, true);
}
