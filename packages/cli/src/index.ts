import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DiffViewerRuntime, buildDiffDocument } from "./tui/index.js";
import { loadJjDiffOutput } from "./jj.js";
import { runDebug } from "./debug.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

export async function run(args: string[]): Promise<void> {
  const command = args[0];

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "debug") {
    await runDebug();
    console.log("Debug log written to apercu.tui.debug.log");
    return;
  }

  if (command === "version" || command === "--version" || command === "-v") {
    console.log(`apercu ${pkg.version}`);
    return;
  }

  if (command && !command.startsWith("-")) {
    console.error(`Unknown command: ${command}`);
    console.error('Run "apercu help" for usage.');
    process.exitCode = 1;
    return;
  }

  // Default: launch diff viewer with demo content
  await runDiffViewer();
}

async function runDiffViewer(): Promise<void> {
  try {
    const { diff, stat } = loadJjDiffOutput();
    const document = buildDiffDocument(diff, stat);
    const runtime = new DiffViewerRuntime(document);
    await runtime.start();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to load jj diff: ${message}`);
    process.exitCode = 1;
  }
}

function printHelp(): void {
  console.log(`apercu v${pkg.version} - A diff-first review interface for Jujutsu

Usage: apercu [command]

Commands:
  help, -h, --help        Show this help message
  version, -v, --version  Show version
  debug                   Run scripted TUI input and write debug log

Running apercu without arguments opens the diff viewer.

Keyboard shortcuts (in diff viewer):
  j / Down      Scroll down
  k / Up        Scroll up
  J / K         Next / previous file
  ( / )         Next / previous hunk
  n / p         Next / previous unreviewed file
  Ctrl+D        Page down
  Ctrl+U        Page up
  q / Escape    Quit
`);
}
