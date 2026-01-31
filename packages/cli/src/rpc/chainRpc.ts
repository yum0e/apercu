import { Duration, Effect, Layer, Schedule, Stream } from "effect";
import * as Rpc from "@tevm/voltaire/jsonrpc";
import {
  ChainRpc,
  RpcError,
  type Head,
  type Log,
  type LogFilter,
} from "@apercu/core";
import { WsRpcClient } from "./wsClient.js";

const RETRY_SCHEDULE = Schedule.exponential(Duration.millis(250));

function mapRpcError(cause: unknown): RpcError {
  if (cause instanceof RpcError) {
    return cause;
  }
  if (cause && typeof cause === "object" && "message" in cause) {
    return new RpcError({ message: String((cause as { message?: unknown }).message), cause });
  }
  return new RpcError({ message: "Unknown RPC error", cause });
}

function normalizeLog(raw: unknown): Log {
  const log = raw as Record<string, unknown>;
  return {
    address: String(log.address),
    topics: Array.isArray(log.topics) ? (log.topics as string[]) : [],
    data: String(log.data),
    blockNumber: String(log.blockNumber),
    blockHash: String(log.blockHash),
    transactionHash: String(log.transactionHash),
    transactionIndex: String(log.transactionIndex),
    logIndex: String(log.logIndex),
  } as Log;
}

function parseHead(raw: unknown): Head {
  const head = raw as Record<string, unknown>;
  return {
    number: String(head.number),
    hash: String(head.hash),
    parentHash: String(head.parentHash),
  } as Head;
}

export const ChainRpcLive = (rpcUrl: string) =>
  Layer.effect(
    ChainRpc,
    Effect.sync(() => {
      const requestClient = new WsRpcClient(rpcUrl);
      const subClient = new WsRpcClient(rpcUrl);

      const getBlockNumber = Effect.tryPromise({
        try: async () => {
          const request = Rpc.BlockNumberRequest();
          const result = await requestClient.request(request.method, request.params as never);
          return String(result);
        },
        catch: mapRpcError,
      }).pipe(Effect.retry(RETRY_SCHEDULE));

      const getLogs = (filter: LogFilter): Effect.Effect<Log[], RpcError> =>
        Effect.tryPromise({
          try: async () => {
            const topics = filter.topic0 ? [filter.topic0] : undefined;
            const request = Rpc.GetLogsRequest({
              address: filter.address as never,
              fromBlock: filter.fromBlock,
              toBlock: filter.toBlock,
              ...(topics ? { topics } : {}),
            });
            const result = await requestClient.request(request.method, request.params as never);
            const logs = Array.isArray(result) ? result : [];
            return logs.map(normalizeLog);
          },
          catch: mapRpcError,
        }).pipe(Effect.retry(RETRY_SCHEDULE));

      const watchHeadsOnce = Stream.async<Head, RpcError>((emit) => {
        let active = true;
        let unsubscribe: (() => void) | null = null;

        const start = async () => {
          try {
            unsubscribe = await subClient.subscribe(
              "newHeads",
              undefined,
              (result) => {
                if (!active) {
                  return;
                }
                emit.single(parseHead(result));
              },
              (error) => {
                if (!active) {
                  return;
                }
                emit.fail(error);
              }
            );
          } catch (error) {
            if (active) {
              emit.fail(mapRpcError(error));
            }
          }
        };

        void start();

        return Effect.sync(() => {
          active = false;
          if (unsubscribe) {
            unsubscribe();
          }
        });
      });

      const watchHeads = watchHeadsOnce.pipe(Stream.retry(RETRY_SCHEDULE));

      return {
        getBlockNumber,
        getLogs,
        watchHeads,
      };
    })
  );
