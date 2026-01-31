# apercu

A minimal CLI that brings a `tail -f` experience to EVM smart contract events.

## Usage

```sh
apercu <address> --rpc <wss://...> [options]
```

Options:

- `--rpc <url>` WebSocket RPC endpoint
- `--topic0 <hash>` Filter by event signature
- `-n, --replay <n>` Replay last N blocks before following
- `-f, --follow` Follow new blocks (default)
- `--no-follow` Fetch once and exit
- `--format <pretty|jsonl>` Output format

Examples:

```sh
apercu 0xYourContract --rpc wss://...
apercu 0xYourContract --rpc wss://... -n 200
apercu 0xYourContract --rpc wss://... --format jsonl | jq
```

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 10
- jj (for version control)

### Setup

```sh
pnpm install
pnpm build
```

### Run locally

```sh
node packages/cli/dist/index.js --help
```

### Tests

```sh
pnpm test
```
