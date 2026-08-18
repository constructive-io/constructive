/**
 * pi's transcript reader: pi session entries → neutral events.
 *
 * This is the only place in the package that knows pi's message shapes. It stays
 * here rather than in `@agentic-kit/pi` on purpose — a reader must be
 * browser-safe, because renderers project logs client-side, while the adapter
 * package pulls pi's node SDK. The types it reads are structural (see
 * `./pi-entry`), so nothing here imports pi either.
 */

import type { TranscriptEntry } from './entry';
import type { TranscriptEvent } from './event';
import { PI_TRANSCRIPT_FORMAT, SUPPORTED_PI_TRANSCRIPT_VERSION } from './format';
import {
  assertPiSessionEntry,
  contentText,
  isAssistantMessage,
  isPiBranchSummaryEntry,
  isPiCompactionEntry,
  isPiMessageEntry,
  isPiSessionHeader,
  isToolResultMessage,
  type PiSessionEntry,
  toolCalls
} from './pi-entry';
import type { TranscriptReader } from './reader';

/** What a single pi entry means, in order. */
export function piEntryToEvents(entry: TranscriptEntry): TranscriptEvent[] {
  const pi = entry as PiSessionEntry;
  const base = {
    ...(typeof pi.id === 'string' ? { entryId: pi.id } : {}),
    ...(typeof pi.timestamp === 'string' ? { at: pi.timestamp } : {})
  };

  if (isPiSessionHeader(pi)) {
    return [
      {
        kind: 'session-start',
        ...base,
        ...(typeof pi.id === 'string' ? { sessionId: pi.id } : {}),
        ...(typeof pi.cwd === 'string' ? { cwd: pi.cwd } : {})
      }
    ];
  }

  if (isPiCompactionEntry(pi)) {
    return [
      { kind: 'summary', reason: 'compaction', summary: pi.summary, ...(pi.usage ? { usage: pi.usage } : {}), ...base }
    ];
  }

  if (isPiBranchSummaryEntry(pi)) {
    return [
      { kind: 'summary', reason: 'branch', summary: pi.summary, ...(pi.usage ? { usage: pi.usage } : {}), ...base }
    ];
  }

  if (!isPiMessageEntry(pi)) {
    return [{ kind: 'unknown', entryType: pi.type, entry, ...base }];
  }

  const message = pi.message;

  if (message.role === 'user') {
    return [{ kind: 'text', role: 'user', text: contentText(message.content), ...base }];
  }

  if (isAssistantMessage(message)) {
    const events: TranscriptEvent[] = [
      {
        kind: 'model-response',
        ...(message.model ? { model: message.model } : {}),
        ...(message.provider ? { provider: message.provider } : {}),
        ...(typeof message.responseId === 'string' ? { responseId: message.responseId } : {}),
        ...(message.stopReason ? { stopReason: message.stopReason } : {}),
        ...(message.usage ? { usage: message.usage } : {}),
        ...(message.errorMessage ? { errorMessage: message.errorMessage } : {}),
        ...base
      }
    ];
    for (const block of Array.isArray(message.content) ? message.content : []) {
      if (block.type === 'text' && block.text.length > 0) {
        events.push({
          kind: 'text',
          role: 'assistant',
          text: block.text,
          ...(message.model ? { model: message.model } : {}),
          ...(message.provider ? { provider: message.provider } : {}),
          ...base
        });
      } else if (block.type === 'thinking') {
        events.push({ kind: 'thinking', text: block.thinking, ...base });
      }
    }
    for (const call of toolCalls(message)) {
      events.push({
        kind: 'tool-call',
        toolCallId: call.id,
        name: call.name,
        arguments: call.arguments ?? {},
        ...base
      });
    }
    return events;
  }

  if (isToolResultMessage(message)) {
    return [
      {
        kind: 'tool-result',
        toolCallId: message.toolCallId,
        name: message.toolName,
        output: contentText(message.content),
        failed: message.isError === true,
        ...(message.details === undefined ? {} : { details: message.details }),
        ...(message.usage ? { usage: message.usage } : {}),
        ...base
      }
    ];
  }

  if (message.role === 'bashExecution') {
    return [
      {
        kind: 'bash',
        command: message.command,
        output: message.output,
        ...(typeof message.exitCode === 'number' ? { exitCode: message.exitCode } : {}),
        ...base
      }
    ];
  }

  if (message.role === 'custom') {
    return [
      {
        kind: 'custom',
        customType: message.customType,
        text: contentText(message.content),
        display: message.display !== false,
        ...(message.details === undefined ? {} : { details: message.details }),
        ...base
      }
    ];
  }

  return [
    {
      kind: 'summary',
      reason: message.role === 'branchSummary' ? 'branch' : 'compaction',
      summary: (message as { summary?: string }).summary ?? '',
      ...base
    }
  ];
}

/** pi's session-file transcript (`@earendil-works/pi-coding-agent`). */
export const piTranscriptReader: TranscriptReader = {
  format: PI_TRANSCRIPT_FORMAT,
  version: SUPPORTED_PI_TRANSCRIPT_VERSION,
  assertEntry: assertPiSessionEntry,
  toEvents: piEntryToEvents
};
