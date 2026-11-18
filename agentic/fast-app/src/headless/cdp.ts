export interface CdpTransport {
  send(message: string): void;
  /** Each message Chromium sends, whole. */
  onMessage(listener: (message: string) => void): void;
  onClose(listener: (reason: string) => void): void;
  close(): void;
}

export type CdpEvent = { method: string; params: any; sessionId?: string };

type Pending = { resolve: (result: any) => void; reject: (err: Error) => void; method: string };

export class CdpError extends Error {
  constructor(method: string, message: string) {
    super(`${method}: ${message}`);
    this.name = 'CdpError';
  }
}

export class CdpConnection {
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private listeners = new Set<(event: CdpEvent) => void>();
  private closed: string | null = null;
  private readonly transport: CdpTransport;

  constructor(transport: CdpTransport) {
    this.transport = transport;
    transport.onMessage((text) => this.receive(text));
    transport.onClose((reason) => this.end(reason));
  }

  send<T = any>(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<T> {
    if (this.closed) return Promise.reject(new CdpError(method, this.closed));
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      try {
        this.transport.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      } catch (err) {
        this.pending.delete(id);
        reject(new CdpError(method, err instanceof Error ? err.message : String(err)));
      }
    });
  }

  onEvent(listener: (event: CdpEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  waitFor(match: (event: CdpEvent) => boolean): { event: Promise<CdpEvent>; cancel: () => void } {
    let off = () => {};
    const event = new Promise<CdpEvent>((resolve) => {
      off = this.onEvent((next) => {
        if (!match(next)) return;
        off();
        resolve(next);
      });
    });
    return { event, cancel: () => off() };
  }

  close(): void {
    this.end('the connection was closed');
    this.transport.close();
  }

  private receive(text: string): void {
    let message: { id?: number; result?: unknown; error?: { message?: string } } & Partial<CdpEvent>;
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }
    if (typeof message.id === 'number') {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new CdpError(pending.method, message.error.message ?? 'failed'));
      else pending.resolve(message.result ?? {});
      return;
    }
    if (typeof message.method !== 'string') return;
    const event: CdpEvent = {
      method: message.method,
      params: message.params ?? {},
      ...(message.sessionId ? { sessionId: message.sessionId } : {})
    };
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch (err) {
        console.warn(`[fast-app] a render check listener failed: ${(err as Error).message}`);
      }
    }
  }

  private end(reason: string): void {
    if (this.closed) return;
    this.closed = reason;
    for (const [id, pending] of this.pending) {
      this.pending.delete(id);
      pending.reject(new CdpError(pending.method, reason));
    }
  }
}
