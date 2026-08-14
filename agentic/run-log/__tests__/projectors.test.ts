import {
  APPROVAL_REQUEST_TYPE,
  APPROVAL_RESOLUTION_TYPE,
  approvalRequestMessage,
  approvalResolutionMessage,
  MemoryRunLogStore,
  modelKey,
  parseSessionJsonl,
  projectParts,
  projectSession,
  projectToolState,
  projectUsage,
  readAll,
  type RunEventRecord,
  wrapEntry
} from '../src';
import type { PiSessionEntry } from '../src/pi-entry';
import {
  assistantText,
  assistantToolCall,
  bash,
  branchSummary,
  compaction,
  custom,
  futureEntry,
  header,
  resetIds,
  toolResult,
  usage,
  userMessage
} from './fixtures';

beforeEach(resetIds);

const recordsOf = (...entries: PiSessionEntry[]): RunEventRecord[] =>
  entries.map((entry, i) => wrapEntry({ runId: 'run-1', seq: i + 1, entry, recordedAt: `2026-01-01T00:00:0${String(i)}.000Z` }));

describe('projectParts', () => {
  it('renders a full turn: user text, assistant text, tool call collapsed with its result', () => {
    const { parts, sessionId, cwd } = projectParts(
      recordsOf(
        header(),
        userMessage('add a test'),
        assistantText('on it'),
        assistantToolCall({ id: 'call-1', name: 'write_file', arguments: { path: 'a.ts' } }),
        toolResult({ toolCallId: 'call-1', toolName: 'write_file', text: 'wrote a.ts' })
      )
    );

    expect(sessionId).toBe('session-1');
    expect(cwd).toBe('/repo');
    expect(parts).toEqual([
      { kind: 'text', role: 'user', text: 'add a test', seq: 2, entryId: expect.any(String) },
      {
        kind: 'text',
        role: 'assistant',
        text: 'on it',
        model: 'claude-sonnet-4-5',
        provider: 'anthropic',
        seq: 3,
        entryId: expect.any(String)
      },
      {
        kind: 'tool',
        toolCallId: 'call-1',
        name: 'write_file',
        arguments: { path: 'a.ts' },
        status: 'completed',
        output: 'wrote a.ts',
        settledSeq: 5,
        seq: 4,
        entryId: expect.any(String)
      }
    ]);
  });

  it('leaves an unsettled tool call in the requested state', () => {
    const [, tool] = projectParts(
      recordsOf(userMessage('go'), assistantToolCall({ id: 'call-1', name: 'bash' }))
    ).parts;
    expect(tool).toMatchObject({ kind: 'tool', status: 'requested' });
    expect((tool as { output?: string }).output).toBeUndefined();
  });

  it('marks an errored tool result as failed', () => {
    const { parts } = projectParts(
      recordsOf(
        assistantToolCall({ id: 'call-1', name: 'bash' }),
        toolResult({ toolCallId: 'call-1', toolName: 'bash', text: 'boom', isError: true })
      )
    );
    expect(parts[0]).toMatchObject({ status: 'failed', output: 'boom' });
  });

  it('keeps a tool result whose call is outside the read window', () => {
    const { parts } = projectParts(recordsOf(toolResult({ toolCallId: 'call-9', toolName: 'bash', text: 'ok' })));
    expect(parts).toEqual([
      expect.objectContaining({ kind: 'tool', toolCallId: 'call-9', status: 'completed', arguments: {} })
    ]);
  });

  it('projects thinking, bash, custom and summary entries', () => {
    const { parts } = projectParts(
      recordsOf(
        assistantText('answer', 2, { content: [{ type: 'thinking', thinking: 'hmm' }, { type: 'text', text: 'answer' }] }),
        bash('ls', 'a.ts\n'),
        custom({ customType: 'constructive.note', content: 'heads up' }),
        compaction('summary so far'),
        branchSummary('branched')
      )
    );

    expect(parts.map((p) => p.kind)).toEqual(['thinking', 'text', 'bash', 'custom', 'summary', 'summary']);
    expect(parts[2]).toMatchObject({ kind: 'bash', command: 'ls', output: 'a.ts\n', exitCode: 0 });
    expect(parts[3]).toMatchObject({ customType: 'constructive.note', text: 'heads up', display: true });
    expect(parts[4]).toMatchObject({ reason: 'compaction', summary: 'summary so far' });
    expect(parts[5]).toMatchObject({ reason: 'branch', summary: 'branched' });
  });

  it('surfaces an entry type it does not understand instead of dropping it', () => {
    const { parts } = projectParts(recordsOf(futureEntry()));
    expect(parts).toEqual([
      expect.objectContaining({ kind: 'unknown', entryType: 'quantum_thought' })
    ]);
  });
});

