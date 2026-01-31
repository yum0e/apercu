# apercu

A minimal CLI that streams EVM contract logs like `tail -f`.

## Requirements

- Node.js >= 18

## Installation

```sh
npm install -g apercu
```

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
