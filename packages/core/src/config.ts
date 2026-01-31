import type { Hex, OutputFormat } from "./types.js";

export interface TailConfig {
  address: Hex;
  topic0?: Hex;
  rpcUrl: string;
  replayBlocks: number;
  follow: boolean;
  format: OutputFormat;
}
