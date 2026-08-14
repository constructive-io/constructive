import type { PiSessionEntry, PiSessionHeader, PiUsage } from '../src/pi-entry';

let counter = 0;
const nextId = (): string => {
  counter += 1;
  return counter.toString(16).padStart(8, '0');
};

export const resetIds = (): void => {
  counter = 0;
};

const at = (n: number): string => new Date(Date.UTC(2026, 0, 1, 0, 0, n)).toISOString();

export const usage = (over: Partial<PiUsage> = {}): PiUsage => ({
  input: 100,
  output: 20,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 120,
  cost: { input: 0.001, output: 0.002, cacheRead: 0, cacheWrite: 0, total: 0.003 },
  ...over
});

export const header = (over: Partial<PiSessionHeader> = {}): PiSessionEntry => ({
  type: 'session',
  version: 3,
  id: 'session-1',
  timestamp: at(0),
  cwd: '/repo',
  ...over
});

const entry = (type: string, rest: Record<string, unknown>, seq: number): PiSessionEntry =>
  ({ type, id: nextId(), parentId: null, timestamp: at(seq), ...rest }) as PiSessionEntry;

export const userMessage = (text: string, seq = 1): PiSessionEntry =>
  entry('message', { message: { role: 'user', content: text, timestamp: seq } }, seq);

export const assistantText = (text: string, seq = 2, over: Record<string, unknown> = {}): PiSessionEntry =>
  entry(
    'message',
    {
      message: {
        role: 'assistant',
        content: [{ type: 'text', text }],
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        usage: usage(),
        stopReason: 'stop',
        ...over
      }
    },
    seq
  );

export const assistantToolCall = (
  call: { id: string; name: string; arguments?: Record<string, unknown> },
  seq = 3,
  over: Record<string, unknown> = {}
): PiSessionEntry =>
  entry(
    'message',
    {
      message: {
        role: 'assistant',
        content: [{ type: 'toolCall', ...call }],
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        usage: usage({ output: 30, totalTokens: 130 }),
        stopReason: 'toolUse',
        ...over
      }
    },
    seq
  );

export const toolResult = (
  result: { toolCallId: string; toolName: string; text: string; isError?: boolean; usage?: PiUsage },
  seq = 4
): PiSessionEntry =>
  entry(
    'message',
    {
      message: {
        role: 'toolResult',
        toolCallId: result.toolCallId,
        toolName: result.toolName,
        content: [{ type: 'text', text: result.text }],
        isError: result.isError ?? false,
        ...(result.usage ? { usage: result.usage } : {})
      }
    },
    seq
  );

export const custom = (
  message: { customType: string; content: string; details?: unknown; display?: boolean },
  seq = 5
): PiSessionEntry => entry('message', { message: { role: 'custom', display: true, ...message } }, seq);

export const bash = (command: string, output: string, exitCode = 0, seq = 6): PiSessionEntry =>
  entry('message', { message: { role: 'bashExecution', command, output, exitCode } }, seq);

export const compaction = (summary: string, seq = 7, over: Record<string, unknown> = {}): PiSessionEntry =>
  entry('compaction', { summary, tokensBefore: 50_000, ...over }, seq);

export const branchSummary = (summary: string, seq = 8, over: Record<string, unknown> = {}): PiSessionEntry =>
  entry('branch_summary', { summary, fromId: 'aaaaaaaa', ...over }, seq);

/** An entry type this version of the package has never seen. */
export const futureEntry = (seq = 9): PiSessionEntry => entry('quantum_thought', { intensity: 11 }, seq);