describe('projectUsage', () => {
  it('totals tokens and cost per model and for the run', () => {
    const totals = projectUsage(
      recordsOf(
        userMessage('hi'),
        assistantText('a'),
        assistantText('b', 3, { model: 'claude-haiku-4-5', usage: usage({ input: 10, output: 5, totalTokens: 15 }) })
      )
    );

    expect(totals).toMatchObject({ input: 110, output: 25, totalTokens: 135, calls: 2 });
    expect(totals.cost).toBeCloseTo(0.006, 6);
    expect(Object.keys(totals.byModel)).toEqual([
      modelKey('anthropic', 'claude-sonnet-4-5'),
      modelKey('anthropic', 'claude-haiku-4-5')
    ]);
    expect(totals.byModel['anthropic/claude-haiku-4-5']).toMatchObject({ input: 10, calls: 1 });
  });

  it('counts nested tool usage and compaction, attributed to the requesting model', () => {
    const totals = projectUsage(
      recordsOf(
        assistantToolCall({ id: 'call-1', name: 'subagent' }),
        toolResult({ toolCallId: 'call-1', toolName: 'subagent', text: 'done', usage: usage({ input: 7, output: 3, totalTokens: 10 }) }),
        compaction('summary', 7, { usage: usage({ input: 1, output: 1, totalTokens: 2 }) })
      )
    );

    expect(totals.calls).toBe(3);
    expect(totals.input).toBe(108);
    expect(totals.byModel['anthropic/claude-sonnet-4-5'].calls).toBe(3);
  });

  it('derives a missing total from the parts the provider did report', () => {
    const totals = projectUsage(
      recordsOf(assistantText('a', 2, { usage: { input: 4, output: 6, cacheRead: 2, cacheWrite: 1 } }))
    );
    expect(totals.totalTokens).toBe(13);
    expect(totals.cost).toBe(0);
  });

  it('is zero for a run with no model calls', () => {
    expect(projectUsage(recordsOf(header(), userMessage('hi')))).toMatchObject({ totalTokens: 0, calls: 0 });
  });
});

