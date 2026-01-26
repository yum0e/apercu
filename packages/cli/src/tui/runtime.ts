import {
  createCliRenderer,
  DiffRenderable,
  ScrollBoxRenderable,
  TextRenderable,
  BoxRenderable,
  type CliRenderer,
  type KeyEvent,
} from "@opentui/core";
import type { AppState } from "./state.js";
import type { AppEvent } from "./events.js";
import { createInitialState } from "./state.js";
import { update } from "./update.js";
import { applyViewConfig, computeViewConfig, getStatusText } from "./view.js";

// Pierre theme colors
const PIERRE_ADDITION = "#00cab1";
const PIERRE_DELETION = "#ff2e3f";
const PIERRE_ADDITION_BG = "#0a2a28";
const PIERRE_DELETION_BG = "#2a0a0c";

export class DiffViewerRuntime {
  private renderer: CliRenderer | null = null;
  private state: AppState;
  private diffRenderable: DiffRenderable | null = null;
  private scrollBox: ScrollBoxRenderable | null = null;
  private statusText: TextRenderable | null = null;

  constructor(diffContent: string) {
    this.state = createInitialState(diffContent);
  }

  async start(): Promise<void> {
    this.renderer = await createCliRenderer({
      exitOnCtrlC: false,
    });

    this.state = {
      ...this.state,
      dimensions: {
        width: this.renderer.width,
        height: this.renderer.height,
      },
    };

    this.setupUI();
    this.setupEventHandlers();
    this.render();
  }

  private setupUI(): void {
    if (!this.renderer) return;

    // Create main container
    const mainContainer = new BoxRenderable(this.renderer, {
      width: "100%",
      height: "100%",
      flexDirection: "column",
    });
    this.renderer.root.add(mainContainer);

    // Create scroll box for diff content
    this.scrollBox = new ScrollBoxRenderable(this.renderer, {
      width: "100%",
      flexGrow: 1,
      scrollY: true,
      backgroundColor: "#1a1a1a",
    });
    mainContainer.add(this.scrollBox);

    // Create diff renderable with split view and Pierre theme colors
    this.diffRenderable = new DiffRenderable(this.renderer, {
      diff: this.state.diffContent,
      view: "split",
      showLineNumbers: true,
      width: "100%",
      addedBg: PIERRE_ADDITION_BG,
      removedBg: PIERRE_DELETION_BG,
      contextBg: "#1a1a1a",
      addedSignColor: PIERRE_ADDITION,
      removedSignColor: PIERRE_DELETION,
      fg: "#e5e5e5",
    });
    this.scrollBox.add(this.diffRenderable);

    // Create status bar
    this.statusText = new TextRenderable(this.renderer, {
      content: getStatusText(),
      fg: "#888888",
      bg: "#2a2a2a",
      width: "100%",
      height: 1,
      paddingLeft: 1,
    });
    mainContainer.add(this.statusText);
  }

  private setupEventHandlers(): void {
    if (!this.renderer) return;

    // Handle keypress events
    this.renderer.keyInput.on("keypress", (key: KeyEvent) => {
      this.dispatch({
        type: "KEYPRESS",
        key: {
          name: key.name,
          ctrl: key.ctrl,
          shift: key.shift,
        },
      });
    });
  }

  private dispatch(event: AppEvent): void {
    const newState = update(this.state, event);

    if (newState !== this.state) {
      this.state = newState;
      this.render();

      if (this.state.status === "exiting") {
        this.destroy();
      }
    }
  }

  private render(): void {
    if (!this.diffRenderable || !this.statusText || !this.scrollBox) return;

    // Apply view configuration to diff renderable
    const config = computeViewConfig(this.state);
    applyViewConfig(this.diffRenderable, config);

    // Update scroll position
    this.scrollBox.scrollTop = this.state.scrollY;
  }

  private destroy(): void {
    if (this.renderer) {
      this.renderer.destroy();
      process.exit(0);
    }
  }
}
