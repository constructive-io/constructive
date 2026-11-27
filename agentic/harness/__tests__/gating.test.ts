import { ConfirmGate, ConfirmGateDeps, createConfirmGate, GateHost } from '../src/gating/confirm-gate';
import { createConstructiveGatePolicy, type GateReadiness } from '../src/gating/constructive-policy';
import { createDeclineGuard } from '../src/gating/decline-guard';
import type { GatePolicy } from '../src/gating/policy';
import type { PlanRule, PlanTableAccess, PlanTarget } from '../src/gating/preview';
import { buildConfirmPrompt } from '../src/gating/prompts';
import type { ToolEffect, ToolFailure } from '../src/tools/tool';

// What the precondition resolved: the bound database of the directory, and a new database's backend and account.
const TARGET: PlanTarget = {
  kind: 'database',
  database: { name: 'shop', id: '019a1d47-5c2e-7a1b-8f00-112233445566' },
  apiEndpoint: 'http://api.localhost:3000/graphql',
  account: { userId: 'user-1' },
};
const NEW_DATABASE: PlanTarget = { kind: 'account', apiEndpoint: 'http://api.localhost:3000/graphql', account: { userId: 'user-1' } };
const READY: GateReadiness = { kind: 'ready', target: TARGET };

type Harness = {
  gate: ConfirmGate;
  host: GateHost;
  confirmCalls: () => number;
  skipNotices: () => string[];
  setApproved: (value: boolean) => void;
};

