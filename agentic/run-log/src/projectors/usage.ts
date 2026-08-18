/**
 * Usage projection: run log records → token and cost totals.
 *
 * Every usage-bearing event counts, not just model responses: a tool that
 * performed nested LLM work reports `usage` on its result, and compaction and
 * branch summaries are model calls the run paid for. Missing any of those makes
 * a run look cheaper than it was, which is exactly the kind of drift metering
 * exists to prevent.
 *
 * This projection describes what a run *observed*. It is reconciliation input,
 * never the billing authority — a gateway-observed record is (see
 * `@agentic-kit/metering`).
 */

import type { RunEventRecord } from '../record';
import type { TranscriptUsage } from '../transcripts/event';
import { type ProjectionOptions, toEvents } from './events';

export interface UsageTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: number;
  /** Number of usage-bearing entries folded into these totals. */
  calls: number;
}

export interface ModelUsage extends UsageTotals {
  provider: string;
  model: string;
}

export interface RunUsage extends UsageTotals {
  /** Per provider+model breakdown, keyed `provider/model`. */
  byModel: Record<string, ModelUsage>;
}

const empty = (): UsageTotals => ({
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: 0,
  calls: 0
});

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

function fold(target: UsageTotals, usage: TranscriptUsage): void {
  const input = num(usage.input);
  const output = num(usage.output);
  const cacheRead = num(usage.cacheRead);
  const cacheWrite = num(usage.cacheWrite);
  target.input += input;
  target.output += output;
  target.cacheRead += cacheRead;
  target.cacheWrite += cacheWrite;
  // Providers that omit a total still have one: the parts they did report.
  target.totalTokens += usage.totalTokens === undefined
    ? input + output + cacheRead + cacheWrite
    : num(usage.totalTokens);
  target.cost += num(usage.cost?.total);
  target.calls += 1;
}

export const modelKey = (provider: string, model: string): string => `${provider}/${model}`;

/** Fold every usage-bearing entry in the records into run totals. */
export function projectUsage(
  records: readonly RunEventRecord[],
  options: ProjectionOptions = {}
): RunUsage {
  const totals: RunUsage = { ...empty(), byModel: {} };

  const add = (usage: TranscriptUsage | undefined, provider = 'unknown', model = 'unknown'): void => {
    if (!usage) return;
    fold(totals, usage);
    const key = modelKey(provider, model);
    const bucket = totals.byModel[key] ?? { ...empty(), provider, model };
    fold(bucket, usage);
    totals.byModel[key] = bucket;
  };

  let lastProvider = 'unknown';
  let lastModel = 'unknown';

  for (const { event } of toEvents(records, options)) {
    if (event.kind === 'model-response') {
      lastProvider = event.provider ?? lastProvider;
      lastModel = event.model ?? lastModel;
      add(event.usage, event.provider ?? 'unknown', event.model ?? 'unknown');
      continue;
    }
    // Nested model work inside a tool or a summary: attributed to the run's
    // current model, which is the model that asked for it.
    if (event.kind === 'tool-result' || event.kind === 'summary') {
      add(event.usage, lastProvider, lastModel);
    }
  }

  return totals;
}
