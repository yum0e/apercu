import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect, Exit } from "effect";
import { ConfigError, Output, OutputLive, RpcError, runTail, type TailConfig } from "@apercu/core";
import type { OutputFormat } from "@apercu/core";
import { ChainRpcLive } from "./rpc/chainRpc.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

type Command = { type: "help" } | { type: "version" } | { type: "tail"; config: TailConfig };

export async function run(args: string[]): Promise<void> {
  const program = Effect.gen(function* () {
    const output = yield* Output;
    const command = yield* parseArgs(args);

    switch (command.type) {
      case "help":
        yield* output.stdout(helpText());
        return;
      case "version":
        yield* output.stdout(`apercu ${pkg.version}`);
        return;
      case "tail":
        yield* runTail(command.config).pipe(Effect.provide(ChainRpcLive(command.config.rpcUrl)));
        return;
    }
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const output = yield* Output;
        yield* output.stderr(formatError(error));
        return yield* Effect.fail(error);
      }),
    ),
    Effect.provide(OutputLive),
  );

  const exit = await Effect.runPromiseExit(program);
  if (Exit.isFailure(exit)) {
    process.exitCode = 1;
  }
}

function parseArgs(args: string[]): Effect.Effect<Command, ConfigError> {
  if (args.length === 0) {
    return Effect.succeed({ type: "help" });
  }

  if (args.some((arg) => arg === "-h" || arg === "--help")) {
    return Effect.succeed({ type: "help" });
  }

  if (args.some((arg) => arg === "-v" || arg === "--version")) {
    return Effect.succeed({ type: "version" });
  }

  let address: string | undefined;
  let rpcUrl: string | undefined;
  let topic0: string | undefined;
  let replayBlocks = 0;
  let follow = true;
  let format: OutputFormat = "pretty";

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) {
      continue;
    }

    switch (arg) {
      case "--rpc": {
        const value = args[i + 1];
        if (!value) {
          return Effect.fail(new ConfigError({ message: "--rpc expects a value" }));
        }
        rpcUrl = value;
        i += 1;
        break;
      }
      case "--topic0": {
        const value = args[i + 1];
        if (!value) {
          return Effect.fail(new ConfigError({ message: "--topic0 expects a value" }));
        }
        topic0 = value;
        i += 1;
        break;
      }
      case "-n":
      case "--replay": {
        const value = args[i + 1];
        i += 1;
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return Effect.fail(
            new ConfigError({ message: "-n/--replay expects a non-negative number" }),
          );
        }
        replayBlocks = Math.floor(parsed);
        break;
      }
      case "-f":
      case "--follow": {
        follow = true;
        break;
      }
      case "--no-follow": {
        follow = false;
        break;
      }
      case "--format": {
        const value = args[i + 1];
        if (!value) {
          return Effect.fail(new ConfigError({ message: "--format expects a value" }));
        }
        i += 1;
        if (value === "pretty" || value === "jsonl") {
          format = value;
        } else {
          return Effect.fail(new ConfigError({ message: "--format must be 'pretty' or 'jsonl'" }));
        }
        break;
      }
      default: {
        if (arg.startsWith("-")) {
          return Effect.fail(new ConfigError({ message: `Unknown option: ${arg}` }));
        }
        if (!address) {
          address = arg;
        } else {
          return Effect.fail(new ConfigError({ message: `Unexpected argument: ${arg}` }));
        }
      }
    }
  }

  if (!address) {
    return Effect.fail(new ConfigError({ message: "Missing contract address" }));
  }

  if (!rpcUrl) {
    return Effect.fail(new ConfigError({ message: "Missing --rpc WebSocket URL" }));
  }

  const config: TailConfig = {
    address: address as TailConfig["address"],
    topic0: topic0 as TailConfig["topic0"],
    rpcUrl,
    replayBlocks,
    follow,
    format,
  };

  return Effect.succeed({ type: "tail", config });
}

function formatError(error: unknown): string {
  if (error instanceof ConfigError || error instanceof RpcError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function helpText(): string {
  return `apercu v${pkg.version} - tail -f for EVM contract logs

Usage:
  apercu <address> --rpc <wss://...> [options]

Options:
  --rpc <url>         WebSocket RPC endpoint
  --topic0 <hash>     Filter by event signature (topic0)
  -n, --replay <n>    Replay last N blocks before following
  -f, --follow        Follow new blocks (default)
  --no-follow         Fetch once and exit
  --format <pretty|jsonl>
  -h, --help          Show help
  -v, --version       Show version

Examples:
  apercu 0xYourContract --rpc wss://...
  apercu 0xYourContract --rpc wss://... -n 200
  apercu 0xYourContract --rpc wss://... --format jsonl | jq
`;
}
