import { Context, Effect, Layer } from "effect";

export interface OutputService {
  stdout: (line: string) => Effect.Effect<void>;
  stderr: (line: string) => Effect.Effect<void>;
}

export class Output extends Context.Tag("@apercu/Output")<Output, OutputService>() {}

export const OutputLive = Layer.succeed(Output, {
  stdout: (line: string) =>
    Effect.sync(() => {
      process.stdout.write(`${line}\n`);
    }),
  stderr: (line: string) =>
    Effect.sync(() => {
      process.stderr.write(`${line}\n`);
    }),
});
