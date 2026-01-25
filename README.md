# apercu

A simple CLI tool.

## Installation

```sh
npm install -g apercu
```

## Usage

```sh
apercu help
apercu version
```

## Development

### Prerequisites

- Node.js 24.13.0
- pnpm

### Setup

```sh
pnpm install
pnpm build
```

### Run locally

```sh
node packages/cli/dist/bin.js --help
```

Or link it globally:

```sh
cd packages/cli && pnpm link --global
apercu --help
```

### Scripts

- `pnpm build` - Build all packages
- `pnpm lint` - Run linter
- `pnpm fmt` - Format code
- `pnpm fmt:check` - Check formatting
