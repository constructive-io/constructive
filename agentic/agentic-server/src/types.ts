export interface ProviderConfig {
  type: string;
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
}

export interface AgenticServerOptions {
  providers?: ProviderConfig[];
  /** Legacy single-provider base URL */
  providerBaseUrl?: string;
  /** Legacy API key */
  providerApiKey?: string;
  /** Legacy default model */
  defaultModel?: string;
  /** Legacy provider type: 'openai' | 'ollama' | 'anthropic' */
  providerType?: string;
  /** Fire-and-forget sink for inference metering. Inject this to record usage
   *  against whatever telemetry/billing backend the consumer owns. When
   *  omitted, no metering occurs. The gateway itself is backend-agnostic and
   *  never imports a concrete metering implementation. */
  inferenceSink?: InferenceSink;
  /** Whether this server instance is publicly accessible.
   *  When false (default), the server is deployed behind a private network
   *  (Docker network, K8s service mesh) and trusts identity headers directly:
   *    X-Database-Id, X-Entity-Id, X-Actor-Id
   *  When true, identity headers are stripped from incoming requests
   *  (external clients cannot set tenant context). */
  isPublic?: boolean;
}

export interface ResolvedProvider {
  type: string;
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
}

export interface UsageResult {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Fire-and-forget sink for inference metering. Implementations record the entry
 * to whatever telemetry/billing backend they own (e.g. compute_log) and MUST
 * NOT throw — metering must never affect inference latency or response delivery.
 */
export interface InferenceSink {
  logInference(entry: InferenceEntry): void;
}

export interface InferenceEntry {
  databaseId: string;
  entityId?: string;
  actorId?: string;
  model: string;
  provider: string;
  service: 'chat' | 'embed';
  operation: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  status: 'ok' | 'error';
  errorType?: string;
  rawUsage?: unknown;
}
