import { describe, expect, it } from "bun:test";
import { update } from "../update.js";
import { createInitialState, type AppState } from "../state.js";
import type { DiffDocument } from "../diff.js";
import type { AppEvent } from "../events.js";

describe("update", () => {
  const initialState: AppState = {
    ...createInitialState(createTestDocument()),
    dimensions: { width: 80, height: 5 },
  };

  describe("EXIT event", () => {
    it("should set status to exiting", () => {
      const event: AppEvent = { type: "EXIT" };
      const newState = update(initialState, event);
      expect(newState.status).toBe("exiting");
    });

    it("should preserve other state", () => {
      const state: AppState = {
        ...initialState,
        scrollY: 10,
      };
      const event: AppEvent = { type: "EXIT" };
      const newState = update(state, event);
      expect(newState.scrollY).toBe(10);
    });
  });

  describe("RESIZE event", () => {
    it("should update dimensions", () => {
      const event: AppEvent = { type: "RESIZE", width: 120, height: 40 };
      const newState = update(initialState, event);
      expect(newState.dimensions).toEqual({ width: 120, height: 40 });
    });
  });

  describe("SCROLL event", () => {
    it("should increase scrollY with positive delta", () => {
      const event: AppEvent = { type: "SCROLL", delta: 5 };
      const newState = update(initialState, event);
      expect(newState.scrollY).toBe(5);
    });

    it("should decrease scrollY with negative delta", () => {
      const state: AppState = { ...initialState, scrollY: 5 };
      const event: AppEvent = { type: "SCROLL", delta: -3 };
      const newState = update(state, event);
      expect(newState.scrollY).toBe(2);
    });

    it("should not go below 0", () => {
      const state: AppState = { ...initialState, scrollY: 2 };
      const event: AppEvent = { type: "SCROLL", delta: -10 };
      const newState = update(state, event);
      expect(newState.scrollY).toBe(0);
    });
  });

  describe("KEYPRESS event", () => {
    it("should exit on q key", () => {
      const event: AppEvent = {
        type: "KEYPRESS",
        key: { name: "q", ctrl: false, shift: false },
      };
      const newState = update(initialState, event);
      expect(newState.status).toBe("exiting");
    });

    it("should exit on escape key", () => {
      const event: AppEvent = {
        type: "KEYPRESS",
        key: { name: "escape", ctrl: false, shift: false },
      };
      const newState = update(initialState, event);
      expect(newState.status).toBe("exiting");
    });

    it("should scroll down on j key", () => {
      const event: AppEvent = {
        type: "KEYPRESS",
        key: { name: "j", ctrl: false, shift: false },
      };
      const newState = update(initialState, event);
      expect(newState.scrollY).toBe(1);
    });

    it("should scroll down on down arrow", () => {
      const event: AppEvent = {
        type: "KEYPRESS",
        key: { name: "down", ctrl: false, shift: false },
      };
      const newState = update(initialState, event);
      expect(newState.scrollY).toBe(1);
    });

    it("should scroll up on k key", () => {
      const state: AppState = { ...initialState, scrollY: 5 };
      const event: AppEvent = {
        type: "KEYPRESS",
        key: { name: "k", ctrl: false, shift: false },
      };
      const newState = update(state, event);
      expect(newState.scrollY).toBe(4);
    });

    it("should scroll up on up arrow", () => {
      const state: AppState = { ...initialState, scrollY: 5 };
      const event: AppEvent = {
        type: "KEYPRESS",
        key: { name: "up", ctrl: false, shift: false },
      };
      const newState = update(state, event);
      expect(newState.scrollY).toBe(4);
    });

    it("should page down on ctrl+d", () => {
      const event: AppEvent = {
        type: "KEYPRESS",
        key: { name: "d", ctrl: true, shift: false },
      };
      const newState = update(initialState, event);
      expect(newState.scrollY).toBe(10);
    });

    it("should page up on ctrl+u", () => {
      const state: AppState = { ...initialState, scrollY: 6 };
      const event: AppEvent = {
        type: "KEYPRESS",
        key: { name: "u", ctrl: true, shift: false },
      };
      const newState = update(state, event);
      expect(newState.scrollY).toBe(0);
    });

    it("should not change state for unhandled keys", () => {
      const event: AppEvent = {
        type: "KEYPRESS",
        key: { name: "x", ctrl: false, shift: false },
      };
      const newState = update(initialState, event);
      expect(newState).toBe(initialState);
    });

    it("should jump to next file on J", () => {
      const event: AppEvent = {
        type: "KEYPRESS",
        key: { name: "J", ctrl: false, shift: true },
      };
      const newState = update(initialState, event);
      expect(newState.scrollY).toBe(7);
      expect(newState.cursorLine).toBe(7);
    });

    it("should jump to next unreviewed file on n", () => {
      const state: AppState = {
        ...initialState,
        files: [
          { ...initialState.files[0], viewed: true },
          { ...initialState.files[1], viewed: false },
        ],
        scrollY: 0,
      };
      const event: AppEvent = {
        type: "KEYPRESS",
        key: { name: "n", ctrl: false, shift: false },
      };
      const newState = update(state, event);
      expect(newState.scrollY).toBe(7);
      expect(newState.cursorLine).toBe(7);
    });
  });

  describe("review exposure", () => {
    it("marks hunks as seen when they enter view", () => {
      const document = createMultiHunkDocument();
      const state = createInitialState(document);
      const resized = update(state, { type: "RESIZE", width: 80, height: 5 });

      const scrolledToFirst = update(resized, { type: "SCROLL", delta: 3 });
      expect(scrolledToFirst.files[0].seenHunks[0]).toBe(true);
      expect(scrolledToFirst.files[0].seenHunks[1]).toBe(false);

      const scrolledToSecond = update(scrolledToFirst, { type: "SCROLL", delta: 3 });
      expect(scrolledToSecond.files[0].seenHunks[1]).toBe(true);
      expect(scrolledToSecond.files[0].viewed).toBe(true);
    });
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
      "",
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

function createMultiHunkDocument(): DiffDocument {
  return {
    diffText: [
      "a.txt",
      "--- a/a.txt",
      "+++ b/a.txt",
      "@@ -1,1 +1,1 @@",
      "-old",
      "+new",
      "@@ -3,1 +3,1 @@",
      "-old2",
      "+new2",
    ].join("\n"),
    files: [
      {
        path: "a.txt",
        status: "modified",
        added: 2,
        removed: 2,
        startLine: 0,
        endLine: 8,
        hunks: [
          { startLine: 3, endLine: 5 },
          { startLine: 6, endLine: 8 },
        ],
        diffText:
          "--- a/a.txt\n+++ b/a.txt\n@@ -1,1 +1,1 @@\n-old\n+new\n@@ -3,1 +3,1 @@\n-old2\n+new2",
      },
    ],
    totalLines: 9,
  };
}