// The effects the db tools these cases call declare; db-tools checks the real
// tools against the policy.
const EFFECTS: Record<string, ToolEffect> = {
  provision_database: 'write',
  delete_table: 'destructive',
  add_records: 'write',
  create_api_key: 'write',
  describe_schema: 'read',
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
    effectOf: (toolName) => EFFECTS[toolName],
    precondition: async () => READY,
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

  it('guards gated non-bootstrap tools too', async () => {
    const { gate, host, confirmCalls } = createHarness();
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

  it('blocks a call whose precondition fails with that failure, and never asks', async () => {
    const failure: ToolFailure = {
      code: 'no-env',
      message: 'No .env found in the project.',
      hint: 'Provision a Constructive database first, then retry.',
    };
    const { gate, host, confirmCalls } = createHarness({ precondition: async () => ({ kind: 'blocked', failure }) });
    const headless: GateHost = { ...host, hasUI: false };

    for (const target of [host, headless]) {
      const result = await gate.onToolCall(call('add_records', 'tc-1', { table_name: 't' }), target, CWD);
      expect(result).toEqual({
        block: true,
        reason: 'No .env found in the project. Provision a Constructive database first, then retry.',
        failure,
      });
    }
    expect(confirmCalls()).toBe(0);
  });

  it('checks the precondition of the call it gates', async () => {
    const seen: unknown[] = [];
    const { gate, host } = createHarness({
      precondition: async (toolName, input, cwd) => {
        seen.push([toolName, input, cwd]);
        return READY;
      },
    });
    await gate.onToolCall(call('delete_table', 'tc-1', { table_name: 'posts' }), host, CWD);
    await gate.onToolCall(call('describe_schema', 'tc-2', {}), host, CWD);
    expect(seen).toEqual([['delete_table', { table_name: 'posts' }, CWD]]);
  });

  it('puts what the precondition resolved into the plan as its target, and shows it to the host', async () => {
    const DELETE_POSTS = ['- posts  the table and all its rows', '! This cannot be undone.'].join('\n');
    const policy = createConstructiveGatePolicy({
      effectOf: (toolName) => EFFECTS[toolName],
      precondition: async () => READY,
      resolveTemplatePreview: async () => undefined,
    });
    const decision = await policy.resolvePrompt(call('delete_table', 'tc-1', { table_name: 'posts' }), CWD);
    expect(decision).toEqual({
      kind: 'ask',
      prompt: { title: 'Delete table posts', message: DELETE_POSTS, target: TARGET },
    });

    const shown: unknown[][] = [];
    const { gate, host } = createHarness();
    await gate.onToolCall(call('delete_table', 'tc-2', { table_name: 'posts' }), {
      ...host,
      confirmTool: async (...args) => {
        shown.push(args);
        return false;
      },
    }, CWD);
    expect(shown).toEqual([['tc-2', 'Delete table posts', DELETE_POSTS, undefined, TARGET]]);
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

  it('lets a read call through without a prompt', async () => {
    const { gate, host, confirmCalls } = createHarness();
    const result = await gate.onToolCall(call('describe_schema', 'tc-1', {}), host, CWD);
    expect(result).toBeUndefined();
    expect(confirmCalls()).toBe(0);
  });
});

describe('confirm gate: the Constructive policy gates by effect', () => {
  it('gates write and destructive calls, and lets a read through', async () => {
    const effects: Record<string, ToolEffect> = { shell: 'destructive', note: 'write', list: 'read' };
    const { gate, host, confirmCalls } = createHarness({ effectOf: (toolName) => effects[toolName] });

    expect((await gate.onToolCall(call('shell', 'tc-1', { command: 'rm -rf /' }), host, CWD))?.block).toBe(true);
    expect((await gate.onToolCall(call('note', 'tc-2', { text: 'hi' }), host, CWD))?.block).toBe(true);
    expect(await gate.onToolCall(call('list', 'tc-3', {}), host, CWD)).toBeUndefined();
    expect(confirmCalls()).toBe(2);
  });

  it('leaves a tool it has no effect for ungated', async () => {
    const { gate, host, confirmCalls } = createHarness({
      effectOf: () => undefined,
    });
    expect(await gate.onToolCall(call('delete_table', 'tc-1', {}), host, CWD)).toBeUndefined();
    expect(confirmCalls()).toBe(0);
  });

  it('applies the decline guard and headless block to every gated call', async () => {
    const { gate, host, confirmCalls, skipNotices } = createHarness({
      effectOf: () => 'write',
    });
    const input = { command: 'git push --force' };

    await gate.onToolCall(call('shell', 'tc-1', input), host, CWD);
    const retry = await gate.onToolCall(call('shell', 'tc-2', input), host, CWD);
    expect(retry?.reason).toMatch(/already declined/);
    expect(confirmCalls()).toBe(1);
    expect(skipNotices()).toEqual(['tc-2']);

    const headless: GateHost = {
      hasUI: false,
      confirmTool: async () => true,
      notifyToolSkipped: () => undefined,
    };
    const blocked = await gate.onToolCall(call('shell', 'tc-3', {}), headless, CWD);
    expect(blocked?.reason).toMatch(/no confirmation UI/);
  });
});

describe('confirm gate: a host can supply its own policy', () => {
  // What a remote coding host wants: gate the shell, and only when the command
  // is destructive. Nothing Constructive-specific, no project context.
  function createShellHostHarness() {
    let confirmed: { title: string; message: string } | undefined;
    const host: GateHost = {
      hasUI: true,
      confirmTool: async (_toolCallId, title, message) => {
        confirmed = { title, message };
        return false;
      },
      notifyToolSkipped: () => undefined,
    };
    const commandOf = (input: Record<string, unknown> | undefined) =>
      typeof input?.command === 'string' ? input.command : '';
    const policy: GatePolicy = {
      isGated: (event) => event.toolName === 'bash' && /rm -rf|push --force/.test(commandOf(event.input)),
      resolvePrompt: async (event, cwd) => ({
        kind: 'ask',
        prompt: { title: 'Run a destructive command?', message: `Allow \`${commandOf(event.input)}\`?`, target: { kind: 'workspace', cwd } },
      }),
    };
    return { gate: createConfirmGate({ policy }), host, confirmed: () => confirmed };
  }

  it('gates the host\'s tool and ignores the Constructive policy', async () => {
    const { gate, host, confirmed } = createShellHostHarness();

    const gated = await gate.onToolCall(call('bash', 'tc-1', { command: 'rm -rf /src' }), host, CWD);
    expect(gated?.block).toBe(true);
    expect(gated?.reason).toMatch(/declined it/);
    expect(confirmed()?.title).toBe('Run a destructive command?');
    expect(confirmed()?.message).toContain('rm -rf /src');

    // delete_table is destructive, but this host's policy never gates it.
    expect(
      await gate.onToolCall(call('delete_table', 'tc-2', { table_name: 'users' }), host, CWD)
    ).toBeUndefined();
  });

  it('leaves a call its policy does not gate alone', async () => {
    const { gate, host, confirmed } = createShellHostHarness();
    expect(
      await gate.onToolCall(call('bash', 'tc-1', { command: 'ls -la' }), host, CWD)
    ).toBeUndefined();
    expect(confirmed()).toBeUndefined();
  });

  it('still applies the decline memory and the headless block', async () => {
    const { gate, host } = createShellHostHarness();
    const input = { command: 'git push --force' };

    await gate.onToolCall(call('bash', 'tc-1', input), host, CWD);
    const retry = await gate.onToolCall(call('bash', 'tc-2', input), host, CWD);
    expect(retry?.reason).toMatch(/already declined/);

    const headless: GateHost = {
      hasUI: false,
      confirmTool: async () => true,
      notifyToolSkipped: () => undefined,
    };
    const blocked = await gate.onToolCall(
      call('bash', 'tc-3', { command: 'rm -rf /src' }),
      headless,
      CWD
    );
    expect(blocked?.reason).toMatch(/no confirmation UI/);
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
  // The access the precondition resolved: one sentence per rule.
  const OWNER: PlanRule = { $type: 'AuthzDirectOwner', privileges: ['select', 'update'], permissive: true, policy_role: 'authenticated', words: 'The person the row names in owner_id.' };
  const ALL: PlanRule = { $type: 'AuthzAllowAll', privileges: ['select'], permissive: true, policy_role: 'anonymous', words: 'Everyone, for every row.' };
  const GRANTS = ['select, insert, update and delete to authenticated'];
  const created = (table: string, rules: PlanRule[], findings: PlanTableAccess['findingsAdded'] = []): PlanTableAccess => ({
    table,
    after: { rules, grants: GRANTS, rowSecurity: true },
    findingsAdded: findings,
    findingsRemoved: [],
  });
  const ACCESS: PlanTableAccess[] = [
    created('contacts', [OWNER], [{ id: 'bare-owner', level: 'high', summary: 'A removed member keeps their rows.' }]),
    { ...created('notes', [ALL]), schema: 'app_private' },
  ];

  it('says which tables are made, with their fields and each rule they get in words', () => {
    const prompt = buildConfirmPrompt(
      'provision_blueprint',
      {
        name: 'crm',
        definition: {
          tables: [
            {
              table_name: 'contacts',
              fields: [{ name: 'email', type: 'email', is_required: true }, { name: 'phone', type: 'text' }],
              policies: [{ $type: 'AuthzDirectOwner' }, { $type: 'AuthzNotReadOnly' }],
            },
            { table_name: 'notes', schema_name: 'app_private', policies: [{ $type: 'AuthzAllowAll' }] },
          ],
          relations: [{ source_table: 'contacts', target_table: 'orgs' }],
        },
      },
      { target: TARGET, access: ACCESS },
    );
    expect(prompt.title).toBe('Add 2 tables');
    expect(prompt.message).toBe(
      [
        '+ contacts',
        '    email  email  required',
        '    phone  text',
        '    rule   select update  The person the row names in owner_id.',
        '    grant  select, insert, update and delete to authenticated',
        '    ! finding (high): A removed member keeps their rows.',
        '+ notes (schema app_private)',
        '    (no fields)',
        '    rule   select  Everyone, for every row. (role anonymous)',
        '    grant  select, insert, update and delete to authenticated',
        '+ link  contacts -> orgs',
      ].join('\n'),
    );
    expect(prompt.access).toEqual(ACCESS);
    expect(prompt.preview).toEqual({
      kind: 'blueprint',
      tables: [
        {
          name: 'contacts',
          fields: [
            { name: 'email', type: 'email', isRequired: true, defaultValue: null },
            { name: 'phone', type: 'text', isRequired: false, defaultValue: null },
          ],
          policies: ['AuthzDirectOwner', 'AuthzNotReadOnly'],
          relationCount: 1,
        },
        { name: 'notes', fields: [], policies: ['AuthzAllowAll'], relationCount: 0 },
      ],
    });
  });

  it('says a new database is bound to the directory, and nothing it does not do', () => {
    const prompt = buildConfirmPrompt('provision_database', { database_name: 'shop' }, { target: NEW_DATABASE });
    expect(prompt).toEqual({
      title: 'Create database shop',
      message: ['+ database  shop', '+ .env      binds this directory to shop'].join('\n'),
      target: NEW_DATABASE,
    });
  });

  it('shows the correct access for same-named tables in different schemas', () => {
    const prompt = buildConfirmPrompt('provision_blueprint', { definition: { tables: [
      { table_name: 'posts' }, { table_name: 'posts', schema_name: 'app_private' },
    ] } }, { target: TARGET, access: [
      created('posts', [OWNER]), { ...created('posts', [ALL]), schema: 'app_private' },
    ] });
    const [defaultSchema, privateSchema] = prompt.message.split('+ posts (schema app_private)');
    expect(defaultSchema).toContain(OWNER.words);
    expect(defaultSchema).not.toContain(ALL.words);
    expect(privateSchema).toContain(ALL.words);
    expect(privateSchema).not.toContain(OWNER.words);
  });

  it('marks a changed rule even when the prose stays the same', () => {
    const before = created('posts', [{ ...OWNER, comparisonKey: 'before' }]).after;
    const access = { ...created('posts', [{ ...OWNER, comparisonKey: 'after' }]), before };
    const prompt = buildConfirmPrompt('set_access', { table_name: 'posts' }, { target: TARGET, access: [access] });
    expect(prompt.message).toMatch(/\+ +rule/);
    expect(prompt.message).toMatch(/- +rule/);
  });

  it('says a replacement binds a new, empty database, and the old one keeps its data', () => {
    const replacing: PlanTarget = { ...NEW_DATABASE, kind: 'account', replaces: { name: 'shop', id: 'db-old' } };
    const prompt = buildConfirmPrompt('replace_database', { database_name: 'shop' }, { target: replacing });
    expect(prompt).toEqual({
      title: 'Replace the database of this directory',
      message: [
        '+ database  shop (empty)',
        '~ .env      shop (db-old) -> shop',
        '= shop (db-old) keeps its data. This directory stops using it.',
      ].join('\n'),
      target: replacing,
    });
  });

  it('lists the changes of update_field, and says a type change converts the data', () => {
    const update = buildConfirmPrompt('update_field', {
      table_name: 'posts',
      field_name: 'title',
      new_name: 'headline',
      is_required: true,
      is_unique: false,
    }, { target: TARGET });
    expect(update.message).toBe('~ posts.title  rename -> headline; required; not unique');
    const retype = buildConfirmPrompt('retype_field', { table_name: 'posts', field_name: 'title', type: 'citext' }, { target: TARGET });
    expect(retype.title).toBe('Change the type of posts.title');
    expect(retype.message).toBe(['~ posts.title  -> citext', '! A value that does not convert fails the change or is lost.'].join('\n'));
  });

  it('says the rules of add_policies after and now, a limit as a limit, and the findings', () => {
    const limit: PlanRule = { $type: 'AuthzNotReadOnly', privileges: ['update'], permissive: false, policy_role: 'authenticated', words: 'Members who are not read-only.' };
    const access: PlanTableAccess = {
      table: 'posts',
      before: { rules: [], grants: GRANTS, rowSecurity: true },
      after: { rules: [OWNER, limit], grants: GRANTS, rowSecurity: true },
      findingsAdded: [
        { id: 'bare-owner', level: 'high', summary: 'A removed member keeps their rows.' },
        { id: 'required-column-not-set', level: 'medium', summary: 'A required column is left from a rule the table no longer has.', columns: ['entity_id'] },
      ],
      findingsRemoved: [{ id: 'no-policy', level: 'medium', summary: 'No one can read the rows.' }],
    };
    const prompt = buildConfirmPrompt(
      'add_policies',
      { table_name: 'posts', policies: [{ $type: 'AuthzDirectOwner', privileges: ['select', 'update'] }] },
      { target: TARGET, access: [access] },
    );
    expect(prompt.title).toBe('Add 1 rule to posts');
    expect(prompt.preview).toEqual({ kind: 'policies', tableName: 'posts', policies: ['AuthzDirectOwner'] });
    expect(prompt.message).toBe(
      [
        '~ posts',
        '    +  rule   select update  The person the row names in owner_id.',
        '    +  limit  update         Members who are not read-only.',
        '    =  grant  select, insert, update and delete to authenticated',
        '    ! finding (high): A removed member keeps their rows.',
        '    ! finding (medium): A required column is left from a rule the table no longer has. Column: entity_id.',
        '    - finding: No one can read the rows.',
      ].join('\n'),
    );
  });

  it('says when the rules stay, when the grants change and when row security turns on', () => {
    const access: PlanTableAccess = {
      table: 'posts',
      before: { rules: [OWNER], grants: [], rowSecurity: false },
      after: { rules: [OWNER], grants: GRANTS, rowSecurity: true },
      findingsAdded: [],
      findingsRemoved: [],
    };
    const prompt = buildConfirmPrompt('set_access', { table_name: 'posts', policies: [{ $type: 'AuthzDirectOwner' }] }, { target: TARGET, access: [access] });
    expect(prompt.message.split('\n')).toEqual([
      '~ posts',
      '    =  rule          select update  The person the row names in owner_id.',
      '    +  grant         select, insert, update and delete to authenticated',
      '    ~  row security  off -> on',
    ]);
  });

  it('lists the columns a change adds, and says when the rows of the table would make it fail', () => {
    const access: PlanTableAccess = {
      ...created('posts', [OWNER]),
      before: { rules: [OWNER], grants: GRANTS, rowSecurity: true },
      columnsAdded: [
        { name: 'entity_id', type: 'uuid', required: true, default: null },
        { name: 'owner_id', type: 'uuid', required: true, default: 'jwt_public.current_user_id()', computed: true },
        { name: 'is_published', type: 'boolean', required: true, default: 'false' },
        { name: 'note', type: 'text', required: false },
      ],
      columnsReused: [{ name: 'title', type: 'text', required: true, default: "'untitled'" }],
      failsIfRows: ['entity_id', 'owner_id'],
    };
    const prompt = buildConfirmPrompt('set_access', { table_name: 'posts', policies: [{ $type: 'AuthzDirectOwner' }] }, { target: TARGET, access: [access] });
    expect(prompt.message.split('\n').slice(-6)).toEqual([
      '    +  column  entity_id     uuid     required',
      '    +  column  owner_id      uuid     required  jwt_public.current_user_id() (new rows only)',
      '    +  column  is_published  boolean  required  false',
      '    +  column  note          text               default not known',
      "    =  column  title         text     required  'untitled'                                    kept as it is",
      '    ! Fails if the table has rows: entity_id and owner_id are required, and those rows get no value. This tool cannot see the rows.',
    ]);
  });

  it('prints the details of a finding under it', () => {
    const access: PlanTableAccess = {
      ...created('posts', [OWNER]),
      before: { rules: [], grants: GRANTS, rowSecurity: true },
      findingsAdded: [
        {
          id: 'reused-column-differs',
          level: 'medium',
          summary: 'A column the rules reuse is not as their node makes it.',
          columns: ['owner_id'],
          details: ['A create must send owner_id itself: the table has no default for it.'],
        },
      ],
    };
    const prompt = buildConfirmPrompt('set_access', { table_name: 'posts', policies: [{ $type: 'AuthzDirectOwner' }] }, { target: TARGET, access: [access] });
    expect(prompt.message.split('\n').slice(-2)).toEqual([
      '    ! finding (medium): A column the rules reuse is not as their node makes it. Column: owner_id.',
      '      A create must send owner_id itself: the table has no default for it.',
    ]);
  });

  it('says what set_access replaces, and that the grants stay', () => {
    const access: PlanTableAccess = { ...created('posts', [OWNER]), before: { rules: [ALL], grants: GRANTS, rowSecurity: true } };
    const prompt = buildConfirmPrompt('set_access', { table_name: 'posts', policies: [{ $type: 'AuthzDirectOwner' }] }, { target: TARGET, access: [access] });
    expect(prompt.title).toBe('Replace the rules of posts');
    expect(prompt.message.split('\n')).toEqual([
      '~ posts',
      '    +  rule   select update  The person the row names in owner_id.',
      '    -  rule   select         Everyone, for every row. (role anonymous)',
      '    =  grant  select, insert, update and delete to authenticated',
    ]);
  });

  it('says a set_access that keeps every rule, grant and column changes nothing', () => {
    const access: PlanTableAccess = { ...created('posts', [OWNER]), before: { rules: [OWNER], grants: GRANTS, rowSecurity: true } };
    const prompt = buildConfirmPrompt('set_access', { table_name: 'posts', policies: [{ $type: 'AuthzDirectOwner' }] }, { target: TARGET, access: [access] });
    expect(prompt.message.split('\n')[0]).toBe('= posts  no change');
  });

  it('ends the message with the notes the precondition resolved, and keeps them as data', () => {
    const notes = ['The backend stores the field name "is_a" as "isa".'];
    const prompt = buildConfirmPrompt('create_field', { table_name: 'posts', field_name: 'is_a', type: 'boolean' }, { target: TARGET, notes });
    expect(prompt.message.split('\n').slice(-1)).toEqual(['Note: The backend stores the field name "is_a" as "isa".']);
    expect(prompt.notes).toEqual(notes);
  });

  it('says a constant default of a number or a boolean as it is, and null as removing it', () => {
    const update = (default_value: unknown) =>
      buildConfirmPrompt('update_field', { table_name: 'posts', field_name: 'count', default_value }, { target: TARGET }).message;
    expect(update(0)).toBe('~ posts.count  default -> 0');
    expect(update(false)).toBe('~ posts.count  default -> false');
    expect(update(null)).toBe('~ posts.count  no default');
    const created = buildConfirmPrompt('create_field', { table_name: 'posts', field_name: 'count', type: 'integer', default_value: 0 }, { target: TARGET });
    expect(created.preview).toMatchObject({ field: { defaultValue: '0' } });
    const blueprint = buildConfirmPrompt(
      'provision_blueprint',
      { name: 'n', definition: { tables: [{ table_name: 'notes', fields: [{ name: 'done', type: 'boolean', default: false }] }] } },
      { target: TARGET },
    );
    expect(blueprint.message).toContain('    done  boolean    false');
  });

  it('falls back to a generic prompt for unknown tools', () => {
    const prompt = buildConfirmPrompt('mystery_tool', {}, { target: TARGET });
    expect(prompt.message).toContain('mystery_tool');
  });

  it('builds a prompt for each entity type change', () => {
    const create = buildConfirmPrompt('create_entity_type', { name: 'org' }, { target: TARGET });
    expect(create.title).toBe('Create entity type org');
    expect(create.message).toContain('+ entity type org');

    const remove = buildConfirmPrompt('delete_entity_type', { entity_type_id: 'etp-1' }, { target: TARGET });
    expect(remove.title).toBe('Delete entity type etp-1');
    expect(remove.message).toMatch(/Its table and rows stay/);
  });

  it('summarizes scope in the create_api_key prompt', async () => {
    const unscoped = buildConfirmPrompt('create_api_key', { key_name: 'deploy bot' }, { target: TARGET });
    expect(unscoped.title).toBe('Create API key deploy bot');
    expect(unscoped.message).toContain('+ API key deploy bot');
    expect(unscoped.message).toContain('unscoped');
    expect(unscoped.message).toMatch(/never to the agent/);

    const scoped = buildConfirmPrompt('create_api_key', {
      key_name: 'ci',
      entity_ids: ['e-1', 'e-2'],
      read_only: true,
    }, { target: TARGET });
    expect(scoped.message).toContain('scoped to 2 entities');
    expect(scoped.message).toContain('read-only');
  });
});
