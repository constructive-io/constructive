import { ConfirmGate, ConfirmGateDeps, createConfirmGate, GateHost } from '../src/gating/confirm-gate';
import { createDeclineGuard } from '../src/gating/decline-guard';
import { buildConfirmPrompt, MUTATING_DB_TOOLS } from '../src/gating/prompts';

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

  it('lets manage_entity_types list pass without a prompt', async () => {
    const { gate, host, confirmCalls } = createHarness({ isProjectRunnable: async () => true });
    const result = await gate.onToolCall(
      call('manage_entity_types', 'tc-1', { action: 'list' }),
      host,
      CWD
    );
    expect(result).toBeUndefined();
    expect(confirmCalls()).toBe(0);
  });

  it('gates manage_entity_types mutations', async () => {
    const { gate, host, confirmCalls } = createHarness({ isProjectRunnable: async () => true });
    const result = await gate.onToolCall(
      call('manage_entity_types', 'tc-1', { action: 'create', name: 'org' }),
      host,
      CWD
    );
    expect(result?.block).toBe(true);
    expect(confirmCalls()).toBe(1);
  });

  it('skips the confirm for tokenless create_api_key but gates it with a token', async () => {
    const tokenless = createHarness({ isProjectRunnable: async () => true });
    expect(
      await tokenless.gate.onToolCall(
        call('create_api_key', 'tc-1', { key_name: 'deploy bot' }),
        tokenless.host,
        CWD
      )
    ).toBeUndefined();
    expect(tokenless.confirmCalls()).toBe(0);

    const withToken = createHarness({
      isProjectRunnable: async () => true,
      hasDataToken: async () => true,
    });
    const result = await withToken.gate.onToolCall(
      call('create_api_key', 'tc-1', { key_name: 'deploy bot' }),
      withToken.host,
      CWD
    );
    expect(result?.block).toBe(true);
    expect(withToken.confirmCalls()).toBe(1);
  });
});

describe('confirm gate: the gated-tool set is injectable', () => {
  it('gates the default MUTATING_DB_TOOLS set when none is injected', async () => {
    const { gate, host, confirmCalls } = createHarness({ isProjectRunnable: async () => true });
    for (const toolName of MUTATING_DB_TOOLS) {
      if (toolName === 'add_records' || toolName === 'create_api_key') continue; // tokenless: skipped
      const result = await gate.onToolCall(call(toolName, `tc-${toolName}`, {}), host, CWD);
      expect(result?.block).toBe(true);
    }
    expect(confirmCalls()).toBe(MUTATING_DB_TOOLS.size - 2);
  });

  it('gates only the injected set: a custom tool is gated, a default one is not', async () => {
    const { gate, host, confirmCalls } = createHarness({
      isProjectRunnable: async () => true,
      gatedTools: new Set(['bash']),
    });

    const gated = await gate.onToolCall(call('bash', 'tc-1', { command: 'rm -rf /' }), host, CWD);
    expect(gated?.block).toBe(true);
    expect(gated?.reason).toMatch(/declined it/);
    expect(confirmCalls()).toBe(1);

    // delete_table is in MUTATING_DB_TOOLS but not in the injected set.
    const ungated = await gate.onToolCall(
      call('delete_table', 'tc-2', { table_name: 'users' }),
      host,
      CWD
    );
    expect(ungated).toBeUndefined();
    expect(confirmCalls()).toBe(1);
  });

  it('applies the decline guard and headless block to injected tools too', async () => {
    const { gate, host, confirmCalls, skipNotices } = createHarness({
      isProjectRunnable: async () => true,
      gatedTools: new Set(['bash']),
    });
    const input = { command: 'git push --force' };

    await gate.onToolCall(call('bash', 'tc-1', input), host, CWD);
    const retry = await gate.onToolCall(call('bash', 'tc-2', input), host, CWD);
    expect(retry?.reason).toMatch(/already declined/);
    expect(confirmCalls()).toBe(1);
    expect(skipNotices()).toEqual(['tc-2']);

    const headless: GateHost = {
      hasUI: false,
      confirmTool: async () => true,
      notifyToolSkipped: () => undefined,
    };
    const blocked = await gate.onToolCall(call('bash', 'tc-3', {}), headless, CWD);
    expect(blocked?.reason).toMatch(/no confirmation UI/);
  });

  it('gates nothing when an empty set is injected', async () => {
    const { gate, host, confirmCalls } = createHarness({
      isProjectRunnable: async () => true,
      gatedTools: new Set<string>(),
    });
    expect(
      await gate.onToolCall(call('provision_database', 'tc-1', {}), host, CWD)
    ).toBeUndefined();
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

  it('builds action-specific prompts for manage_entity_types', () => {
    const create = buildConfirmPrompt('manage_entity_types', { action: 'create', name: 'org' });
    expect(create.title).toBe('Create entity type?');
    expect(create.message).toContain('"org"');

    const remove = buildConfirmPrompt('manage_entity_types', {
      action: 'delete',
      entity_type_id: 'etp-1',
    });
    expect(remove.title).toBe('Delete entity type?');
    expect(remove.message).toMatch(/stay in the API schema/);
  });

  it('summarizes scope in the create_api_key prompt', async () => {
    const unscoped = buildConfirmPrompt('create_api_key', { key_name: 'deploy bot' });
    expect(unscoped.title).toBe('Create API key?');
    expect(unscoped.message).toContain('"deploy bot"');
    expect(unscoped.message).toContain('unscoped');
    expect(unscoped.message).toMatch(/never to the agent/);

    const scoped = buildConfirmPrompt('create_api_key', {
      key_name: 'ci',
      entity_ids: ['e-1', 'e-2'],
      read_only: true,
    });
    expect(scoped.message).toContain('scoped to 2 entities');
    expect(scoped.message).toContain('read-only');
  });
});
