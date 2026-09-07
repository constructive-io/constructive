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
   *  and the task-correlation headers
   *    X-Invocation-Id, X-Job-Id, X-Attempt, X-Run-Id
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

/** The identity + task-linkage slice of an InferenceEntry, read from headers. */
export type InferenceAttribution = Pick<
  InferenceEntry,
  'databaseId' | 'entityId' | 'actorId' | 'invocationId' | 'jobId' | 'attempt' | 'runId'
>;

export interface InferenceEntry {
  databaseId: string;
  entityId?: string;
  actorId?: string;
  /** Task linkage — the invocation / job / attempt / agent run this call is a
   *  cost of. Inference is COGS attributed to the task the customer was
   *  charged for; it is never a customer meter of its own. Absent when the
   *  call was served outside an invocation. */
  invocationId?: string;
  jobId?: string;
  attempt?: number;
  runId?: string;
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
