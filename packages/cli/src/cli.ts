import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Args, CliConfig, Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";
import { pipe } from "effect/Function";
import { Output, OutputLive, RpcError, runTail, type TailConfig } from "@apercu/core";
import { ChainRpcLive } from "./rpc/chainRpc.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

const addressArg = pipe(Args.text({ name: "address" }), Args.withDescription("Contract address"));

const rpcUrlOption = pipe(Options.text("rpc"), Options.withDescription("WebSocket RPC endpoint"));

const topic0Option = pipe(
  Options.text("topic0"),
  Options.withDescription("Filter by event signature (topic0)"),
  Options.optional,
  Options.map(Option.getOrUndefined),
);

const replayBlocksOption = pipe(
  Options.integer("replay"),
  Options.withAlias("n"),
  Options.filterMap(
    (value) => (value >= 0 ? Option.some(Math.floor(value)) : Option.none()),
    "Replay must be a non-negative number",
  ),
  Options.withDescription("Replay last N blocks before following"),
  Options.withDefault(0),
);

const followOption = pipe(
  Options.boolean("no-follow", { negationNames: ["follow", "f"] }),
  Options.withDescription("Disable following new blocks"),
  Options.map((noFollow) => !noFollow),
);

const formatOption = pipe(
  Options.choice("format", ["pretty", "jsonl"]),
  Options.withDescription("Output format"),
  Options.withDefault("pretty"),
);

const apercu = pipe(
  Command.make(
    "apercu",
    {
      address: addressArg,
      rpcUrl: rpcUrlOption,
      topic0: topic0Option,
      replayBlocks: replayBlocksOption,
      follow: followOption,
      format: formatOption,
    },
    (config) => {
      const tailConfig: TailConfig = {
        address: config.address as TailConfig["address"],
        topic0: config.topic0 as TailConfig["topic0"],
        rpcUrl: config.rpcUrl,
        replayBlocks: config.replayBlocks,
        follow: config.follow,
        format: config.format,
      };

      return runTail(tailConfig).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            const output = yield* Output;
            yield* output.stderr(formatError(error));
            return yield* Effect.fail(error);
          }),
        ),
      );
    },
  ),
  Command.withDescription("tail -f for EVM logs"),
  Command.provide(OutputLive),
  Command.provide((config) => ChainRpcLive(config.rpcUrl)),
);

const cli = Command.run(apercu, {
  name: "apercu",
  version: pkg.version,
});

const OPTIONS_WITH_VALUE = new Set([
  "--rpc",
  "--topic0",
  "--format",
  "--replay",
  "-n",
  "--completions",
  "--log-level",
]);

const BOOL_FLAGS = new Set([
  "--no-follow",
  "--follow",
  "-f",
  "--help",
  "-h",
  "--version",
  "--wizard",
]);

const BOOL_VALUES = new Set(["true", "false", "0", "1", "y", "n", "yes", "no", "on", "off"]);

export function normalizeArgv(argv: ReadonlyArray<string>): ReadonlyArray<string> {
  const runtime = argv[0] ?? "node";
  const script = argv[1] ?? "apercu";
  const args = argv.slice(2);

  if (args.length === 0) {
    return [runtime, script, "--help"];
  }

  const options: string[] = [];
  const positionals: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) {
      continue;
    }

    if (arg === "--") {
      positionals.push(...args.slice(i + 1));
      break;
    }

    if (arg.startsWith("-")) {
      options.push(arg);

      if (arg.includes("=")) {
        continue;
      }

      if (OPTIONS_WITH_VALUE.has(arg)) {
        const value = args[i + 1];
        if (value !== undefined) {
          options.push(value);
          i += 1;
        }
        continue;
      }

      if (BOOL_FLAGS.has(arg)) {
        const value = args[i + 1];
        if (value && BOOL_VALUES.has(value)) {
          options.push(value);
          i += 1;
        }
      }
      continue;
    }

    positionals.push(arg);
  }

  return [runtime, script, ...options, ...positionals];
}

export function runCli(argv: ReadonlyArray<string>) {
  return cli(normalizeArgv(argv)).pipe(
    Effect.provide(CliConfig.layer({ finalCheckBuiltIn: true })),
  );
}

function formatError(error: unknown): string {
  if (error instanceof RpcError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
