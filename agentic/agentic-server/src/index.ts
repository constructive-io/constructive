/**
 * agentic-server — Standalone OpenAI-compatible LLM gateway
 *
 * A stateless multi-provider proxy that:
 *   1. Accepts OpenAI-compatible requests (`/v1/chat/completions`, `/v1/embeddings`)
 *   2. Enforces tenant isolation via X-Database-Id / X-Entity-Id / X-Actor-Id headers
 *   3. Routes to configured LLM provider(s) (OpenAI, Anthropic, Ollama)
 *   4. Records inference usage through an injected {@link InferenceSink}
 *      (fire-and-forget) — the gateway is backend-agnostic and never imports a
 *      concrete metering implementation.
 *
 * @example
 * ```typescript
 * import { createAgenticServer } from 'agentic-server';
 *
 * const app = createAgenticServer({
 *   providerType: 'ollama',
 *   providerBaseUrl: 'http://localhost:11434',
 *   inferenceSink: { logInference: (entry) => myBackend.record(entry) },
 * });
 * app.listen(3001);
 * ```
 */

export { buildProviderHeaders, resolveProvider, resolveUpstreamUrl } from './providers';
export { createRouter } from './router';
export type { AgenticServerStartOptions } from './server';
export { createAgenticServer } from './server';
export type {
  AgenticServerOptions,
  InferenceEntry,
  InferenceSink,
  ProviderConfig,
  ResolvedProvider,
  UsageResult
} from './types';
