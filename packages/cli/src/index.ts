import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";
import { runCli } from "./cli.js";

const program = runCli(process.argv).pipe(Effect.provide(NodeContext.layer));

NodeRuntime.runMain(program, {
  disableErrorReporting: true,
  disablePrettyLogger: true,
});
