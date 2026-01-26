import { describe, expect, it } from "bun:test";
import { update } from "../update.js";
import { createInitialState, type AppState } from "../state.js";
import type { AppEvent } from "../events.js";

describe("update", () => {
  const initialState = createInitialState("test diff");

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
      const state: AppState = { ...initialState, scrollY: 10 };
      const event: AppEvent = { type: "SCROLL", delta: -3 };
      const newState = update(state, event);
      expect(newState.scrollY).toBe(7);
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
      const state: AppState = { ...initialState, scrollY: 15 };
      const event: AppEvent = {
        type: "KEYPRESS",
        key: { name: "u", ctrl: true, shift: false },
      };
      const newState = update(state, event);
      expect(newState.scrollY).toBe(5);
    });

    it("should not change state for unhandled keys", () => {
      const event: AppEvent = {
        type: "KEYPRESS",
        key: { name: "x", ctrl: false, shift: false },
      };
      const newState = update(initialState, event);
      expect(newState).toBe(initialState);
    });
  });
});
