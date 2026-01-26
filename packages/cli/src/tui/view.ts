import type { AppState } from "./state.js";
import type { DiffRenderable } from "@opentui/core";

export interface ViewConfig {
  diff: string;
  scrollY: number;
}

export function computeViewConfig(state: AppState): ViewConfig {
  return {
    diff: state.diffContent,
    scrollY: state.scrollY,
  };
}

export function applyViewConfig(diffRenderable: DiffRenderable, config: ViewConfig): void {
  diffRenderable.diff = config.diff;
}

export function getStatusText(): string {
  return "j/k: scroll | Ctrl+d/u: page | q: quit";
}
