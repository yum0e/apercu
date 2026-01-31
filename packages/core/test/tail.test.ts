import { describe, expect, it } from "@effect/vitest";
import { Chunk, Effect, Layer, Ref, Stream } from "effect";
import {
  ChainRpc,
  Output,
  runTail,
  tailStream,
  type Head,
  type Log,
  type TailConfig,
} from "../src/index.js";

const baseConfig: TailConfig = {
  address: "0x0000000000000000000000000000000000000001",
  rpcUrl: "wss://example.invalid",
  replayBlocks: 0,
  follow: false,
  format: "pretty",
};

const logFor = (blockNumber: string, logIndex: string): Log => ({
  address: "0x0000000000000000000000000000000000000001",
  topics: ["0x0000000000000000000000000000000000000000000000000000000000000000"],
  data: "0x",
  blockNumber,
  blockHash: `0xhash${blockNumber.slice(2)}`,
  transactionHash: `0xtx${blockNumber.slice(2)}`,
  transactionIndex: "0x0",
  logIndex,
});

const headFor = (number: string, hash: string, parentHash: string): Head => ({
  number,
  hash,
  parentHash,
});

describe("tailStream", () => {
  it.effect("replays logs for the requested block range", () =>
    Effect.gen(function* () {
      const logs = [logFor("0x0f", "0x0"), logFor("0x10", "0x1")];
      const rpcLayer = Layer.succeed(ChainRpc, {
        getBlockNumber: Effect.succeed("0x10"),
        getLogs: () => Effect.succeed(logs),
        watchHeads: Stream.empty,
      });

      const config: TailConfig = {
        ...baseConfig,
        replayBlocks: 2,
        follow: false,
      };

      const result = yield* tailStream(config).pipe(
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray),
        Effect.provide(rpcLayer)
      );

      expect(result).toEqual([
        { type: "log", log: logs[0] },
        { type: "log", log: logs[1] },
      ]);
    })
  );

  it.effect("emits reorg notices before logs for the reorged head", () =>
    Effect.gen(function* () {
      const head1 = headFor("0x1", "0xaaa", "0x000");
      const head2 = headFor("0x2", "0xbbb", "0x999");
      const logsByBlock: Record<string, Log[]> = {
        "0x1": [logFor("0x1", "0x0")],
        "0x2": [logFor("0x2", "0x0")],
      };

      const rpcLayer = Layer.succeed(ChainRpc, {
        getBlockNumber: Effect.succeed("0x2"),
        getLogs: (filter) => Effect.succeed(logsByBlock[filter.fromBlock] ?? []),
        watchHeads: Stream.fromIterable([head1, head2]),
      });

      const config: TailConfig = {
        ...baseConfig,
        follow: true,
      };

      const result = yield* tailStream(config).pipe(
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray),
        Effect.provide(rpcLayer)
      );

      expect(result).toEqual([
        { type: "log", log: logsByBlock["0x1"][0] },
        { type: "reorg", oldHead: head1, newHead: head2 },
        { type: "log", log: logsByBlock["0x2"][0] },
      ]);
    })
  );
});

describe("runTail", () => {
  it.effect("writes formatted output via the Output service", () =>
    Effect.gen(function* () {
      const logs = [logFor("0x1", "0x0")];
      const rpcLayer = Layer.succeed(ChainRpc, {
        getBlockNumber: Effect.succeed("0x1"),
        getLogs: () => Effect.succeed(logs),
        watchHeads: Stream.empty,
      });

      const linesRef = yield* Ref.make<string[]>([]);
      const outputLayer = Layer.succeed(Output, {
        stdout: (line) => Ref.update(linesRef, (lines) => [...lines, line]),
        stderr: () => Effect.sync(() => undefined),
      });

      const config: TailConfig = {
        ...baseConfig,
        replayBlocks: 1,
        follow: false,
      };

      yield* runTail(config).pipe(
        Effect.provide(rpcLayer),
        Effect.provide(outputLayer)
      );

      const lines = yield* Ref.get(linesRef);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain("block=0x1");
    })
  );
});
