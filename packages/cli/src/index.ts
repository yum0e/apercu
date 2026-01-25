import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCliRenderer, Text } from "@opentui/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

export function run(args: string[]): void {
  const command = args[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "version" || command === "--version" || command === "-v") {
    console.log(`apercu ${pkg.version}`);
    return;
  }

  if (command === "tui") {
    runTui();
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error('Run "apercu help" for usage.');
  process.exitCode = 1;
}

async function runTui(): Promise<void> {
  const renderer = await createCliRenderer();

  const title = Text({
    content: `apercu v${pkg.version}`,
    fg: "#888888",
    position: "absolute",
    left: 2,
    top: 1,
  });
  renderer.root.add(title);

  const hint = Text({
    content: "Press 'q' or Escape to exit",
    fg: "#666666",
    position: "absolute",
    left: 2,
    top: 3,
  });
  renderer.root.add(hint);

  renderer.keyInput.on("keypress", (key: { name: string }) => {
    if (key.name === "escape" || key.name === "q") {
      renderer.destroy();
      process.exit(0);
    }
  });
}

function printHelp(): void {
  console.log(`apercu - A simple CLI tool

Usage: apercu <command>

Commands:
  tui                     Open the TUI
  help, -h, --help        Show this help message
  version, -v, --version  Show version
`);
}
