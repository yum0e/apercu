import type { TailEvent } from "./types.js";

export function formatPretty(event: TailEvent): string {
  if (event.type === "reorg") {
    return `reorg detected: old=${event.oldHead.hash} new=${event.newHead.hash} height=${event.newHead.number}`;
  }

  const { log } = event;
  const topic0 = log.topics[0] ?? "";
  return `block=${log.blockNumber} tx=${log.transactionHash} log=${log.logIndex} addr=${log.address} topic0=${topic0} data=${log.data}`;
}

export function formatJsonl(event: TailEvent): string {
  if (event.type === "reorg") {
    return JSON.stringify({
      type: "reorg",
      oldHead: event.oldHead,
      newHead: event.newHead,
    });
  }

  return JSON.stringify({
    type: "log",
    ...event.log,
  });
}
