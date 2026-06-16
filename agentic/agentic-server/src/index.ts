/**
 * agentic-server — Standalone Express LLM service
 *
 * Express-only equivalent of graphile-llm: agent threads, chat streaming,
 * billing metering, and inference logging. Uses @constructive-io/express-context
 * for tenant-scoped database access.
 *
 * LLM provider config is resolved per-database via `ctx.useLlm()` (from the
 * llm_module table), falling back to env vars from @constructive-io/llm-env when the module
 * is not provisioned. Discovery and billing are handled by the shared loaders
 * in express-context — no custom caching here.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createContextMiddleware } from '@constructive-io/express-context';
 * import { createAgenticRouter } from 'agentic-server';
 *
 * const app = express();
 * app.use(createContextMiddleware());
 * app.use(createAgenticRouter());
 * app.listen(3001);
 * ```
 */

export { createAgenticRouter } from './router';

// Re-export types from express-context for convenience
export type {
  BillingClient,
  InferenceLogEntry,
  LlmConfig,
} from '@constructive-io/express-context';

// Re-export LLM env options from @constructive-io/llm-env (single source of truth)
export type { LlmEnvOptions, LlmProviderConfig, ResolvedLlmEnvOptions } from '@constructive-io/llm-env';
export { getEnvVars as getLlmEnvVars, getEnvOptions as getLlmEnvOptions, llmDefaults } from '@constructive-io/llm-env';
