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
import type { DiffDocument } from "./diff.js";
import { createInitialState } from "./state.js";
import { update } from "./update.js";
import { applyViewConfig, computeViewConfig } from "./view.js";
import { HEADER_HEIGHT, LEFT_RAIL_WIDTH, STATUS_HEIGHT, STICKY_HEADER_HEIGHT } from "./layout.js";
import { logTransition } from "./logger.js";

// Pierre theme colors
const PIERRE_ADDITION = "#00cab1";
const PIERRE_DELETION = "#ff2e3f";
const PIERRE_ADDITION_BG = "#0a2a28";
const PIERRE_DELETION_BG = "#2a0a0c";

interface DiffViewerOptions {
  renderer?: CliRenderer;
  exitProcess?: boolean;
  setupTerminal?: boolean;
}

export class DiffViewerRuntime {
  private renderer: CliRenderer | null = null;
  private state: AppState;
  private scrollBox: ScrollBoxRenderable | null = null;
  private statusText: TextRenderable | null = null;
  private leftRailText: TextRenderable | null = null;
  private stickyHeaderText: TextRenderable | null = null;
  private topBarText: TextRenderable | null = null;
  private readonly exitProcess: boolean;
  private readonly injectedRenderer?: CliRenderer;
  private readonly shouldSetupTerminal: boolean;

  constructor(document: DiffDocument, options: DiffViewerOptions = {}) {
    this.state = createInitialState(document);
    this.exitProcess = options.exitProcess ?? true;
    this.injectedRenderer = options.renderer;
    this.shouldSetupTerminal = options.setupTerminal ?? false;
  }

  async start(): Promise<void> {
    this.renderer =
      this.injectedRenderer ??
      (await createCliRenderer({
        exitOnCtrlC: false,
      }));
    if (this.injectedRenderer && this.shouldSetupTerminal) {
      await this.renderer.setupTerminal();
    }

    this.state = update(this.state, {
      type: "RESIZE",
      width: this.renderer.width,
      height: this.renderer.height,
    });

    this.setupUI();
    this.setupEventHandlers();
    this.render();
  }

  private setupUI(): void {
    if (!this.renderer) return;
    const renderer = this.renderer;

    const mainContainer = new BoxRenderable(renderer, {
      width: "100%",
      height: "100%",
      flexDirection: "row",
    });
    renderer.root.add(mainContainer);

    const leftRail = new BoxRenderable(renderer, {
      width: LEFT_RAIL_WIDTH,
      height: "100%",
      flexDirection: "column",
      backgroundColor: "#111111",
      paddingLeft: 1,
    });
    mainContainer.add(leftRail);

    this.leftRailText = new TextRenderable(renderer, {
      content: "FILES",
      fg: "#b0b0b0",
      bg: "#111111",
      width: "100%",
      height: "100%",
    });
    leftRail.add(this.leftRailText);

    const rightColumn = new BoxRenderable(renderer, {
      width: "100%",
      height: "100%",
      flexGrow: 1,
      flexDirection: "column",
    });
    mainContainer.add(rightColumn);

    this.topBarText = new TextRenderable(renderer, {
      content: "",
      fg: "#e5e5e5",
      bg: "#202020",
      width: "100%",
      height: HEADER_HEIGHT,
      paddingLeft: 1,
    });
    rightColumn.add(this.topBarText);

    const diffPane = new BoxRenderable(renderer, {
      width: "100%",
      flexGrow: 1,
      flexDirection: "column",
    });
    rightColumn.add(diffPane);

    this.stickyHeaderText = new TextRenderable(renderer, {
      content: "",
      fg: "#f0f0f0",
      bg: "#2a2a2a",
      width: "100%",
      height: STICKY_HEADER_HEIGHT,
      paddingLeft: 1,
    });
    diffPane.add(this.stickyHeaderText);

    this.scrollBox = new ScrollBoxRenderable(renderer, {
      width: "100%",
      flexGrow: 1,
      scrollY: true,
      backgroundColor: "#1a1a1a",
    });
    diffPane.add(this.scrollBox);

    const diffContent = new BoxRenderable(renderer, {
      width: "100%",
      flexDirection: "column",
    });
    this.scrollBox.add(diffContent);

    if (this.state.files.length === 0) {
      diffContent.add(
        new TextRenderable(renderer, {
          content: "No changes",
          fg: "#888888",
          bg: "#1a1a1a",
          width: "100%",
          height: 1,
          paddingLeft: 1,
        }),
      );
    } else {
      this.state.files.forEach((file, index) => {
        const header = new TextRenderable(renderer, {
          content: `${file.meta.path}  ${file.meta.status.toUpperCase()}  +${file.meta.added} -${file.meta.removed}`,
          fg: "#cfcfcf",
          bg: "#202020",
          width: "100%",
          height: 1,
          paddingLeft: 1,
        });
        diffContent.add(header);

        const diffRenderable = new DiffRenderable(renderer, {
          diff: file.meta.diffText,
          view: "split",
          showLineNumbers: true,
          wrapMode: "none",
          width: "100%",
          addedBg: PIERRE_ADDITION_BG,
          removedBg: PIERRE_DELETION_BG,
          contextBg: "#1a1a1a",
          addedSignColor: PIERRE_ADDITION,
          removedSignColor: PIERRE_DELETION,
          fg: "#e5e5e5",
        });
        diffContent.add(diffRenderable);

        if (index < this.state.files.length - 1) {
          diffContent.add(
            new TextRenderable(renderer, {
              content: "",
              fg: "#1a1a1a",
              bg: "#1a1a1a",
              width: "100%",
              height: 1,
            }),
          );
        }
      });
    }

    this.statusText = new TextRenderable(renderer, {
      content: "",
      fg: "#888888",
      bg: "#2a2a2a",
      width: "100%",
      height: STATUS_HEIGHT,
      paddingLeft: 1,
    });
    rightColumn.add(this.statusText);
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
    logTransition(event, this.state, newState);

    if (newState !== this.state) {
      this.state = newState;
      this.render();

      if (this.state.status === "exiting") {
        this.destroy();
      }
    }
  }

  private render(): void {
    if (
      !this.statusText ||
      !this.scrollBox ||
      !this.leftRailText ||
      !this.stickyHeaderText ||
      !this.topBarText
    )
      return;

    // Apply view configuration to diff renderable
    const config = computeViewConfig(this.state);
    applyViewConfig(
      this.topBarText,
      this.stickyHeaderText,
      this.leftRailText,
      this.statusText,
      config,
    );

    // Update scroll position
    this.scrollBox.scrollTop = this.state.scrollY;
  }

  private destroy(): void {
    if (this.renderer) {
      this.renderer.destroy();
      if (this.exitProcess) {
        process.exit(0);
      }
    }
  }

  getState(): AppState {
    return this.state;
  }

  getViewSnapshot(): {
    topBar: string;
    stickyHeader: string;
    leftRail: string;
    status: string;
  } {
    return {
      topBar: this.topBarText ? toPlainText(this.topBarText) : "",
      stickyHeader: this.stickyHeaderText ? toPlainText(this.stickyHeaderText) : "",
      leftRail: this.leftRailText ? toPlainText(this.leftRailText) : "",
      status: this.statusText ? toPlainText(this.statusText) : "",
    };
  }
}

function toPlainText(renderable: TextRenderable): string {
  return renderable.chunks.map((chunk) => chunk.text).join("");
}
