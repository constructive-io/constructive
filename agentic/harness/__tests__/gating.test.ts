import { ConfirmGate, ConfirmGateDeps, createConfirmGate, GateHost } from '../src/gating/confirm-gate';
import { createDeclineGuard } from '../src/gating/decline-guard';
import { buildConfirmPrompt } from '../src/gating/prompts';

type Harness = {
  gate: ConfirmGate;
  host: GateHost;
  confirmCalls: () => number;
  skipNotices: () => string[];
  setApproved: (value: boolean) => void;
};

function createHarness(deps?: Partial<ConfirmGateDeps>): Harness {
  let confirmCount = 0;
  let approved = false;
  const notified: string[] = [];
  const host: GateHost = {
    hasUI: true,
    confirmTool: async () => {
      confirmCount += 1;
      return approved;
    },
    notifyToolSkipped: (toolCallId) => {
      notified.push(toolCallId);
    },
  };
  const gateDeps: ConfirmGateDeps = {
    isProjectRunnable: async () => false,
    hasDataToken: async () => false,
    resolveTemplatePreview: async () => undefined,
    ...deps,
  };
  return {
    gate: createConfirmGate(gateDeps),
    host,
    confirmCalls: () => confirmCount,
    skipNotices: () => notified,
    setApproved: (value) => {
      approved = value;
    },
  };
}

const CWD = '/tmp/project';

function call(toolName: string, toolCallId: string, input: Record<string, unknown>) {
  return { toolName, toolCallId, input };
}

describe('confirm gate: declines are respected', () => {
  it('declining once, then re-issuing the same call, blocks without a second prompt', async () => {
    const { gate, host, confirmCalls, skipNotices } = createHarness();
    const input = { projectName: 'demo', region: 'us' };

    const first = await gate.onToolCall(call('provision_database', 'tc-1', input), host, CWD);
    expect(first?.block).toBe(true);
    expect(first?.reason).toMatch(/declined it/);
    expect(confirmCalls()).toBe(1);

    // Same call with keys in a different order is still the same call.
    const retry = await gate.onToolCall(
      call('provision_database', 'tc-2', { region: 'us', projectName: 'demo' }),
      host,
      CWD
    );
    expect(retry?.block).toBe(true);
    expect(retry?.reason).toMatch(/already declined/);
    expect(confirmCalls()).toBe(1);
    expect(skipNotices()).toEqual(['tc-2']);
  });

  it('a call with different arguments prompts normally after a decline', async () => {
    const { gate, host, confirmCalls } = createHarness();
    await gate.onToolCall(call('provision_database', 'tc-1', { projectName: 'demo' }), host, CWD);
    expect(confirmCalls()).toBe(1);

    const other = await gate.onToolCall(
      call('provision_database', 'tc-2', { projectName: 'other' }),
      host,
      CWD
    );
    expect(other?.block).toBe(true);
    expect(confirmCalls()).toBe(2);
  });

  it('a new agent run clears the decline and prompts again', async () => {
    const { gate, host, confirmCalls, setApproved } = createHarness();
    const input = { projectName: 'demo' };
    await gate.onToolCall(call('provision_database', 'tc-1', input), host, CWD);
    expect(confirmCalls()).toBe(1);

    gate.onAgentStart();
    setApproved(true);
    const afterReset = await gate.onToolCall(call('provision_database', 'tc-2', input), host, CWD);
    expect(afterReset).toBeUndefined();
    expect(confirmCalls()).toBe(2);
  });

  it('an approved mutation clears earlier declines so they re-prompt', async () => {
    const { gate, host, confirmCalls, setApproved } = createHarness();
    const declinedInput = { projectName: 'demo' };
    await gate.onToolCall(call('provision_database', 'tc-1', declinedInput), host, CWD);
    expect(confirmCalls()).toBe(1);

    setApproved(true);
    const approvedOther = await gate.onToolCall(
      call('provision_database', 'tc-2', { projectName: 'other' }),
      host,
      CWD
    );
    expect(approvedOther).toBeUndefined();
    expect(confirmCalls()).toBe(2);

    const reprompted = await gate.onToolCall(
      call('provision_database', 'tc-3', declinedInput),
      host,
      CWD
    );
    expect(reprompted).toBeUndefined();
    expect(confirmCalls()).toBe(3);
  });

  it('guards gated non-bootstrap tools through the runnable-project path too', async () => {
    const { gate, host, confirmCalls } = createHarness({ isProjectRunnable: async () => true });
    const input = { tableName: 'users' };

    const first = await gate.onToolCall(call('delete_table', 'tc-1', input), host, CWD);
    expect(first?.block).toBe(true);
    expect(first?.reason).toMatch(/declined it/);
    expect(confirmCalls()).toBe(1);

    const retry = await gate.onToolCall(call('delete_table', 'tc-2', input), host, CWD);
    expect(retry?.block).toBe(true);
    expect(retry?.reason).toMatch(/already declined/);
    expect(confirmCalls()).toBe(1);
  });

  it('skips the confirm entirely for unrunnable projects and tokenless add_records', async () => {
    const { gate, host, confirmCalls } = createHarness();
    expect(await gate.onToolCall(call('delete_table', 'tc-1', {}), host, CWD)).toBeUndefined();
    expect(confirmCalls()).toBe(0);

    const withProject = createHarness({ isProjectRunnable: async () => true });
    expect(
      await withProject.gate.onToolCall(
        call('add_records', 'tc-1', { table_name: 't' }),
        withProject.host,
        CWD
      )
    ).toBeUndefined();
    expect(withProject.confirmCalls()).toBe(0);
  });

  it('blocks mutating tools when no confirmation UI is available', async () => {
    const { gate, confirmCalls } = createHarness();
    const headless: GateHost = {
      hasUI: false,
      confirmTool: async () => true,
      notifyToolSkipped: () => undefined,
    };
    const result = await gate.onToolCall(call('delete_table', 'tc-1', {}), headless, CWD);
    expect(result?.block).toBe(true);
    expect(result?.reason).toMatch(/no confirmation UI/);
    expect(confirmCalls()).toBe(0);
  });

  it('ignores tools outside the mutating set', async () => {
    const { gate, host, confirmCalls } = createHarness();
    const result = await gate.onToolCall(call('describe_schema', 'tc-1', {}), host, CWD);
    expect(result).toBeUndefined();
    expect(confirmCalls()).toBe(0);
  });
});

