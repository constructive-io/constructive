/**
 * DeepSeek Harness's transcript reader: dsh session events → neutral events.
 *
 * The read half of the adapter, and deliberately the only file in this package
 * a renderer imports (`@agentic-kit/dsh/transcript`): it is browser-safe, has
 * no dsh dependency and no db-tools dependency, so a dashboard can project a
 * dsh run without pulling a node graph. `@agentic-kit/run-log` owns the neutral
 * vocabulary and the registry; the format's meaning lives here, beside the
 * adapter that produces it.
 *
 * dsh's log differs from pi's in three ways that matter:
 * - it is an *event* log, not a message log: a tool call and its result are
 *   separate events with their own sequence numbers, and a step boundary is an
 *   event of its own;
 * - `time` is epoch milliseconds, not an ISO string;
 * - assistant reasoning is a `reasoning` content block, and a tool call's
 *   arguments arrive as the raw JSON string the model produced.
 *
 * Register the reader once at host startup, e.g.
 * `transcriptReaders.register(dshTranscriptReader)`.
 */

import {
  APPROVAL_REQUEST_TYPE,
  APPROVAL_RESOLUTION_TYPE,
  assertTranscriptEntry,
  type TranscriptEntry,
  type TranscriptEvent,
  type TranscriptReader,
  type TranscriptUsage
} from '@agentic-kit/run-log';

/** dsh's session-event log (`@deepseek-ai/dsh-session`). */
export const DSH_TRANSCRIPT_FORMAT = 'dsh';

/**
 * dsh's `SESSION_FORMAT_VERSION` as of `0.1.0-rc.7`. It bumps only when the
 * event envelope or the surface mechanism changes — a new event *type* does
 * not bump it, which is why an unrecognized type here becomes an `unknown`
 * event rather than a refusal.
 */
export const SUPPORTED_DSH_TRANSCRIPT_VERSION = 0;

