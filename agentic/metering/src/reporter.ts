/**
 * Delivery of usage reports: a serialized queue plus the default HTTP sink.
 *
 * Reports are queued rather than awaited inside the harness's event handler — a
 * network round trip per assistant message would sit directly in the agent's turn
 * latency. Failures are therefore not lost: the first one is kept and rethrown
 * from `flush()`, so a host that flushes at shutdown still fails loudly.
 */

import { normalizeGatewayUrl } from './gateway';
import { buildIdentityHeaders, type MeteredIdentity } from './identity';
import type { UsageReport } from './usage-report';

export type UsageSink = (report: UsageReport) => Promise<void>;

export interface HttpUsageSinkOptions {
  /** Gateway root; `/v1/usage` is appended. */
  gatewayUrl: string;
  identity: MeteredIdentity;
  /** Injectable for tests and for hosts with a custom agent/proxy. */
  fetch?: typeof globalThis.fetch;
}

export function httpUsageSink(options: HttpUsageSinkOptions): UsageSink {
  const url = `${normalizeGatewayUrl(options.gatewayUrl)}/v1/usage`;
  const headers = { 'Content-Type': 'application/json', ...buildIdentityHeaders(options.identity) };
  const doFetch = options.fetch ?? globalThis.fetch;
  if (!doFetch) throw new Error('usage report: no fetch implementation available; pass options.fetch');

  return async (report) => {
    const response = await doFetch(url, { method: 'POST', headers, body: JSON.stringify(report) });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`usage report: gateway rejected the report (${response.status}) ${body}`.trim());
    }
  };
}

export interface UsageReporterOptions {
  sink: UsageSink;
  /** Called instead of retaining the error for `flush()` to rethrow. */
  onError?: (error: unknown, report: UsageReport) => void;
}

export class UsageReporter {
  private readonly sink: UsageSink;
  private readonly onError: UsageReporterOptions['onError'];

  private tail: Promise<void> = Promise.resolve();
  private failure: unknown;
  private sent = 0;

  constructor(options: UsageReporterOptions) {
    this.sink = options.sink;
    this.onError = options.onError;
  }

  /** Reports delivered successfully so far. */
  get delivered(): number {
    return this.sent;
  }

  /** Queue a report. Never rejects; the failure surfaces from `flush()`. */
  enqueue(report: UsageReport): void {
    this.tail = this.tail.then(async (): Promise<void> => {
      try {
        await this.sink(report);
        this.sent += 1;
      } catch (error) {
        if (this.onError) {
          this.onError(error, report);
          return;
        }
        // Keep the first failure: it is the one with the original cause, and a
        // later cascade usually says less about what broke.
        if (this.failure === undefined) this.failure = error;
      }
    });
  }

  /** Wait for the queue to drain, then rethrow the first retained failure. */
  async flush(): Promise<void> {
    await this.tail;
    const failure = this.failure;
    if (failure !== undefined) {
      this.failure = undefined;
      throw failure;
    }
  }
}
