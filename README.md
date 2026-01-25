# apercu

A diff-first review interface for Jujutsu.

## Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.3.6
- [pnpm](https://pnpm.io) >= 10
- [jj](https://martinvonz.github.io/jj) (for version control)

### Setup

```sh
pnpm install
pnpm build
```

### Run locally

```sh
bun packages/cli/dist/bin.js --help
```

### Scripts

- `pnpm build` - Build all packages
- `pnpm lint` - Run linter
- `pnpm fmt` - Format code
- `pnpm fmt:check` - Check formatting
