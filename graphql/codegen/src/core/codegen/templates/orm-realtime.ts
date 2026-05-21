/**
 * ORM Realtime - WebSocket subscription manager
 *
 * This is the RUNTIME code that gets copied to generated output.
 * Provides the WebSocket connection manager and subscription types
 * for realtime subscriptions integrated into the ORM client.
 *
 * NOTE: This file is read at codegen time and written to output.
 * Any changes here will affect all generated ORM clients.
 */

// Minimal type shims so this module compiles without graphql-ws
// installed.  Consumers supply a WsClient via RealtimeConfig;
// the SDK itself never imports or requires graphql-ws.

interface WsGraphQLError {
  readonly message: string;
  readonly [key: string]: unknown;
}

interface WsExecutionResult<TData = Record<string, unknown>> {
  data?: TData | null;
  errors?: readonly WsGraphQLError[];
  extensions?: Record<string, unknown>;
}

interface WsSink<T> {
  next(value: T): void;
  error(error: unknown): void;
  complete(): void;
}

/**
 * Minimal interface matching the graphql-ws Client.
 * Consumers pass a concrete instance via RealtimeConfig.client.
 *
 * Reconnect contract — IMPORTANT:
 * Implementations MUST auto-reconnect on connection loss AND re-send
 * all active subscriptions on reconnect, matching graphql-ws's built-in
 * behavior (see `retryAttempts` in graphql-ws createClient options).
 *
 * RealtimeManager does NOT hold a subscription registry and will NOT
 * replay subscriptions itself. If your transport does not auto-resubscribe
 * after reconnect, active subscriptions will silently drop on every
 * disconnect. Use the official `graphql-ws` package unless you have a
 * specific reason to roll your own.
 */
export interface WsClient {
  on(event: 'connecting', listener: (isRetry: boolean) => void): Unsubscribe;
  on(event: 'connected', listener: (...args: unknown[]) => void): Unsubscribe;
  on(event: 'closed', listener: (event: unknown) => void): Unsubscribe;
  on(event: 'error', listener: (error: unknown) => void): Unsubscribe;
  subscribe<TData = Record<string, unknown>>(
    payload: { query: string; variables?: Record<string, unknown> },
    sink: WsSink<WsExecutionResult<TData>>,
  ): () => void;
  dispose(): void;
}

// ============================================================================
// Types
// ============================================================================

/** The DML operation that triggered the subscription event */
export type SubscriptionOperation =
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'INVALIDATE'
  | 'UNKNOWN';

/** Connection state of the WebSocket — discriminated union carrying per-state payloads */
export type ConnectionState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'reconnecting' }
  | { status: 'connected' }
  | { status: 'error'; error: Error }
  | { status: 'closed'; code: number; reason: string; wasClean: boolean };

/** Listener for connection state changes */
export type ConnectionStateListener = (state: ConnectionState) => void;

/** Function returned by subscribe() to cancel the subscription */
export type Unsubscribe = () => void;

/**
 * A realtime subscription event delivered to the client.
 *
 * @typeParam T - The row type of the subscribed table
 */
export interface SubscriptionEvent<T> {
  /** The DML operation that triggered this event */
  operation: SubscriptionOperation;
  /** The current row data (null for DELETE if row is no longer visible) */
  data: T | null;
  /** ID of the changed row, or null for invalidate/masked events */
  rowId: string | null;
  /** True when the server asks the client to refetch instead of applying row data */
  overflow: boolean;
}

/**
 * Options for creating a subscription.
 *
 * @typeParam T - The row type of the subscribed table
 * @typeParam TFilter - The filter type for the table
 */
export interface SubscribeOptions<
  T,
  TFilter = Record<string, unknown>,
> {
  /** Server-side filter to limit which events are delivered */
  filter?: TFilter;
  /** Called when a subscription event is received */
  onEvent: (event: SubscriptionEvent<T>) => void;
  /** Called when the subscription encounters an error */
  onError?: (error: Error) => void;
  /** Called when the subscription completes (server-initiated close) */
  onComplete?: () => void;
}

/**
 * Metadata about a subscription field, used internally to map
 * table names to GraphQL subscription field names and types.
 */
export interface SubscriptionFieldMeta {
  /** The GraphQL subscription field name (e.g., 'onContactChanged') */
  fieldName: string;
  /** The table name in the source schema (e.g., 'contact') */
  tableName: string;
  /** The data field name inside the subscription payload (e.g., 'contact') */
  dataFieldName: string;
}

/**
 * Configuration for the realtime (WebSocket) connection.
 * Pass this as the `realtime` option in OrmClientConfig.
 *
 * @example
 * ```ts
 * import { createClient } from 'graphql-ws';
 *
 * const client = createOrmClient({
 *   endpoint: 'https://api.example.com/graphql',
 *   realtime: {
 *     client: createClient({ url: 'wss://api.example.com/graphql' }),
 *   },
 * });
 * ```
 */
