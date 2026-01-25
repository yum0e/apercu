import { defineConfig } from "rolldown";

export default defineConfig({
  input: "src/index.ts",
  output: [
    { format: "esm", file: "dist/index.js" },
    { format: "cjs", file: "dist/index.cjs" },
  ],
});
