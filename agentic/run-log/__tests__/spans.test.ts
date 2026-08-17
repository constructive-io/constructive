import {
  approvalRequestMessage,
  approvalResolutionMessage,
  gateDecisionMessage,
  type ModelSpan,
  projectSpans,
  type RunEventRecord,
  type Span,
  type ToolSpan,
  wrapEntry
} from '../src';
import type { PiSessionEntry } from '../src/transcripts/pi-entry';
import {
  assistantText,
  assistantToolCall,
  custom,
  futureEntry,
  header,
  resetIds,
  toolResult,
  userMessage
} from './fixtures';

beforeEach(resetIds);

/** Fixtures timestamp entry `n` at `00:00:0n`, so a gap of one is 1000ms. */
const recordsOf = (...entries: PiSessionEntry[]): RunEventRecord[] =>
  entries.map((entry, i) =>
    wrapEntry({ runId: 'run-1', seq: i + 1, entry, recordedAt: `2026-01-01T00:00:0${String(i)}.000Z` })
  );

const byId = (spans: readonly Span[], id: string): Span => {
  const span = spans.find((candidate) => candidate.id === id);
  if (!span) throw new Error(`no span ${id} in ${spans.map((s) => s.id).join(', ')}`);
  return span;
};

describe('projectSpans', () => {
  it('brackets a tool call with its result and parents it to the model turn', () => {
    const { spans } = projectSpans(
      recordsOf(
        userMessage('add a test', 1),
        assistantToolCall({ id: 'call-1', name: 'write_file', arguments: { path: 'a.ts' } }, 2),
        toolResult({ toolCallId: 'call-1', toolName: 'write_file', text: 'wrote a.ts' }, 5)
      )
    );

    const model = spans.find((span): span is ModelSpan => span.kind === 'model');
    const tool = byId(spans, 'tool:call-1') as ToolSpan;

    expect(model).toMatchObject({ model: 'claude-sonnet-4-5', provider: 'anthropic', status: 'ok' });
    // The turn is bracketed by the previous entry and its own: 00:00:01 → 00:00:02.
    expect(model).toMatchObject({ durationMs: 1000, timing: 'bounded' });
    expect(tool).toMatchObject({
      kind: 'tool',
      parentId: model!.id,
      name: 'write_file',
      arguments: { path: 'a.ts' },
      status: 'ok',
      output: 'wrote a.ts',
      // 00:00:02 → 00:00:05.
      durationMs: 3000,
      timing: 'bounded',
      startSeq: 2,
      endSeq: 3
    });
  });

  it('leaves an unsettled tool call open rather than closing it at the last record', () => {
    const { spans } = projectSpans(
      recordsOf(userMessage('go', 1), assistantToolCall({ id: 'call-1', name: 'bash' }, 2))
    );

    expect(byId(spans, 'tool:call-1')).toMatchObject({ status: 'open' });
    expect(byId(spans, 'tool:call-1').durationMs).toBeUndefined();
    expect(byId(spans, 'tool:call-1').endedAt).toBeUndefined();
  });

  it('measures the approval wait separately from the tool it blocked', () => {
    const { spans } = projectSpans(
      recordsOf(
        assistantToolCall({ id: 'call-1', name: 'deploy' }, 1),
        custom(approvalRequestMessage({ toolCallId: 'call-1', prompt: 'deploy to prod?' }), 2),
        custom(approvalResolutionMessage({ toolCallId: 'call-1', decision: 'approved', actorId: 'user-1' }), 6),
        toolResult({ toolCallId: 'call-1', toolName: 'deploy', text: 'deployed' }, 9)
      )
    );

    const approval = byId(spans, 'approval:call-1');
    expect(approval).toMatchObject({
      kind: 'approval',
      parentId: 'tool:call-1',
      prompt: 'deploy to prod?',
      decision: 'approved',
      actorId: 'user-1',
      status: 'ok',
      // A request and its answer are exactly the interval a human held the run.
      timing: 'measured',
      durationMs: 4000
    });
    expect(byId(spans, 'tool:call-1')).toMatchObject({
      status: 'ok',
      durationMs: 8000,
      approvalWaitMs: 4000
    });
  });

  it('marks a rejected approval denied', () => {
    const { spans } = projectSpans(
      recordsOf(
        assistantToolCall({ id: 'call-1', name: 'deploy' }, 1),
        custom(approvalRequestMessage({ toolCallId: 'call-1', prompt: 'ok?' }), 2),
        custom(approvalResolutionMessage({ toolCallId: 'call-1', decision: 'rejected', reason: 'not today' }), 3)
      )
    );

    expect(byId(spans, 'approval:call-1')).toMatchObject({ status: 'denied', decision: 'rejected' });
  });

  it('closes a gate-denied tool call, which no tool result ever will', () => {
    const { spans } = projectSpans(
      recordsOf(
        assistantToolCall({ id: 'call-1', name: 'bash' }, 1),
        custom(
          gateDecisionMessage({
            toolCallId: 'call-1',
            toolName: 'bash',
            verdict: 'deny',
            decision: 'deny',
            reason: 'bash is not permitted in this run'
          }),
          4
        )
      )
    );

    expect(byId(spans, 'tool:call-1')).toMatchObject({
      status: 'denied',
      gateDecision: 'deny',
      gateReason: 'bash is not permitted in this run',
      durationMs: 3000,
      endSeq: 2
    });
  });

  it('keeps an allowed gate decision from settling the call', () => {
    const { spans } = projectSpans(
      recordsOf(
        assistantToolCall({ id: 'call-1', name: 'bash' }, 1),
        custom(gateDecisionMessage({ toolCallId: 'call-1', toolName: 'bash', verdict: 'allow', decision: 'allow' }), 2)
      )
    );

    expect(byId(spans, 'tool:call-1')).toMatchObject({ status: 'open', gateDecision: 'allow' });
  });

  it('carries the response id a metered inference row can be joined on', () => {
    const { spans } = projectSpans(
      recordsOf(assistantText('done', 2, { responseId: 'resp-42', stopReason: 'stop' }))
    );

    expect(spans[0]).toMatchObject({ kind: 'model', responseId: 'resp-42', stopReason: 'stop' });
  });

  it('marks an errored turn without inventing a status for the run', () => {
    const { spans } = projectSpans(
      recordsOf(assistantText('', 2, { stopReason: 'error', errorMessage: 'overloaded' }))
    );

    expect(spans[0]).toMatchObject({ status: 'error', errorMessage: 'overloaded' });
  });

  it('ignores entry types it has never seen', () => {
    const { spans } = projectSpans(recordsOf(header(), userMessage('go', 1), futureEntry(2)));

    expect(spans).toEqual([]);
  });

  it('is pure: the same records always project the same spans', () => {
    const records = recordsOf(
      userMessage('go', 1),
      assistantToolCall({ id: 'call-1', name: 'bash' }, 2),
      toolResult({ toolCallId: 'call-1', toolName: 'bash', text: 'ok' }, 3)
    );

    expect(projectSpans(records)).toEqual(projectSpans(records));
  });
});
