import type { ExtensionContext, ToolCallEvent } from '@earendil-works/pi-coding-agent';

import { createConfirmGate } from '../src/confirm-gate';

const deps = {
  resolveProjectContext: async () =>
    ({ context: { databaseId: 'db1' }, reason: '' }) as never,
  resolveDataToken: async () => ({ token: 'tok' }) as never,
  createTemplatePreviewTables: async () => ({ blueprintName: '', tables: [] }) as never,
};

function fakeCtx(ui: Record<string, unknown>): ExtensionContext {
  return { hasUI: true, ui, cwd: '/tmp/project' } as unknown as ExtensionContext;
}

function event(toolName: string, input?: Record<string, unknown>): ToolCallEvent {
  return { toolName, toolCallId: 'tc-1', input } as unknown as ToolCallEvent;
}

describe('confirm gate pi adapter', () => {
  it('uses a rich confirmTool ui when the host provides one', async () => {
    const calls: unknown[][] = [];
    const ui = {
      confirmTool: async (...args: unknown[]) => {
        calls.push(args);
        return true;
      },
      confirm: async () => {
        throw new Error('should not fall back');
      },
    };
    const gate = createConfirmGate(deps);
    gate.onAgentStart();
    const result = await gate.onToolCall(event('delete_table', { table_name: 't' }), fakeCtx(ui));
    expect(result).toBeUndefined(); // approved -> tool proceeds
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('tc-1');
  });

  it("falls back to pi's built-in ui.confirm when no rich surface exists", async () => {
    const confirms: string[] = [];
    const ui = {
      confirm: async (title: string) => {
        confirms.push(title);
        return false;
      },
    };
    const gate = createConfirmGate(deps);
    gate.onAgentStart();
    const result = await gate.onToolCall(event('delete_table', { table_name: 't' }), fakeCtx(ui));
    expect(confirms).toHaveLength(1);
    expect(result).toMatchObject({ block: true });
  });
});
