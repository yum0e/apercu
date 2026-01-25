import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

  console.error(`Unknown command: ${command}`);
  console.error('Run "apercu help" for usage.');
  process.exitCode = 1;
}

function printHelp(): void {
  console.log(`apercu - A simple CLI tool

Usage: apercu <command>

Commands:
  help, -h, --help        Show this help message
  version, -v, --version  Show version
`);
}
