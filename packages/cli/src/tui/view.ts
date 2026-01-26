import type { AppState } from "./state.js";
import type { TextRenderable } from "@opentui/core";
import { LEFT_RAIL_WIDTH } from "./layout.js";
import { getFocusedFileIndex, getFocusedHunkIndex } from "./focus.js";

export interface ViewConfig {
  scrollY: number;
  stickyHeader: string;
  topBar: string;
  leftRail: string;
  statusBar: string;
}

export function computeViewConfig(state: AppState): ViewConfig {
  const focusFileIndex = getFocusedFileIndex(state);
  const focusHunkIndex = getFocusedHunkIndex(state, focusFileIndex);
  const filesLeft = state.files.filter((file) => !file.viewed).length;
  const hasFiles = state.files.length > 0;

  const focusFile = focusFileIndex !== null ? state.files[focusFileIndex] : null;
  const hunkCount = focusFile?.meta.hunks.length ?? 0;
  const hunkPosition = focusHunkIndex !== null ? focusHunkIndex + 1 : 0;
  const fileStatus = focusFile?.viewed ? "DONE" : "UNSEEN";
  const fileStatusMarker = focusFile?.viewed ? "v" : "*";

  const stickyHeader = focusFile
    ? `${fileStatusMarker} ${focusFile.meta.path}  ${fileStatus}  ${hunkCount} hunks  +${focusFile.meta.added} -${focusFile.meta.removed}`
    : "No changes";

  const topBar = focusFile
    ? `@ ${focusFile.meta.path}  hunk ${hunkPosition}/${hunkCount}  ${filesLeft} files left`
    : "No changes";

  const leftRail = buildLeftRail(state, focusFileIndex);

  return {
    scrollY: state.scrollY,
    stickyHeader,
    topBar,
    leftRail,
    statusBar: hasFiles ? getStatusText() : "No changes",
  };
}

export function applyViewConfig(
  topBar: TextRenderable,
  stickyHeader: TextRenderable,
  leftRail: TextRenderable,
  statusBar: TextRenderable,
  config: ViewConfig,
): void {
  topBar.content = config.topBar;
  stickyHeader.content = config.stickyHeader;
  leftRail.content = config.leftRail;
  statusBar.content = config.statusBar;
}

export function getStatusText(): string {
  return "j/k: scroll | J/K: file | ( ): hunk | n/p: next unreviewed | Ctrl+d/u: page | q: quit";
}

function buildLeftRail(state: AppState, focusFileIndex: number | null): string {
  if (state.files.length === 0) {
    return "FILES";
  }

  const lines = ["FILES"];
  const maxLabel = Math.max(10, LEFT_RAIL_WIDTH - 6);

  state.files.forEach((file, index) => {
    const focused = focusFileIndex === index;
    const reviewMarker = file.viewed ? "v" : "*";
    const statusMarker =
      file.meta.status === "added" ? "A" : file.meta.status === "deleted" ? "D" : "M";
    const prefix = focused ? ">" : " ";
    const label = truncatePath(file.meta.path, maxLabel);
    lines.push(`${prefix}${reviewMarker} ${statusMarker} ${label}`);
  });

  return lines.join("\n");
}

function truncatePath(path: string, maxLength: number): string {
  if (path.length <= maxLength) return path;
  if (maxLength <= 3) return path.slice(0, maxLength);
  return `...${path.slice(path.length - (maxLength - 3))}`;
}
