import WebSocket, { type RawData } from "ws";
import { RpcError } from "@apercu/core";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface JsonRpcSubscription {
  jsonrpc: "2.0";
  method: "eth_subscription";
  params: {
    subscription: string;
    result: unknown;
  };
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: RpcError) => void;
};

type CloseListener = (error: RpcError) => void;

type SubscriptionHandler = (result: unknown) => void;

export class WsRpcClient {
  private socket: WebSocket | null = null;
  private connecting: Promise<void> | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly subscriptions = new Map<string, SubscriptionHandler>();
  private readonly closeListeners = new Set<CloseListener>();

  constructor(
    private readonly url: string
  ) {}

  async request(method: string, params?: unknown[] | Record<string, unknown>): Promise<unknown> {
    await this.ensureOpen();
    const id = this.nextId++;
    const payload: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };

    return new Promise((resolve, reject) => {
      const socket = this.socket;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        reject(new RpcError({ message: "WebSocket is not open" }));
        return;
      }

      this.pending.set(id, {
        resolve,
        reject,
      });

      socket.send(JSON.stringify(payload), (err?: Error) => {
        if (err) {
          this.pending.delete(id);
          reject(new RpcError({ message: "Failed to send request", cause: err }));
        }
      });
    });
  }

  async subscribe(
    method: string,
    params: unknown[] | Record<string, unknown> | undefined,
    onMessage: SubscriptionHandler,
    onClose: CloseListener
  ): Promise<() => void> {
    await this.ensureOpen();
    const result = await this.request("eth_subscribe", params ? [method, params] : [method]);
    const subscriptionId = String(result);
    this.subscriptions.set(subscriptionId, onMessage);
    this.closeListeners.add(onClose);

    return () => {
      this.subscriptions.delete(subscriptionId);
      this.closeListeners.delete(onClose);
      void this.request("eth_unsubscribe", [subscriptionId]).catch(() => undefined);
    };
  }

  private async ensureOpen(): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }
    if (this.connecting) {
      return this.connecting;
    }

    this.connecting = new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url);
      const handleOpen = () => {
        this.socket = socket;
        this.connecting = null;
        resolve();
      };
      const handleError = (event: Error) => {
        const error = new RpcError({ message: "WebSocket error", cause: event });
        this.connecting = null;
        reject(error);
      };
      const handleClose = () => {
        const error = new RpcError({ message: "WebSocket closed" });
        this.socket = null;
        this.connecting = null;
        for (const pending of this.pending.values()) {
          pending.reject(error);
        }
        this.pending.clear();
        for (const listener of this.closeListeners) {
          listener(error);
        }
        this.closeListeners.clear();
        this.subscriptions.clear();
      };
      const handleMessage = (data: RawData) => {
        const message = typeof data === "string" ? data : data.toString();
        let parsed: JsonRpcResponse | JsonRpcSubscription;
        try {
          parsed = JSON.parse(message) as JsonRpcResponse | JsonRpcSubscription;
        } catch {
          return;
        }

        if ("id" in parsed) {
          const pending = this.pending.get(parsed.id);
          if (!pending) {
            return;
          }
          this.pending.delete(parsed.id);
          if (parsed.error) {
            pending.reject(
              new RpcError({
                message: parsed.error.message,
                code: parsed.error.code,
                data: parsed.error.data,
              })
            );
            return;
          }
          pending.resolve(parsed.result);
          return;
        }

        if (parsed.method === "eth_subscription") {
          const handler = this.subscriptions.get(parsed.params.subscription);
          if (handler) {
            handler(parsed.params.result);
          }
        }
      };

      socket.on("open", handleOpen);
      socket.on("error", handleError);
      socket.on("close", handleClose);
      socket.on("message", handleMessage);
    });

    return this.connecting;
  }

  // Best-effort: parsing failures are ignored to keep the connection alive.
}
