import { run } from "./index.js";

run(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exit(1);
});
