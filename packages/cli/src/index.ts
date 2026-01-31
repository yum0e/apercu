import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Args, Command, Options } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
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

const command = pipe(
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

const runCommand = Command.run({
  name: "apercu",
  version: pkg.version,
});

export function run(args: ReadonlyArray<string>): void {
  const normalizedArgs = args.length === 0 ? ["--help"] : args;
  const program = runCommand(command)(normalizedArgs).pipe(Effect.provide(NodeContext.layer));
  NodeRuntime.runMain(program, {
    disableErrorReporting: true,
    disablePrettyLogger: true,
  });
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
