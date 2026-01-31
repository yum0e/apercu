import { describe, expect, it } from "vitest";
import { normalizeArgv } from "../src/cli.js";

describe("normalizeArgv", () => {
  it("moves options after the address before parsing", () => {
    const argv = [
      "node",
      "apercu",
      "0x5b06224f736a57635b5bcb50b8ef178b189107cb",
      "--rpc",
      "wss://example.invalid",
      "--format",
      "jsonl",
      "-n",
      "20",
    ];

    expect(normalizeArgv(argv)).toEqual([
      "node",
      "apercu",
      "--rpc",
      "wss://example.invalid",
      "--format",
      "jsonl",
      "-n",
      "20",
      "0x5b06224f736a57635b5bcb50b8ef178b189107cb",
    ]);
  });

  it("keeps boolean values attached to follow flags", () => {
    const argv = ["node", "apercu", "0xabc", "--no-follow", "false", "--rpc", "wss://x"];

    expect(normalizeArgv(argv)).toEqual([
      "node",
      "apercu",
      "--no-follow",
      "false",
      "--rpc",
      "wss://x",
      "0xabc",
    ]);
  });

  it("adds help when invoked without args", () => {
    expect(normalizeArgv(["node", "apercu"])).toEqual(["node", "apercu", "--help"]);
  });
});
