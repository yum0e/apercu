import { Data } from "effect";

export class RpcError extends Data.TaggedError("RpcError")<{
  message: string;
  code?: number;
  data?: unknown;
  cause?: unknown;
}> {}

export class ConfigError extends Data.TaggedError("ConfigError")<{
  message: string;
}> {}
