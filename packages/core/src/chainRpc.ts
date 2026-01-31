import { Context, Effect, Stream } from "effect";
import type { Head, Log, LogFilter } from "./types.js";
import type { RpcError } from "./errors.js";

export interface ChainRpcService {
  getBlockNumber: Effect.Effect<string, RpcError>;
  getLogs: (filter: LogFilter) => Effect.Effect<Log[], RpcError>;
  watchHeads: Stream.Stream<Head, RpcError>;
}

export class ChainRpc extends Context.Tag("@apercu/ChainRpc")<ChainRpc, ChainRpcService>() {}
