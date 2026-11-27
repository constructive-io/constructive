import { createConstructiveGatePolicy } from '../src/gating/constructive-policy';
import { type ConfirmPreviewTable, type PlanTarget, renderPlan } from '../src/gating/preview';
import { buildConfirmPrompt } from '../src/gating/prompts';

const API = 'http://api.localhost:3000/graphql';
const TARGET = { kind: 'account', apiEndpoint: API, account: { userId: 'user-1' } } as const;

const products: ConfirmPreviewTable = {
  name: 'products',
  fields: [
    { name: 'title', type: 'text', isRequired: true, defaultValue: null },
    { name: 'price', type: 'numeric', isRequired: false, defaultValue: '0' }
  ],
  policies: ['AuthzDirectOwner'],
  relationCount: 1
};

describe('renderPlan', () => {
  it('prints the title, then what the change acts on, then the change list of the message', () => {
    const text = renderPlan({
      title: 'Delete table posts',
      message: '- posts  the table and all its rows\n! This cannot be undone.',
      target: {
        kind: 'database',
        database: { name: 'shop', id: '01a218ba-2e73-787a-b312-51a7231a27dd' },
        apiEndpoint: API,
        account: { userId: 'user-1', email: 'ada@example.com' },
      },
    });
    expect(text).toBe([
      'Delete table posts',
      '  database  shop (01a218ba)',
      `  backend   ${API}`,
      '  as        ada@example.com',
      '',
      '  - posts  the table and all its rows',
      '  ! This cannot be undone.',
    ].join('\n'));
  });

  it('shows a database id that is not a UUID whole', () => {
    const text = renderPlan({ title: 'Delete table posts', message: '- posts', target: { kind: 'database', database: { name: '', id: 'db-1' }, apiEndpoint: API, account: { userId: 'user-1' } } });
    expect(text.split('\n')[1]).toBe('  database  db-1');
  });

  it('names the agent a change is made as, for the person whose account it is', () => {
    const agent = { name: 'shop', principalId: 'p-1' };
    const target = (account: { userId: string; email?: string }): PlanTarget => ({ kind: 'account', apiEndpoint: API, account: { ...account, agent } });
    expect(renderPlan({ title: 'T', message: 'm', target: target({ userId: 'user-1', email: 'owner@example.com' }) }).split('\n')[2]).toBe('  as       agent shop, for owner@example.com');
    expect(renderPlan({ title: 'T', message: 'm', target: target({ userId: 'user-1' }) }).split('\n')[2]).toBe('  as       agent shop, for user user-1');
  });

  it('names the backend, the account and the replaced database of a new database', () => {
    const text = renderPlan({ title: 'Replace the database of this directory', message: 'm', target: { ...TARGET, replaces: { name: 'old', id: 'db-0' } } });
    expect(text.split('\n').slice(1, 5)).toEqual([`  backend   ${API}`, '  as        user user-1', '  replaces  old (db-0)', '']);
  });

  it('says when a request goes out with no credential', () => {
    const text = renderPlan({ title: 'Send signUp', message: 'm', target: { kind: 'no-credential', endpoint: 'http://auth.localhost:3000/graphql' } });
    expect(text.split('\n').slice(1, 4)).toEqual(['  endpoint  http://auth.localhost:3000/graphql', '  as        no one: the request carries no credential', '']);
  });
});

describe('the rows of add_records', () => {
  it('lists the first ten rows under their keys, and counts the rest', () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({ title: `Post ${index + 1}`, tags: ['a'], draft: null as unknown }));
    const { title, message } = buildConfirmPrompt('add_records', { table_name: 'posts', records: rows }, { target: TARGET });
    expect(title).toBe('Add 12 rows to posts');
    expect(message).toMatch(/^\+ 12 rows into posts\n {4}title\s+tags\s+draft\n {4}Post 1\s+\["a"\]\s+null\n/);
    expect(message).toMatch(/Post 10\b/);
    expect(message).not.toMatch(/Post 11/);
    expect(message).toMatch(/… and 2 more rows$/);
  });
});

describe('the tables of create_template', () => {
  it('lists the tables the template takes under the change, one line each', async () => {
    const policy = createConstructiveGatePolicy({
      effectOf: () => 'write',
      precondition: async () => ({ kind: 'ready', target: TARGET }),
      resolveTemplatePreview: async () => ({ kind: 'template', displayName: 'Shop', blueprintName: 'shop-v1', tables: [products, { ...products, name: '', fields: [], policies: [] }] }),
    });
    const decision = await policy.resolvePrompt({ toolName: 'create_template', toolCallId: 'tc-1', input: { displayName: 'Shop', blueprintName: 'shop-v1' } }, '/tmp');
    expect(decision.kind === 'ask' && decision.prompt.message.split('\n')).toEqual([
      '+ template Shop  from blueprint shop-v1; private until made public',
      '    products   2 fields  rules: AuthzDirectOwner',
      '    (no name)  0 fields',
    ]);
  });
});
