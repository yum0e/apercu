# apercu

A simple CLI tool.

## Requirements

- [Bun](https://bun.sh) >= 1.3.6

## Installation

```sh
npm install -g apercu
```

## Usage

```sh
apercu help
apercu version
apercu tui
```

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
