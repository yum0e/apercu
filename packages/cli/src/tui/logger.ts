import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AppEvent } from "./events.js";
import type { AppState } from "./state.js";
import { getFocusedFileIndex, getFocusedHunkIndex } from "./focus.js";

const MAX_LOG_LINES = 2000;
const LOG_PATH = resolve(process.cwd(), process.env.APERCU_TUI_LOG ?? "apercu.tui.log");
let buffer: string[] | null = null;

export function logTransition(event: AppEvent, prev: AppState, next: AppState): void {
  const timestamp = new Date().toISOString();
  const focusFile = getFocusedFileIndex(next);
  const focusHunk = getFocusedHunkIndex(next, focusFile);
  const fileName = focusFile === null ? "none" : (next.files[focusFile]?.meta.path ?? "unknown");
  const line = [
    timestamp,
    "event=" + formatEvent(event),
    "scrollY=" + next.scrollY,
    "cursorLine=" + next.cursorLine,
    "files=" + next.files.length,
    "focusedFile=" + fileName,
    "focusedHunk=" + (focusHunk === null ? "none" : focusHunk + 1),
    "viewed=" + next.files.filter((file) => file.viewed).length,
    "status=" + next.status,
  ].join(" ");

  const changed =
    prev.scrollY !== next.scrollY ||
    prev.cursorLine !== next.cursorLine ||
    prev.status !== next.status ||
    prev.files.some((file, index) => file.viewed !== next.files[index]?.viewed);

  const stateLine = `${timestamp} stateChanged=${changed}`;
  writeLog([line, stateLine]);
}

function writeLog(lines: string[]): void {
  const current = loadBuffer();
  for (const line of lines) {
    current.push(line);
  }

  if (current.length > MAX_LOG_LINES) {
    const start = current.length - MAX_LOG_LINES;
    buffer = current.slice(start);
  } else {
    buffer = current;
  }

  writeFileSync(LOG_PATH, buffer.join("\n") + "\n", "utf8");
}

function loadBuffer(): string[] {
  if (buffer) return buffer;
  try {
    const content = readFileSync(LOG_PATH, "utf8");
    buffer = content.split(/\r?\n/).filter(Boolean);
  } catch {
    buffer = [];
  }
  return buffer;
}

function formatEvent(event: AppEvent): string {
  switch (event.type) {
    case "KEYPRESS":
      return `KEYPRESS:${event.key.name}:${event.key.ctrl ? "C" : ""}${event.key.shift ? "S" : ""}`;
    case "SCROLL":
      return `SCROLL:${event.delta}`;
    case "RESIZE":
      return `RESIZE:${event.width}x${event.height}`;
    case "EXIT":
      return "EXIT";
    default:
      return "UNKNOWN";
  }
}