describe('projectToolState', () => {
  it('tracks a tool through approval to completion', () => {
    const records = recordsOf(
      assistantToolCall({ id: 'call-1', name: 'deploy' }),
      custom(approvalRequestMessage({ toolCallId: 'call-1', prompt: 'deploy to prod?' })),
      custom({ ...approvalResolutionMessage({ toolCallId: 'call-1', decision: 'approved', actorId: 'user-1' }) }),
      toolResult({ toolCallId: 'call-1', toolName: 'deploy', text: 'deployed' })
    );

    const midway = projectToolState(records.slice(0, 2));
    expect(midway.tools['call-1'].status).toBe('awaiting-approval');
    expect(midway.pendingApprovals).toEqual([
      expect.objectContaining({ toolCallId: 'call-1', prompt: 'deploy to prod?' })
    ]);

    const approved = projectToolState(records.slice(0, 3));
    expect(approved.tools['call-1'].status).toBe('running');
    expect(approved.pendingApprovals).toEqual([]);
    expect(approved.tools['call-1'].approval).toMatchObject({ decision: 'approved', actorId: 'user-1' });

    const done = projectToolState(records);
    expect(done.tools['call-1']).toMatchObject({ status: 'completed', output: 'deployed' });
  });

  it('marks a rejected tool as rejected', () => {
    const state = projectToolState(
      recordsOf(
        assistantToolCall({ id: 'call-1', name: 'deploy' }),
        custom(approvalRequestMessage({ toolCallId: 'call-1', prompt: 'ok?' })),
        custom(approvalResolutionMessage({ toolCallId: 'call-1', decision: 'rejected', reason: 'not now' }))
      )
    );
    expect(state.tools['call-1']).toMatchObject({ status: 'rejected' });
    expect(state.tools['call-1'].approval).toMatchObject({ decision: 'rejected', reason: 'not now' });
  });

  it('throws on an approval message that cannot be attributed', () => {
    expect(() =>
      projectToolState(recordsOf(custom({ customType: APPROVAL_REQUEST_TYPE, content: 'ok?' })))
    ).toThrow(/no toolCallId/);
    expect(() =>
      projectToolState(recordsOf(custom({ customType: APPROVAL_RESOLUTION_TYPE, content: 'yes', details: {} })))
    ).toThrow(/no toolCallId/);
  });

  it('orders pending approvals oldest first', () => {
    const state = projectToolState(
      recordsOf(
        assistantToolCall({ id: 'call-1', name: 'a' }),
        assistantToolCall({ id: 'call-2', name: 'b' }),
        custom(approvalRequestMessage({ toolCallId: 'call-2', prompt: 'b?' })),
        custom(approvalRequestMessage({ toolCallId: 'call-1', prompt: 'a?' }))
      )
    );
    expect(state.pendingApprovals.map((a) => a.toolCallId)).toEqual(['call-2', 'call-1']);
  });
});

describe('projectSession', () => {
  it('projects a resumable session file with the header first', () => {
    const records = recordsOf(header(), userMessage('hi'), assistantText('hello'));
    const { jsonl, entries, piSessionVersion } = projectSession(records);

    expect(piSessionVersion).toBe(3);
    expect(entries[0]).toMatchObject({ type: 'session', id: 'session-1' });
    expect(jsonl.endsWith('\n')).toBe(true);
    expect(parseSessionJsonl(jsonl)).toEqual(entries);
  });

  it('synthesises a header when the log has none', () => {
    const { entries } = projectSession(recordsOf(userMessage('hi')), { sessionId: 's-9', cwd: '/w' });
    expect(entries[0]).toMatchObject({ type: 'session', id: 's-9', cwd: '/w', version: 3 });
    expect(entries).toHaveLength(2);
  });

  it('refuses to project an unloadable session', () => {
    expect(() => projectSession(recordsOf(userMessage('hi'), header()))).toThrow(/requires it first/);

    const mixed = recordsOf(userMessage('hi'), userMessage('there', 2));
    mixed[1] = { ...mixed[1], piSessionVersion: 2 };
    expect(() => projectSession(mixed)).toThrow(/mixes pi session versions/);
  });

  it('rejects a malformed session file rather than returning a partial one', () => {
    expect(() => parseSessionJsonl('{"type":"session"}\nnot json\n')).toThrow(/line 2 is not valid JSON/);
  });
});

describe('placement invariance', () => {
  it('projects identically whether entries were appended in one batch or streamed', async () => {
    const entries = [
      header(),
      userMessage('add a test'),
      assistantToolCall({ id: 'call-1', name: 'write_file', arguments: { path: 'a.ts' } }),
      toolResult({ toolCallId: 'call-1', toolName: 'write_file', text: 'wrote a.ts' }),
      assistantText('done', 5)
    ];

    const cloud = new MemoryRunLogStore();
    await cloud.append('run-1', entries);

    const local = new MemoryRunLogStore();
    for (const entry of entries) await local.append('run-1', [entry]);

    const cloudRecords = await readAll(cloud, 'run-1');
    const localRecords = await readAll(local, 'run-1');

    expect(localRecords.map((r) => r.seq)).toEqual(cloudRecords.map((r) => r.seq));
    expect(projectParts(localRecords)).toEqual(projectParts(cloudRecords));
    expect(projectUsage(localRecords)).toEqual(projectUsage(cloudRecords));
    expect(projectToolState(localRecords)).toEqual(projectToolState(cloudRecords));
    expect(projectSession(localRecords).jsonl).toEqual(projectSession(cloudRecords).jsonl);
  });
});
