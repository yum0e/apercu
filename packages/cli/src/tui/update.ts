import type { AppState } from "./state.js";
import type { AppEvent } from "./events.js";

const PAGE_SIZE = 10;

export function update(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case "EXIT":
      return { ...state, status: "exiting" };

    case "RESIZE":
      return {
        ...state,
        dimensions: { width: event.width, height: event.height },
      };

    case "SCROLL":
      return {
        ...state,
        scrollY: Math.max(0, state.scrollY + event.delta),
      };

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
  // Exit keys
  if (key.name === "q" || key.name === "escape") {
    return update(state, { type: "EXIT" });
  }

  // Scroll down
  if (key.name === "j" || key.name === "down") {
    return update(state, { type: "SCROLL", delta: 1 });
  }

  // Scroll up
  if (key.name === "k" || key.name === "up") {
    return update(state, { type: "SCROLL", delta: -1 });
  }

  // Page down
  if ((key.ctrl && key.name === "d") || key.name === "pagedown") {
    return update(state, { type: "SCROLL", delta: PAGE_SIZE });
  }

  // Page up
  if ((key.ctrl && key.name === "u") || key.name === "pageup") {
    return update(state, { type: "SCROLL", delta: -PAGE_SIZE });
  }

  return state;
}
