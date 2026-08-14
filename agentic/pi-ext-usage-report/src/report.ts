/**
 * Turn a pi assistant message into a `POST /v1/usage` body.
 *
 * pi reports richer usage than the gateway's own proxy path sees — cache reads,
 * cache writes, and its own cost breakdown — so the whole `usage` object is sent
 * as `raw_usage` while the four scalar columns carry what billing aggregates.
 */

/** The slice of pi's `AssistantMessage` this package reads. */
export interface AssistantUsageMessage {
  role: string;
  provider?: string;
  model?: string;
  responseModel?: string;
  responseId?: string;
  stopReason?: string;
  errorMessage?: string;
  usage?: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
    totalTokens?: number;
    cost?: Record<string, number>;
  };
}

/** The gateway's `/v1/usage` payload (snake_case, as the endpoint reads it). */
export interface UsageReport {
  model: string;
  provider: string;
  service: 'chat';
  operation: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  latency_ms: number;
  status: 'ok' | 'error';
  error_type?: string;
  raw_usage?: unknown;
}

export interface ToUsageReportOptions {
  /** Free-form label for the row; defaults to `pi/chat`. */
  operation?: string;
  /** Turn latency, when the host measured it. */
  latencyMs?: number;
}

export function isAssistantMessage(message: unknown): message is AssistantUsageMessage {
  return typeof message === 'object' && message !== null && (message as { role?: unknown }).role === 'assistant';
}

/**
 * `undefined` when the message carries no usage at all (aborted before the
 * provider answered), which is a row worth nothing rather than a row of zeros.
 */
export function toUsageReport(
  message: AssistantUsageMessage,
  options: ToUsageReportOptions = {}
): UsageReport | undefined {
  const usage = message.usage;
  if (!usage) return undefined;

  const input = num(usage.input);
  const cacheRead = num(usage.cacheRead);
  const cacheWrite = num(usage.cacheWrite);
  const output = num(usage.output);

  // Every prompt token the provider processed, cached or not: `input` alone
  // excludes cache hits, which would under-report a long agent session
  // dramatically. The split survives in `raw_usage`.
  const inputTokens = input + cacheRead + cacheWrite;
  const totalTokens = usage.totalTokens === undefined ? inputTokens + output : num(usage.totalTokens);

  const failed = message.stopReason === 'error';
  const report: UsageReport = {
    model: message.responseModel ?? message.model ?? 'unknown',
    provider: message.provider ?? 'unknown',
    service: 'chat',
    operation: options.operation ?? 'pi/chat',
    input_tokens: inputTokens,
    output_tokens: output,
    total_tokens: totalTokens,
    latency_ms: options.latencyMs === undefined ? 0 : Math.max(0, Math.round(options.latencyMs)),
    status: failed ? 'error' : 'ok',
    raw_usage: usage
  };
  if (failed) report.error_type = message.errorMessage ?? 'error';
  return report;
}

function num(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
