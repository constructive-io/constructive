"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrmClient = exports.GraphQLRequestError = exports.FetchAdapter = exports.RealtimeManager = void 0;
const runtime_1 = require("@constructive-io/graphql-query/runtime");
const realtime_1 = require("./realtime");
var realtime_2 = require("./realtime");
Object.defineProperty(exports, "RealtimeManager", { enumerable: true, get: function () { return realtime_2.RealtimeManager; } });
/**
 * Default adapter that uses fetch for HTTP requests.
 *
 * When no custom fetch is provided, uses @constructive-io/fetch which
 * handles *.localhost DNS rewriting and Host header preservation in
 * Node.js. Pass a custom fetch to override for test mocking or custom
 * proxy/credentials.
 */
class FetchAdapter {
    constructor(endpoint, headers, fetchFn) {
        this.endpoint = endpoint;
        this.headers = headers ?? {};
        this.fetchFn = (fetchFn ?? (0, runtime_1.createFetch)()).bind(globalThis);
    }
    async execute(document, variables) {
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
        const json = (await response.json());
        if (json.errors && json.errors.length > 0) {
            return {
                ok: false,
                data: null,
                errors: json.errors,
            };
        }
        return {
            ok: true,
            data: json.data,
            errors: undefined,
        };
    }
    setHeaders(headers) {
        this.headers = { ...this.headers, ...headers };
    }
    getEndpoint() {
        return this.endpoint;
    }
}
exports.FetchAdapter = FetchAdapter;
/**
 * Error thrown when GraphQL request fails
 */
class GraphQLRequestError extends Error {
    constructor(errors, data = null) {
        const messages = errors.map((e) => e.message).join('; ');
        super(`GraphQL Error: ${messages}`);
        this.errors = errors;
        this.data = data;
        this.name = 'GraphQLRequestError';
    }
}
exports.GraphQLRequestError = GraphQLRequestError;
class OrmClient {
    constructor(config) {
        if (config.adapter) {
            this.adapter = config.adapter;
        }
        else if (config.endpoint) {
            this.adapter = new FetchAdapter(config.endpoint, config.headers, config.fetch);
        }
        else {
            throw new Error('OrmClientConfig requires either an endpoint or a custom adapter');
        }
        if (config.realtime) {
            this.realtimeManager = new realtime_1.RealtimeManager(config.realtime);
        }
    }
    async execute(document, variables) {
        return this.adapter.execute(document, variables);
    }
    /**
     * Subscribe to a GraphQL subscription operation.
     * Used by generated model subscribe() methods.
     * @throws Error if realtime is not configured
     */
    subscribe(meta, document, variables, options) {
        if (!this.realtimeManager) {
            throw new Error('Realtime not configured. Pass a `realtime` option to createClient() to enable subscriptions.');
        }
        return this.realtimeManager.subscribe(meta, document, variables, options);
    }
    /**
     * Set headers for requests.
     * Only works if the adapter supports headers.
     */
    setHeaders(headers) {
        if (this.adapter.setHeaders) {
            this.adapter.setHeaders(headers);
        }
    }
    /**
     * Get the endpoint URL.
     * Returns empty string if the adapter doesn't have an endpoint.
     */
    getEndpoint() {
        return this.adapter.getEndpoint?.() ?? '';
    }
    /** Get current WebSocket connection state */
    getConnectionState() {
        return this.realtimeManager?.getConnectionState() ?? 'disconnected';
    }
    /** Register a listener for WebSocket connection state changes */
    onConnectionStateChange(listener) {
        if (!this.realtimeManager)
            return () => { };
        return this.realtimeManager.onConnectionStateChange(listener);
    }
    /** Number of active subscriptions */
    getActiveSubscriptionCount() {
        return this.realtimeManager?.getActiveSubscriptionCount() ?? 0;
    }
    /** Whether realtime is configured */
    get isRealtimeEnabled() {
        return this.realtimeManager !== undefined;
    }
    /** Dispose the realtime manager (close WebSocket) */
    dispose() {
        this.realtimeManager?.dispose();
    }
}
exports.OrmClient = OrmClient;