export interface RealtimeConfig {
  /**
   * A graphql-ws Client instance (or any object satisfying WsClient).
   * The consumer creates this themselves, giving full control over
   * connection options, auth, and transport.
   *
   * @example
   * ```ts
   * import { createClient } from 'graphql-ws';
   * const wsClient = createClient({ url: 'wss://...' });
   * ```
   */
  client: WsClient;
}

// ============================================================================
// RealtimeManager
// ============================================================================

/**
 * Manages a graphql-ws WebSocket client and multiplexes
 * subscriptions over it. Created by OrmClient when `realtime`
 * config is provided.
 */
export class RealtimeManager {
  private wsClient: WsClient;
  private _connectionState: ConnectionState = { status: 'idle' };
  private stateListeners: Set<ConnectionStateListener> = new Set();
  private wsListenerDisposers: Unsubscribe[] = [];
  private disposed = false;
  private activeDisposers: Set<() => void> = new Set();

  constructor(config: RealtimeConfig) {
    this.wsClient = config.client;
    this.wsListenerDisposers = [
      this.wsClient.on('connecting', (isRetry: boolean) => {
        this.setConnectionState(isRetry ? { status: 'reconnecting' } : { status: 'connecting' });
      }),
      this.wsClient.on('connected', () => {
        this.setConnectionState({ status: 'connected' });
      }),
      this.wsClient.on('closed', (event: unknown) => {
        const ev = event as { code?: unknown; reason?: unknown; wasClean?: unknown } | null;
        const code = typeof ev?.code === 'number' ? ev.code : 1006;
        const reason = typeof ev?.reason === 'string' ? ev.reason : '';
        const wasClean = typeof ev?.wasClean === 'boolean' ? ev.wasClean : false;
        this.setConnectionState({ status: 'closed', code, reason, wasClean });
      }),
      this.wsClient.on('error', (error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        this.setConnectionState({ status: 'error', error: err });
      }),
    ];
  }

  /**
   * Subscribe to a GraphQL subscription operation.
   * Models call this with typed metadata and documents.
   */
  subscribe<T>(
    meta: SubscriptionFieldMeta,
    document: string,
    variables: Record<string, unknown>,
    options: {
      onEvent: (event: SubscriptionEvent<T>) => void;
      onError?: (error: Error) => void;
      onComplete?: () => void;
    },
  ): Unsubscribe {
    if (this.disposed) {
      throw new Error('Realtime manager has been closed.');
    }

    let disposed = false;

    const externalDispose = () => {
      disposed = true;
    };
    this.activeDisposers.add(externalDispose);

    const teardownSubscription = () => {
      if (disposed) return;
      disposed = true;
      this.activeDisposers.delete(externalDispose);
    };

    const cleanup = this.wsClient.subscribe<Record<string, unknown>>(
      { query: document, variables },
      {
        next: (result) => {
          if (disposed) return;
          if (result.errors) {
            options.onError?.(
              new Error(
                result.errors.map((e) => e.message).join('; '),
              ),
            );
            return;
          }

          const payload = result.data?.[meta.fieldName];
          const event = parseSubscriptionPayload<T>(
            meta,
            payload,
            (error) => options.onError?.(error),
          );
          if (event) options.onEvent(event);
        },
        error: (err) => {
          if (disposed) return;
          teardownSubscription();
          options.onError?.(
            err instanceof Error ? err : new Error(String(err)),
          );
        },
        complete: () => {
          if (disposed) return;
          teardownSubscription();
          options.onComplete?.();
        },
      },
    );

    return () => {
      teardownSubscription();
      cleanup();
    };
  }

  /**
   * Register a listener for connection state changes.
   *
   * The listener is invoked synchronously with the current connection state
   * immediately upon registration, then on every subsequent state change.
   * This prevents the getter-then-listener race: a listener registered while
   * state is `{status:'connected'}` immediately receives `{status:'connected'}`.
   */
  onConnectionStateChange(listener: ConnectionStateListener): Unsubscribe {
    try {
      listener(this._connectionState);
    } catch (_err) {
      // Don't let one bad listener at registration time break the register call.
    }
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /** Current WebSocket connection state */
  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  /**
   * Number of currently in-flight subscriptions.
   *
   * @remarks Diagnostic / test use only — reflects in-flight subscriptions,
   * not historical handler registrations.
   */
  get activeSubscriptionCount(): number {
    return this.activeDisposers.size;
  }

  /**
   * Close the manager and terminate the WebSocket connection.
   *
   * Per-subscription `onComplete`/`onError` callbacks are NOT invoked when
   * `close()` is called. Consumers observe manager termination via the
   * `'closed'` connection-state event (code 1000). If you need per-subscription
   * cleanup on manager teardown, run it before calling `close()`.
   *
   * Note: `wsClient.dispose()` is async internally (graphql-ws awaits the
   * connecting promise before closing the socket), but we call it fire-and-forget
   * because all per-subscription `disposed` flags are flipped synchronously above,
   * so any in-flight `sink.next()` calls that arrive before the socket actually
   * closes are already suppressed.
   */
  close(): void {
    if (this.disposed) return;
    this.disposed = true;
    // Flip all active subscription disposed flags before closing the socket
    // so that any in-flight sink.next() calls after close() are suppressed.
    for (const disposer of this.activeDisposers) {
      disposer();
    }
    this.activeDisposers.clear();
    for (const disposeListener of this.wsListenerDisposers) {
      disposeListener();
    }
    this.wsListenerDisposers = [];
    this.wsClient.dispose();
    this.setConnectionState({ status: 'closed', code: 1000, reason: 'Normal Closure', wasClean: true });
    this.stateListeners.clear();
  }

  private setConnectionState(state: ConnectionState): void {
    this._connectionState = state;
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (_err) {
        // Don't let one bad listener kill the others. The thrown error
        // is dropped intentionally — listeners should handle their own errors.
      }
    }
  }
}

