import type { AppState } from "./state.js";

export function getFocusedFileIndex(state: AppState, line = state.cursorLine): number | null {
  if (state.files.length === 0 || state.totalLines === 0) return null;
  const clamped = Math.min(Math.max(0, line), state.totalLines - 1);
  const index = state.files.findIndex(
    (file) => clamped >= file.meta.startLine && clamped <= file.meta.endLine,
  );
  return index === -1 ? 0 : index;
}

export function getFocusedHunkIndex(
  state: AppState,
  fileIndex: number | null,
  line = state.cursorLine,
): number | null {
  if (fileIndex === null) return null;
  const file = state.files[fileIndex];
  if (!file) return null;
  const hunks = file.meta.hunks;
  if (hunks.length === 0) return null;

  const clamped = Math.min(Math.max(line, file.meta.startLine), file.meta.endLine);
  for (let i = 0; i < hunks.length; i += 1) {
    const hunk = hunks[i];
    if (clamped >= hunk.startLine && clamped <= hunk.endLine) {
      return i;
    }
  }

  if (clamped < hunks[0].startLine) return 0;
  return hunks.length - 1;
}
