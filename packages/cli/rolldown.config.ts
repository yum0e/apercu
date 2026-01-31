import { defineConfig } from "rolldown";

export default defineConfig({
  input: {
    bin: "src/bin.ts",
    index: "src/index.ts",
  },
  platform: "node",
  external: [/^@tevm\//, /^effect(\b|\/)/, "@apercu/core", "ws"],
  output: {
    dir: "dist",
    format: "esm",
    banner: (chunk) => (chunk.name === "bin" ? "#!/usr/bin/env node" : ""),
  },
});
