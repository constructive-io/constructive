import {
  CompositePolicyEngine,
  ContextualPolicyEngine,
  RuleBasedContextualPolicyEngine,
  StaticPolicyEngine,
} from '../../src/policy/policy-engine';
import { createEchoTool } from '../../src/testing/test-tools';
import type { AgentRunRecord } from '../../src/types/run-state';

describe('StaticPolicyEngine', () => {
  it('uses rule for capability and defaults risk class from tool', async () => {
    const engine = new StaticPolicyEngine(
      {
        read: {
          action: 'allow',
          reason: 'Reads are allowed',
        },
      },
      {
        action: 'deny',
        reason: 'Default deny',
      },
    );

    const run: AgentRunRecord = {
      id: 'run-1',
      status: 'running',
      actorId: 'actor',
      modelProvider: 'openai',
      modelName: 'gpt-4.1-mini',
      startedAt: Date.now(),
    };

    const tool = createEchoTool('read_tool');

    const decision = await engine.evaluate({
      run,
      tool,
      invocation: {
        toolName: tool.name,
        args: {},
      },
    });

    expect(decision.action).toBe('allow');
    expect(decision.reason).toBe('Reads are allowed');
    expect(decision.riskClass).toBe('read_only');
  });

  it('falls back to default rule', async () => {
    const engine = new StaticPolicyEngine(
      {},
      {
        action: 'deny',
        reason: 'Default deny',
      },
    );

    const run: AgentRunRecord = {
      id: 'run-2',
      status: 'running',
      actorId: 'actor',
      modelProvider: 'openai',
      modelName: 'gpt-4.1-mini',
      startedAt: Date.now(),
    };

    const tool = {
      ...createEchoTool('unsafe_tool'),
      capability: 'unsafe' as const,
      riskClass: 'high' as const,
    };

    const decision = await engine.evaluate({
      run,
      tool,
      invocation: {
        toolName: tool.name,
        args: {},
      },
    });

    expect(decision.action).toBe('deny');
    expect(decision.reason).toBe('Default deny');
    expect(decision.riskClass).toBe('high');
  });
});

describe('CompositePolicyEngine', () => {
  it('chooses the strictest action across policy engines', async () => {
    const readTool = createEchoTool('read_tool');

    const run: AgentRunRecord = {
      id: 'run-3',
      status: 'running',
      actorId: 'actor',
      modelProvider: 'openai',
      modelName: 'gpt-4.1-mini',
      startedAt: Date.now(),
    };

    const staticEngine = new StaticPolicyEngine(
      {
        read: {
          action: 'allow',
          reason: 'Read is allowed',
        },
      },
      {
        action: 'deny',
        reason: 'Default deny',
      },
    );

    const contextual = new ContextualPolicyEngine(async () => {
      return {
        action: 'needs_approval',
        reason: 'Tenant-level policy requires approval',
        riskClass: 'low',
      };
    });

    const engine = new CompositePolicyEngine([staticEngine, contextual]);
    const decision = await engine.evaluate({
      run,
      tool: readTool,
      invocation: {
        toolName: readTool.name,
        args: {},
      },
    });

    expect(decision.action).toBe('needs_approval');
    expect(decision.reason).toBe('Tenant-level policy requires approval');
  });
});

describe('RuleBasedContextualPolicyEngine', () => {
  it('matches rule by tenant and invocation arg path', async () => {
    const run: AgentRunRecord = {
      id: 'run-4',
      status: 'running',
      actorId: 'actor-a',
      tenantId: 'tenant-1',
      modelProvider: 'openai',
      modelName: 'gpt-4.1-mini',
      startedAt: Date.now(),
      metadata: {
        environment: 'prod',
      },
    };

    const tool = {
      ...createEchoTool('update_entity'),
      capability: 'write' as const,
      riskClass: 'low' as const,
    };

    const engine = new RuleBasedContextualPolicyEngine({
      rules: [
        {
          id: 'prod-owner-approval',
          priority: 10,
          matcher: {
            tenantIds: ['tenant-1'],
            toolNames: ['update_entity'],
            invocationArgsEquals: {
              ownerId: 'owner-1',
            },
            metadataEquals: {
              environment: 'prod',
            },
          },
          action: 'needs_approval',
          reason: 'Prod owner writes require approval.',
        },
      ],
    });

    const decision = await engine.evaluate({
      run,
      tool,
      invocation: {
        toolName: tool.name,
        args: {
          ownerId: 'owner-1',
        },
      },
    });

    expect(decision.action).toBe('needs_approval');
    expect(decision.reason).toContain('Prod owner writes');
    expect(decision.metadata?.ruleId).toBe('prod-owner-approval');
  });

  it('falls back to default decision when no rule matches', async () => {
    const run: AgentRunRecord = {
      id: 'run-5',
      status: 'running',
      actorId: 'actor-b',
      tenantId: 'tenant-2',
      modelProvider: 'openai',
      modelName: 'gpt-4.1-mini',
      startedAt: Date.now(),
    };

    const tool = {
      ...createEchoTool('write_entity'),
      capability: 'write' as const,
      riskClass: 'low' as const,
    };

    const engine = new RuleBasedContextualPolicyEngine({
      rules: [],
      defaultDecision: {
        action: 'deny',
        reason: 'No matching tenant policy.',
        riskClass: 'high',
      },
    });

    const decision = await engine.evaluate({
      run,
      tool,
      invocation: {
        toolName: tool.name,
        args: {
          ownerId: 'owner-2',
        },
      },
    });

    expect(decision.action).toBe('deny');
    expect(decision.reason).toBe('No matching tenant policy.');
  });
});