/** One entry of a dsh session log, structurally. */
export interface DshSessionEvent extends TranscriptEntry {
  type: string;
  seq?: number;
  time?: number;
  data?: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Narrow an untrusted dsh event. `seq` and `time` are part of dsh's envelope
 * rather than optional decoration, so an entry missing them is not a dsh event
 * and must not be stored as one.
 */
export function assertDshSessionEvent(value: unknown): DshSessionEvent {
  const entry = assertTranscriptEntry(value);
  if (typeof entry.seq !== 'number' || !Number.isFinite(entry.seq)) {
    throw new TypeError('dsh session event must carry a numeric `seq`');
  }
  if (typeof entry.time !== 'number' || !Number.isFinite(entry.time)) {
    throw new TypeError('dsh session event must carry a numeric `time` (epoch ms)');
  }
  if (entry.data !== undefined && !isRecord(entry.data)) {
    throw new TypeError('dsh session event `data` must be an object when present');
  }
  return entry as DshSessionEvent;
}

/** What a single dsh event means, in order. */
export function dshEventToEvents(entry: TranscriptEntry): TranscriptEvent[] {
  const event = entry as DshSessionEvent;
  const data = isRecord(event.data) ? event.data : {};
  const base = {
    ...(typeof event.seq === 'number' ? { entryId: String(event.seq) } : {}),
    ...(typeof event.time === 'number' ? { at: new Date(event.time).toISOString() } : {})
  };

  switch (event.type) {
  case 'user/message': {
    // A user-role event covers a human prompt and dsh's own injected context
    // (file-change notices, skill content); `source.kind` tells them apart,
    // and only a human one belongs in the conversation as a user turn.
    const source = isRecord(data.source) ? data.source : {};
    const text = blockText(data.content);
    if (source.kind === 'user') {
      return [{ kind: 'text', role: 'user', text, ...base }];
    }
    return [
      {
        kind: 'custom',
        customType: `dsh.context.${String(source.kind ?? 'unknown')}`,
        text,
        display: false,
        ...(source.plugin === undefined ? {} : { details: { plugin: source.plugin } }),
        ...base
      }
    ];
  }

  case 'assistant/message': {
    const message = isRecord(data.message) ? data.message : {};
    const source = isRecord(message.source) ? message.source : {};
    const model = typeof source.model === 'string' ? source.model : undefined;
    const provider = typeof source.provider === 'string' ? source.provider : undefined;
    const usage = tokenUsage(data.usage);

    const events: TranscriptEvent[] = [
      {
        kind: 'model-response',
        ...(model ? { model } : {}),
        ...(provider ? { provider } : {}),
        ...(usage ? { usage } : {}),
        ...base
      }
    ];

    for (const block of Array.isArray(message.content) ? message.content : []) {
      if (!isRecord(block)) continue;
      if (block.type === 'text' && typeof block.text === 'string' && block.text.length > 0) {
        events.push({
          kind: 'text',
          role: 'assistant',
          text: block.text,
          ...(model ? { model } : {}),
          ...(provider ? { provider } : {}),
          ...base
        });
      } else if (block.type === 'reasoning' && typeof block.text === 'string') {
        events.push({ kind: 'thinking', text: block.text, ...base });
      }
      // A `tool-call` block is also logged as its own `tool/call` event, which
      // is the one this reader projects — projecting both would double every
      // call in a trace.
    }

    return events;
  }

  case 'tool/call':
    return [
      {
        kind: 'tool-call',
        toolCallId: String(data.callId ?? ''),
        name: String(data.name ?? ''),
        arguments: parseArguments(data.arguments),
        ...base
      }
    ];

  case 'tool/result': {
    const message = isRecord(data.message) ? data.message : {};
    const block = (Array.isArray(message.content) ? message.content : []).find(
      (candidate): candidate is Record<string, unknown> =>
        isRecord(candidate) && candidate.type === 'tool-result'
    );
    const source = isRecord(message.source) ? message.source : {};
    const error = isRecord(data.error) ? data.error : undefined;
    return [
      {
        kind: 'tool-result',
        toolCallId: String(block?.toolCallId ?? source.callId ?? ''),
        // dsh's result carries the call id, not the tool name; a projector
        // pairs it with the `tool/call` that named it.
        name: '',
        output: blockText(block?.content),
        failed: block?.isError === true || error !== undefined,
        ...(data.meta === undefined ? {} : { details: data.meta }),
        ...base
      }
    ];
  }

  case 'approval/asked': {
    const callId = typeof data.callId === 'string' ? data.callId : undefined;
    const reason = typeof data.reason === 'string' ? data.reason : '';
    if (!callId) break;
    return [
      {
        kind: 'custom',
        customType: APPROVAL_REQUEST_TYPE,
        text: reason || `Approve ${String(data.toolName ?? 'tool call')}?`,
        display: true,
        details: { toolCallId: callId },
        ...base
      }
    ];
  }

  case 'approval/decided': {
    const outcome = String(data.outcome ?? '');
    return [
      {
        kind: 'custom',
        customType: APPROVAL_RESOLUTION_TYPE,
        text: outcome,
        display: true,
        details: {
          // dsh pairs a decision with its ask by approval id; the request
          // carried the call id, so a projector joins through the ask.
          approvalId: data.id,
          decision: outcome === 'allowed-once' ? 'approved' : 'rejected',
          reason: outcome
        },
        ...base
      }
    ];
  }

  case 'compaction/summary':
    return [
      {
        kind: 'summary',
        reason: 'compaction',
        summary: typeof data.summary === 'string' ? data.summary : blockText(data.content),
        ...base
      }
    ];

  case 'command/run':
    return [
      {
        kind: 'bash',
        command: String(data.command ?? ''),
        output: '',
        ...base
      }
    ];

  case 'command/done':
    return [
      {
        kind: 'bash',
        command: String(data.command ?? ''),
        output: blockText(data.content) || String(data.output ?? ''),
        ...(typeof data.exitCode === 'number' ? { exitCode: data.exitCode } : {}),
        ...base
      }
    ];

    // Token-level replay of an `assistant/message` that is projected in full.
  case 'assistant/chunk':
    return [];

  default:
    break;
  }

  return [{ kind: 'unknown', entryType: event.type, entry, ...base }];
}

/** dsh's session-event log, as a registrable reader. */
export const dshTranscriptReader: TranscriptReader = {
  format: DSH_TRANSCRIPT_FORMAT,
  version: SUPPORTED_DSH_TRANSCRIPT_VERSION,
  assertEntry: assertDshSessionEvent,
  toEvents: dshEventToEvents
};

/** The text of a dsh content-block array. */
function blockText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((block) => {
      if (!isRecord(block)) return '';
      if (typeof block.text === 'string') return block.text;
      if (Array.isArray(block.content)) return blockText(block.content);
      return '';
    })
    .filter((text) => text.length > 0)
    .join('\n');
}

/**
 * A tool call's arguments. dsh logs the raw JSON string the model produced, so
 * a malformed call is *in* the log — it becomes the string it was rather than
 * failing the whole entry.
 */
function parseArguments(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;
  if (typeof value !== 'string' || value.length === 0) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : { value: parsed };
  } catch {
    return { raw: value };
  }
}

/**
 * dsh's `TokenUsage` in the neutral vocabulary. Its input counts are disjoint
 * — cached input is reported apart from `inputTokens` — so a total is the sum
 * rather than the input field.
 */
function tokenUsage(value: unknown): TranscriptUsage | undefined {
  if (!isRecord(value)) return undefined;
  const input = numeric(value.inputTokens);
  const output = numeric(value.outputTokens);
  const cacheRead = numeric(value.cacheReadTokens);
  const cacheWrite = numeric(value.cacheWriteTokens);
  const usage: TranscriptUsage = {
    ...(input === undefined ? {} : { input }),
    ...(output === undefined ? {} : { output }),
    ...(cacheRead === undefined ? {} : { cacheRead }),
    ...(cacheWrite === undefined ? {} : { cacheWrite })
  };
  if (Object.keys(usage).length === 0) return undefined;
  usage.totalTokens =
    (input ?? 0) + (output ?? 0) + (cacheRead ?? 0) + (cacheWrite ?? 0);
  return usage;
}

const numeric = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