function parseSubscriptionPayload<T>(
  meta: SubscriptionFieldMeta,
  payload: unknown,
  onMalformed: (error: Error) => void,
): SubscriptionEvent<T> | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    onMalformed(
      new Error(`Malformed subscription payload for ${meta.fieldName}.`),
    );
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (
    typeof record.event !== 'string' ||
    typeof record.overflow !== 'boolean' ||
    !Object.prototype.hasOwnProperty.call(record, meta.dataFieldName)
  ) {
    onMalformed(
      new Error(`Malformed subscription payload for ${meta.fieldName}.`),
    );
    return null;
  }

  return {
    operation: normalizeOperation(record.event),
    data: (record[meta.dataFieldName] as T | null | undefined) ?? null,
    rowId: typeof record.rowId === 'string' ? record.rowId : null,
    overflow: record.overflow,
  };
}

function normalizeOperation(operation: string): SubscriptionOperation {
  switch (operation) {
    case 'INSERT':
    case 'UPDATE':
    case 'DELETE':
    case 'INVALIDATE':
      return operation;
    default:
      return 'UNKNOWN';
  }
}

/**
 * Adapter that converts the callback-based subscribe() API into an AsyncIterableIterator.
 * - Buffers events that arrive between iterator pulls
 * - Terminates the iterator on server `complete`
 * - Throws from the iterator on server `error`
 * - Calling `iter.return()` or aborting via AbortSignal calls the underlying unsubscribe
 */
export function subscribeAsAsyncIterable<T>(
  subscribeFn: (callbacks: {
    onEvent: (event: SubscriptionEvent<T>) => void;
    onError: (err: unknown) => void;
    onComplete: () => void;
  }) => Unsubscribe,
  signal?: AbortSignal,
): AsyncIterableIterator<SubscriptionEvent<T>> {
  const queue: SubscriptionEvent<T>[] = [];
  const waiters: Array<{
    resolve: (result: IteratorResult<SubscriptionEvent<T>>) => void;
    reject: (err: Error) => void;
  }> = [];
  let finished = false;
  let pendingError: Error | null = null;
  const DONE: IteratorResult<SubscriptionEvent<T>> = {
    value: undefined as unknown as SubscriptionEvent<T>,
    done: true,
  };

  const finishAll = (terminator: (w: typeof waiters[number]) => void) => {
    while (waiters.length > 0) {
      const waiter = waiters.shift();
      if (waiter) terminator(waiter);
    }
  };

  const unsubscribe = subscribeFn({
    onEvent: (event) => {
      if (finished) return;
      const waiter = waiters.shift();
      if (waiter) {
        waiter.resolve({ value: event, done: false });
      } else {
        queue.push(event);
      }
    },
    onError: (err) => {
      if (finished) return;
      finished = true;
      pendingError = err instanceof Error ? err : new Error(String(err));
      finishAll((w) => w.reject(pendingError as Error));
    },
    onComplete: () => {
      if (finished) return;
      finished = true;
      finishAll((w) => w.resolve(DONE));
    },
  });

  let abortHandler: (() => void) | null = null;

  const cleanup = () => {
    if (finished) return;
    finished = true;
    unsubscribe();
    if (signal && abortHandler) {
      signal.removeEventListener('abort', abortHandler);
      abortHandler = null;
    }
    finishAll((w) => w.resolve(DONE));
  };

  if (signal) {
    if (signal.aborted) {
      cleanup();
    } else {
      abortHandler = cleanup;
      signal.addEventListener('abort', abortHandler, { once: true });
    }
  }

  const iterator: AsyncIterableIterator<SubscriptionEvent<T>> = {
    [Symbol.asyncIterator]() {
      return iterator;
    },
    next() {
      if (queue.length > 0) {
        const value = queue.shift() as SubscriptionEvent<T>;
        return Promise.resolve({ value, done: false });
      }
      if (pendingError) {
        const err = pendingError;
        pendingError = null;
        return Promise.reject(err);
      }
      if (finished) {
        return Promise.resolve(DONE);
      }
      return new Promise<IteratorResult<SubscriptionEvent<T>>>((resolve, reject) => {
        waiters.push({ resolve, reject });
      });
    },
    return() {
      cleanup();
      return Promise.resolve({ value: undefined as unknown as SubscriptionEvent<T>, done: true });
    },
    throw(err?: unknown) {
      cleanup();
      const e = err instanceof Error ? err : new Error(String(err));
      return Promise.reject(e);
    },
  };

  return iterator;
}
