export type Hex = `0x${string}`;

export interface Log {
  address: Hex;
  topics: Hex[];
  data: Hex;
  blockNumber: Hex;
  blockHash: Hex;
  transactionHash: Hex;
  transactionIndex: Hex;
  logIndex: Hex;
}

export interface Head {
  number: Hex;
  hash: Hex;
  parentHash: Hex;
}

export interface LogFilter {
  address: Hex;
  topic0?: Hex;
  fromBlock: Hex;
  toBlock: Hex;
}

export type TailEvent = { type: "log"; log: Log } | { type: "reorg"; oldHead: Head; newHead: Head };

export type OutputFormat = "pretty" | "jsonl";
