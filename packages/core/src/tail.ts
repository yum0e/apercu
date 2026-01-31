import { Effect, Ref, Stream } from "effect";
import type { ChainRpcService } from "./chainRpc.js";
import { ChainRpc } from "./chainRpc.js";
import type { TailConfig } from "./config.js";
import type { Head, Hex, Log, LogFilter, TailEvent } from "./types.js";
import { Output } from "./output.js";
import { formatJsonl, formatPretty } from "./format.js";
import type { RpcError } from "./errors.js";

function hexToBigInt(value: Hex): bigint {
  return BigInt(value);
}

function bigIntToHex(value: bigint): Hex {
  return `0x${value.toString(16)}` as Hex;
}

function clampReplayRange(latest: Hex, replayBlocks: number): { fromBlock: Hex; toBlock: Hex } {
  if (replayBlocks <= 0) {
    return { fromBlock: latest, toBlock: latest };
  }
  const latestValue = hexToBigInt(latest);
  const from = latestValue - BigInt(replayBlocks - 1);
  const clampedFrom = from < 0n ? 0n : from;
  return { fromBlock: bigIntToHex(clampedFrom), toBlock: latest };
}

function normalizeLog(raw: Log): Log {
  return {
    address: raw.address,
    topics: raw.topics,
    data: raw.data,
    blockNumber: raw.blockNumber,
    blockHash: raw.blockHash,
    transactionHash: raw.transactionHash,
    transactionIndex: raw.transactionIndex,
    logIndex: raw.logIndex,
  };
}

function logsForBlock(
  rpc: ChainRpcService,
  filter: Omit<LogFilter, "fromBlock" | "toBlock">,
  blockNumber: Hex,
): Effect.Effect<Log[], RpcError> {
  return rpc.getLogs({
    ...filter,
    fromBlock: blockNumber,
    toBlock: blockNumber,
  });
}

function replayStream(
  rpc: ChainRpcService,
  filter: Omit<LogFilter, "fromBlock" | "toBlock">,
  replayBlocks: number,
): Stream.Stream<TailEvent, RpcError> {
  if (replayBlocks <= 0) {
    return Stream.empty as Stream.Stream<TailEvent, RpcError>;
  }

  return Stream.unwrap(
    Effect.gen(function* () {
      const latest = (yield* rpc.getBlockNumber) as Hex;
      const { fromBlock, toBlock } = clampReplayRange(latest, replayBlocks);
      const logs = yield* rpc.getLogs({
        ...filter,
        fromBlock,
        toBlock,
      });
      const events = logs.map((log) => ({ type: "log", log: normalizeLog(log) }) as TailEvent);
      return Stream.fromIterable(events);
    }),
  );
}

function headsToEvents(
  rpc: ChainRpcService,
  filter: Omit<LogFilter, "fromBlock" | "toBlock">,
  heads: Stream.Stream<Head, RpcError>,
): Stream.Stream<TailEvent, RpcError> {
  return Stream.unwrap(
    Effect.gen(function* () {
      const previous = yield* Ref.make<Head | null>(null);

      const headWithReorg = heads.pipe(
        Stream.mapEffect((head) =>
          Effect.gen(function* () {
            const prev = yield* Ref.get(previous);
            yield* Ref.set(previous, head);
            const reorg =
              prev && prev.hash !== head.parentHash
                ? ({ type: "reorg", oldHead: prev, newHead: head } as TailEvent)
                : null;
            return { head, reorg };
          }),
        ),
      );

      const expanded = headWithReorg.pipe(
        Stream.flatMap(({ head, reorg }) => {
          const reorgStream = reorg
            ? Stream.make(reorg)
            : (Stream.empty as Stream.Stream<TailEvent, RpcError>);
          const logsStream = Stream.unwrap(
            Effect.map(logsForBlock(rpc, filter, head.number), (logs) =>
              Stream.fromIterable(
                logs.map((log) => ({ type: "log", log: normalizeLog(log) }) as TailEvent),
              ),
            ),
          );
          return reorgStream.pipe(Stream.concat(logsStream));
        }),
      );

      return expanded;
    }),
  );
}

export function tailStream(config: TailConfig): Stream.Stream<TailEvent, RpcError, ChainRpc> {
  return Stream.unwrap(
    Effect.gen(function* () {
      const rpc = yield* ChainRpc;
      const baseFilter = {
        address: config.address,
        topic0: config.topic0,
      };

      const replay = replayStream(rpc, baseFilter, config.replayBlocks);

      if (!config.follow) {
        return replay;
      }

      const live = headsToEvents(rpc, baseFilter, rpc.watchHeads);
      return replay.pipe(Stream.concat(live));
    }),
  );
}

export function runTail(config: TailConfig): Effect.Effect<void, RpcError, ChainRpc | Output> {
  const format = config.format === "jsonl" ? formatJsonl : formatPretty;

  return Effect.gen(function* () {
    const output = yield* Output;
    const stream = tailStream(config);
    yield* stream.pipe(Stream.runForEach((event) => output.stdout(format(event))));
  });
}
