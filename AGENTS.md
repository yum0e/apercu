# Agents

Build from root: `pnpm build`

Test: `pnpm test`

Version control: jj (git is forbidden)

Always run `pnpm build` before committing to ensure the build passes.

Verify workflow (fast):

- `pnpm fmt`
- `pnpm lint`
- `pnpm test`
- `node packages/cli/dist/index.js --help`
