import { constructiveDbTools } from '@agentic-kit/db-tools';
import { defineHarnessTool } from '@agentic-kit/harness';
import { z } from 'zod';

import type {
  DshApprovalOutcome,
  DshPluginContext,
  DshPreToolDecision,
  DshToolDefinition,
  DshToolExecution
} from '../src';
import { createConstructivePlugin, DSH_PLUGIN_NAME } from '../src';

type PreExecuteListener = (
  exec: DshToolExecution,
  next: () => Promise<DshPreToolDecision>
) => Promise<DshPreToolDecision>;

class FakeContext implements DshPluginContext {
  registered: DshToolDefinition[] = [];
  listeners: PreExecuteListener[] = [];
  asked: { toolName: string; callId?: string }[] = [];
  outcome: DshApprovalOutcome = 'allowed-once';
  approval: DshPluginContext['approval'];

  constructor(withApproval = true) {
    if (withApproval) {
      this.approval = {
        request: async (request) => {
          this.asked.push({ toolName: request.toolName, callId: request.callId });
          return this.outcome;
        }
      };
    }
  }

  tools = {
    register: (definition: DshToolDefinition) => {
      this.registered.push(definition);
      return (): void => undefined;
    }
  };

  on(_event: 'tools/pre-execute', listener: PreExecuteListener) {
    this.listeners.push(listener);
    return this;
  }

  decide(exec: DshToolExecution): Promise<DshPreToolDecision> {
    return this.listeners[0](exec, async () => ({ kind: 'allow' }));
  }
}

const mutating = defineHarnessTool({
  name: 'delete_table',
  label: 'Delete table',
  description: 'Delete a table.',
  parameters: z.object({ table: z.string() }),
  async execute() {
    return { content: [{ type: 'text' as const, text: 'deleted' }], details: null };
  }
});

const gate = {
  isProjectRunnable: async () => true,
  hasDataToken: async () => true,
  resolveTemplatePreview: async (): Promise<undefined> => undefined
};

describe('createConstructivePlugin', () => {
  it('registers every Constructive db tool into dsh’s registry', () => {
    const ctx = new FakeContext();
    const plugin = createConstructivePlugin({ gate: false });
    expect(plugin.name).toBe(DSH_PLUGIN_NAME);
    expect(plugin.inject).toEqual(['tools']);

    plugin.apply(ctx);

    expect(ctx.registered).toHaveLength(constructiveDbTools.length);
    expect(ctx.registered.map((tool) => tool.name)).toEqual(
      constructiveDbTools.map((tool) => tool.name)
    );
    expect(ctx.listeners).toHaveLength(0);
  });

  it('lets an ungated call through the pre-execute waterfall', async () => {
    const ctx = new FakeContext();
    createConstructivePlugin({ tools: [mutating], gate }).apply(ctx);

    const decision = await ctx.decide({ callId: 'c1', name: 'describe_schema', arguments: {} });
    expect(decision).toEqual({ kind: 'allow' });
    expect(ctx.asked).toEqual([]);
  });

  it('asks dsh’s approval service for a gated call, and allows what it approves', async () => {
    const ctx = new FakeContext();
    createConstructivePlugin({ tools: [mutating], gate }).apply(ctx);

    const decision = await ctx.decide({
      callId: 'c1',
      name: 'delete_table',
      arguments: { table: 'posts' }
    });

    expect(ctx.asked).toEqual([{ toolName: 'delete_table', callId: 'c1' }]);
    expect(decision).toEqual({ kind: 'allow' });
  });

  it('denies what the approval service rejects, with a reason the model reads', async () => {
    const ctx = new FakeContext();
    ctx.outcome = 'rejected';
    createConstructivePlugin({ tools: [mutating], gate }).apply(ctx);

    const decision = await ctx.decide({
      callId: 'c1',
      name: 'delete_table',
      arguments: { table: 'posts' }
    });

    expect(decision.kind).toBe('deny');
    expect((decision as { reason: string }).reason).toMatch(/.+/);
  });

  it('fails closed on a host with no approval service composed', async () => {
    const ctx = new FakeContext(false);
    createConstructivePlugin({ tools: [mutating], gate }).apply(ctx);

    const decision = await ctx.decide({
      callId: 'c1',
      name: 'delete_table',
      arguments: { table: 'posts' }
    });

    expect(decision.kind).toBe('deny');
  });
});
