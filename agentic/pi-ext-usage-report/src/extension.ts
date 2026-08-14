/**
 * The pi extension: report each assistant message's usage to the gateway.
 *
 * This is the local / own-provider-key lane. The agent's own numbers are the only
 * source, so a report is *self-reported* — good for reconciliation and for usage
 * visibility on a developer's own key, not tamper-proof billing. When the run
 * must be billed authoritatively, route the model calls through the gateway with
 * `@agentic-kit/pi-ext-metered-model` instead; the gateway then meters itself and
 * this extension is unnecessary.
 */

import type { MeteredIdentity } from '@agentic-kit/pi-ext-metered-model';
import type { ExtensionAPI, ExtensionFactory } from '@earendil-works/pi-coding-agent';

import { isAssistantMessage, toUsageReport, type UsageReport } from './report';
import { httpUsageSink, UsageReporter } from './reporter';

export interface UsageReportExtensionOptions {
  identity: MeteredIdentity;
  /** Gateway root. Required unless a custom `sink` is supplied. */
  gatewayUrl?: string;
  /** Delivery override — e.g. an in-process sink, or a queue. */
  sink?: (report: UsageReport) => Promise<void>;
  fetch?: typeof globalThis.fetch;
  /** `operation` column value; defaults to `pi/chat`. */
  operation?: string;
  /** Report failures here instead of having `flush()` rethrow them. */
  onError?: (error: unknown, report: UsageReport) => void;
}

export interface UsageReportExtension {
  extension: ExtensionFactory;
  /** Drain the queue and rethrow the first delivery failure. */
  flush(): Promise<void>;
  reporter: UsageReporter;
}

export function createUsageReportExtension(options: UsageReportExtensionOptions): UsageReportExtension {
  const sink =
    options.sink ??
    httpUsageSink({
      gatewayUrl: requireGatewayUrl(options),
      identity: options.identity,
      ...(options.fetch ? { fetch: options.fetch } : {})
    });

  const reporter = new UsageReporter({ sink, ...(options.onError ? { onError: options.onError } : {}) });

  // pi can emit `message_end` more than once for the same response (a rewritten
  // message, a replayed entry on resume), and each emission would otherwise bill
  // again. `responseId` is the provider's identity for the response, so it is
  // what dedupes; messages without one are reported as-is.
  const seen = new Set<string>();

  const extension: ExtensionFactory = (pi: ExtensionAPI) => {
    pi.on('message_end', (event) => {
      const message = event.message;
      if (!isAssistantMessage(message)) return;

      const responseId = message.responseId;
      if (typeof responseId === 'string' && responseId.length > 0) {
        if (seen.has(responseId)) return;
        seen.add(responseId);
      }

      const report = toUsageReport(message, options.operation === undefined ? {} : { operation: options.operation });
      if (report) reporter.enqueue(report);
    });

    pi.on('session_shutdown', async () => {
      await reporter.flush();
    });
  };

  return { extension, flush: () => reporter.flush(), reporter };
}

function requireGatewayUrl(options: UsageReportExtensionOptions): string {
  if (!options.gatewayUrl) throw new Error('usage report: gatewayUrl is required unless a custom sink is provided');
  return options.gatewayUrl;
}
