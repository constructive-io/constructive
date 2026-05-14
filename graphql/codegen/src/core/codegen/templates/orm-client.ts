/**
 * ORM Client - Runtime GraphQL executor
 *
 * This is the RUNTIME code that gets copied to generated output.
 * Provides the core ORM client functionality for executing GraphQL operations.
 *
 * NOTE: This file is read at codegen time and written to output.
 * Any changes here will affect all generated ORM clients.
 */

import type {
  GraphQLAdapter,
  GraphQLError,
  QueryResult,
} from '@constructive-io/graphql-query/runtime';
import { createFetch } from '@constructive-io/graphql-query/runtime';

import type {
  ConnectionState,
  ConnectionStateListener,
  RealtimeConfig,
  SubscribeOptions,
  SubscriptionEvent,
  SubscriptionFieldMeta,
  Unsubscribe,
} from './realtime';
import { RealtimeManager } from './realtime';

export type {
  GraphQLAdapter,
  GraphQLError,
  QueryResult,
} from '@constructive-io/graphql-query/runtime';

export type {
  ConnectionState,
  ConnectionStateListener,
  RealtimeConfig,
  SubscribeOptions,
  SubscriptionEvent,
  SubscriptionFieldMeta,
  SubscriptionOperation,
  Unsubscribe,
  WsClient,
} from './realtime';
export { RealtimeManager } from './realtime';

/**
 * Default adapter that uses fetch for HTTP requests.
 *
 * When no custom fetch is provided, uses @constructive-io/fetch which
 * handles *.localhost DNS rewriting and Host header preservation in
 * Node.js. Pass a custom fetch to override for test mocking or custom
 * proxy/credentials.
 */
export class FetchAdapter implements GraphQLAdapter {
  private headers: Record<string, string>;
  private fetchFn: typeof globalThis.fetch;

  constructor(
    private endpoint: string,
    headers?: Record<string, string>,
    fetchFn?: typeof globalThis.fetch,
  ) {
    this.headers = headers ?? {};
    this.fetchFn = (fetchFn ?? createFetch()).bind(globalThis);
  }

  async execute<T>(
    document: string,
    variables?: Record<string, unknown>,
  ): Promise<QueryResult<T>> {
    const response = await this.fetchFn(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.headers,
      },
      body: JSON.stringify({
        query: document,
        variables: variables ?? {},
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        data: null,
        errors: [
          { message: `HTTP ${response.status}: ${response.statusText}` },
        ],
      };
    }

    const json = (await response.json()) as {
      data?: T;
      errors?: GraphQLError[];
    };

    if (json.errors && json.errors.length > 0) {
      return {
        ok: false,
        data: null,
        errors: json.errors,
      };
    }

    return {
      ok: true,
      data: json.data as T,
      errors: undefined,
    };
  }

  setHeaders(headers: Record<string, string>): void {
    this.headers = { ...this.headers, ...headers };
  }

  getEndpoint(): string {
    return this.endpoint;
  }
}

/**
 * Configuration for creating an ORM client.
 * Either provide endpoint (and optional headers/fetch) for HTTP requests,
 * or provide a custom adapter for alternative execution strategies.
 */
export interface OrmClientConfig {
  /** GraphQL endpoint URL (required if adapter not provided) */
  endpoint?: string;
  /** Default headers for HTTP requests (only used with endpoint) */
  headers?: Record<string, string>;
  /**
   * Custom fetch implementation. Defaults to createFetch() from
   * @constructive-io/graphql-query/runtime which handles *.localhost
   * DNS and Host headers in Node.js. Pass your own for test mocking
   * or custom proxy/credentials.
   */
  fetch?: typeof globalThis.fetch;
  /** Custom adapter for GraphQL execution (overrides endpoint/headers/fetch) */
  adapter?: GraphQLAdapter;
  /**
   * Optional realtime (WebSocket) configuration.
   * When provided, enables subscription methods on models.
   * The WebSocket connection is created lazily on first subscribe().
   */
  realtime?: RealtimeConfig;
}

/**
 * Error thrown when GraphQL request fails
 */
export class GraphQLRequestError extends Error {
  constructor(
    public readonly errors: GraphQLError[],
    public readonly data: unknown = null,
  ) {
    const messages = errors.map((e) => e.message).join('; ');
    super(`GraphQL Error: ${messages}`);
    this.name = 'GraphQLRequestError';
  }
}

export class OrmClient {
  private adapter: GraphQLAdapter;
  private realtimeManager?: RealtimeManager;

  constructor(config: OrmClientConfig) {
    if (config.adapter) {
      this.adapter = config.adapter;
    } else if (config.endpoint) {
      this.adapter = new FetchAdapter(
        config.endpoint,
        config.headers,
        config.fetch,
      );
    } else {
      throw new Error(
        'OrmClientConfig requires either an endpoint or a custom adapter',
      );
    }

    if (config.realtime) {
      this.realtimeManager = new RealtimeManager(config.realtime);
    }
  }

  async execute<T>(
    document: string,
    variables?: Record<string, unknown>,
  ): Promise<QueryResult<T>> {
    return this.adapter.execute<T>(document, variables);
  }

  /**
   * Subscribe to a GraphQL subscription operation.
   * Used by generated model subscribe() methods.
   * @throws Error if realtime is not configured
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
    if (!this.realtimeManager) {
      throw new Error(
        'Realtime not configured. Pass a `realtime` option to createClient() to enable subscriptions.',
      );
    }
    return this.realtimeManager.subscribe<T>(
      meta,
      document,
      variables,
      options,
    );
  }

  /**
   * Set headers for requests.
   * Only works if the adapter supports headers.
   */
  setHeaders(headers: Record<string, string>): void {
    if (this.adapter.setHeaders) {
      this.adapter.setHeaders(headers);
    }
  }

  /**
   * Get the endpoint URL.
   * Returns empty string if the adapter doesn't have an endpoint.
   */
  getEndpoint(): string {
    return this.adapter.getEndpoint?.() ?? '';
  }

  /** Get current WebSocket connection state */
  getConnectionState(): ConnectionState {
    return this.realtimeManager?.getConnectionState() ?? 'disconnected';
  }

  /** Register a listener for WebSocket connection state changes */
  onConnectionStateChange(
    listener: ConnectionStateListener,
  ): Unsubscribe {
    if (!this.realtimeManager) return () => {};
    return this.realtimeManager.onConnectionStateChange(listener);
  }

  /** Number of active subscriptions */
  getActiveSubscriptionCount(): number {
    return this.realtimeManager?.getActiveSubscriptionCount() ?? 0;
  }

  /** Whether realtime is configured */
  get isRealtimeEnabled(): boolean {
    return this.realtimeManager !== undefined;
  }

  /** Dispose the realtime manager (close WebSocket) */
  dispose(): void {
    this.realtimeManager?.dispose();
  }
}