describe('decline guard canonicalization', () => {
  it('treats nested key order as equivalent and clears per run', () => {
    const guard = createDeclineGuard();
    guard.recordDecline('t', { a: { x: 1, y: [1, 2] }, b: 'z' });
    expect(guard.checkRetry('t', { b: 'z', a: { y: [1, 2], x: 1 } })).toMatch(/already declined/);
    expect(guard.checkRetry('t', { b: 'z', a: { y: [2, 1], x: 1 } })).toBeNull();
    guard.clear();
    expect(guard.checkRetry('t', { a: { x: 1, y: [1, 2] }, b: 'z' })).toBeNull();
  });
});

describe('buildConfirmPrompt', () => {
  it('summarizes blueprint provisioning with a table preview', () => {
    const prompt = buildConfirmPrompt('provision_blueprint', {
      name: 'crm',
      definition: {
        tables: [
          {
            table_name: 'contacts',
            fields: [{ name: 'email', type: 'email', is_required: true }],
            policies: [{ $type: 'AuthzDirectOwner' }, { $type: 'AuthzNotReadOnly' }],
          },
        ],
        relations: [{ source_table: 'contacts', target_table: 'orgs' }],
      },
    });
    expect(prompt.title).toBe('Create tables?');
    expect(prompt.message).toContain('"crm"');
    expect(prompt.preview).toEqual({
      kind: 'blueprint',
      tables: [
        {
          name: 'contacts',
          fields: [{ name: 'email', type: 'email', isRequired: true, defaultValue: null }],
          policies: ['AuthzDirectOwner'], // internal AuthzNotReadOnly filtered out
          relationCount: 1,
        },
      ],
    });
  });

  it('falls back to a generic prompt for unknown tools', () => {
    const prompt = buildConfirmPrompt('mystery_tool', {});
    expect(prompt.message).toContain('mystery_tool');
  });
});
