import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DiffViewerRuntime, DEMO_DIFF } from "./tui/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

export async function run(args: string[]): Promise<void> {
  const command = args[0];

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
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
  const runtime = new DiffViewerRuntime(DEMO_DIFF);
  await runtime.start();
}

function printHelp(): void {
  console.log(`apercu v${pkg.version} - A diff-first review interface for Jujutsu

Usage: apercu [command]

Commands:
  help, -h, --help        Show this help message
  version, -v, --version  Show version

Running apercu without arguments opens the diff viewer.

Keyboard shortcuts (in diff viewer):
  j / Down      Scroll down
  k / Up        Scroll up
  Ctrl+D        Page down
  Ctrl+U        Page up
  q / Escape    Quit
`);
}
