import type { GateReadiness, PlanTarget } from '@agentic-kit/harness';
import type { ExtensionContext, ToolCallEvent } from '@earendil-works/pi-coding-agent';

import { createConfirmGate } from '../src/confirm-gate';

const target: PlanTarget = {
  kind: 'database',
  database: { name: 'shop', id: 'db-1' },
  apiEndpoint: 'http://api.localhost:3000/graphql',
  account: { userId: 'user-1' },
};
const deps = {
  precondition: async (): Promise<GateReadiness> => ({ kind: 'ready', target }),
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
    expect(calls[0][4]).toEqual(target);
  });

  it("falls back to pi's built-in ui.confirm when no rich surface exists", async () => {
    const confirms: string[][] = [];
    const ui = {
      confirm: async (title: string, message: string) => {
        confirms.push([title, message]);
        return false;
      },
    };
    const gate = createConfirmGate(deps);
    gate.onAgentStart();
    const result = await gate.onToolCall(event('delete_table', { table_name: 't' }), fakeCtx(ui));
    expect(confirms).toEqual([
      [
        'Delete table t',
        'database  shop (db-1)\nbackend   http://api.localhost:3000/graphql\nas        user user-1\n\n- t  the table and all its rows\n! This cannot be undone.',
      ],
    ]);
    expect(result).toMatchObject({ block: true });
  });
});
