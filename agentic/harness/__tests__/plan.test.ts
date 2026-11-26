import { type ConfirmPreview, type ConfirmPreviewTable, renderPlan } from '../src/gating/preview';

const products: ConfirmPreviewTable = {
  name: 'products',
  fields: [
    { name: 'title', type: 'text', isRequired: true, defaultValue: null },
    { name: 'price', type: 'numeric', isRequired: false, defaultValue: '0' }
  ],
  policies: ['AuthzDirectOwner'],
  relationCount: 1
};

const TARGET = { kind: 'account', apiEndpoint: 'http://api.localhost:3000/graphql', account: { userId: 'user-1' } } as const;

const rows = Array.from({ length: 12 }, (_, index) => ({ title: `Post ${index + 1}`, tags: ['a'], draft: null as unknown }));

const cases: Array<[ConfirmPreview['kind'], ConfirmPreview, RegExp[]]> = [
  ['records', { kind: 'records', tableName: 'posts', rows }, [
    /12 rows for table "posts"/,
    /title\s+tags\s+draft/,
    /Post 1\s+\["a"\]\s+null/,
    /Post 10\b/,
    /and 2 more rows/
  ]],
  ['blueprint', { kind: 'blueprint', tables: [products] }, [
    /Table "products"/,
    /title\s+text\s+required/,
    /price\s+numeric\s+default 0/,
    /Policies: AuthzDirectOwner/,
    /Relations: 1/
  ]],
  ['template', { kind: 'template', displayName: 'Shop', blueprintName: 'shop-v1', tables: [products] }, [
    /Template "Shop" from blueprint "shop-v1"/,
    /Table "products"/
  ]],
  ['policies', { kind: 'policies', tableName: 'posts', policies: ['AuthzDirectOwner', 'AuthzAllowAll'] }, [
    /Policies for table "posts"/,
    /AuthzDirectOwner\n\s+AuthzAllowAll/
  ]],
  ['field', { kind: 'field', tableName: 'posts', field: { name: 'body', type: 'text', isRequired: true, defaultValue: "''" } }, [
    /Field on table "posts"/,
    /body\s+text\s+required\s+default ''/
  ]]
];

describe('renderPlan', () => {
  it.each(cases)('shows the %s preview under the title and the message', (_kind, preview, expected) => {
    const text = renderPlan({ title: 'Change it?', message: 'Change the project database.', target: TARGET, preview });
    expect(text.startsWith('Backend: http://api.localhost:3000/graphql\nAccount: user-1\n\nChange it?\nChange the project database.\n')).toBe(true);
    for (const pattern of expected) expect(text).toMatch(pattern);
  });

  it('names what the change acts on in its first lines', () => {
    const text = renderPlan({
      title: 'Delete table?',
      message: 'Permanently delete the table "posts" and its data.',
      target: {
        kind: 'database',
        database: { name: 'shop', id: 'db-1' },
        apiEndpoint: 'http://api.localhost:3000/graphql',
        account: { userId: 'user-1', email: 'ada@example.com' },
      },
    });
    expect(text).toBe([
      'Database: "shop" (ID db-1)',
      'Backend: http://api.localhost:3000/graphql',
      'Account: ada@example.com (user-1)',
      '',
      'Delete table?',
      'Permanently delete the table "posts" and its data.',
    ].join('\n'));
  });

  it('names the agent a change is made as, beside the person whose account it is', () => {
    const agent = { name: 'shop', principalId: 'p-1' };
    const onDatabase = renderPlan({
      title: 'Delete table?',
      message: 'Permanently delete the table "posts" and its data.',
      target: {
        kind: 'database',
        database: { name: 'shop', id: 'db-1' },
        apiEndpoint: 'http://api.localhost:3000/graphql',
        account: { userId: 'user-1', email: 'owner@example.com', agent },
      },
    });
    const onAccount = renderPlan({
      title: 'Create database?',
      message: 'Create a new database.',
      target: { kind: 'account', apiEndpoint: 'http://api.localhost:3000/graphql', account: { userId: 'user-1', agent } },
    });

    expect(onDatabase.split('\n')[2]).toBe('Account: owner@example.com (user-1), as the agent shop (ID p-1)');
    expect(onAccount.split('\n')[1]).toBe('Account: user-1, as the agent shop (ID p-1)');
  });

  it('names the backend, the account and the replaced database of a new database', () => {
    const text = renderPlan({
      title: 'Replace database?',
      message: 'Bind this directory to a new, empty database "shop".',
      target: { kind: 'account', apiEndpoint: 'http://api.localhost:3000/graphql', account: { userId: 'user-1' }, replaces: { name: 'old', id: 'db-0' } },
    });
    expect(text.split('\n').slice(0, 4)).toEqual([
      'Backend: http://api.localhost:3000/graphql',
      'Account: user-1',
      'Replaces: database "old" (ID db-0)',
      '',
    ]);
  });

  it('says when a request goes out with no credential', () => {
    const text = renderPlan({
      title: 'Send mutation?',
      message: 'Send signUp to http://auth.localhost:3000/graphql.',
      target: { kind: 'no-credential', endpoint: 'http://auth.localhost:3000/graphql' },
    });
    expect(text.split('\n').slice(0, 3)).toEqual([
      'Endpoint: http://auth.localhost:3000/graphql',
      'Account: none (no one is signed in, so the request carries no credential)',
      '',
    ]);
  });

  it('leaves out rows past the tenth', () => {
    const text = renderPlan({ title: 'Add records?', message: 'Insert 12 rows.', target: TARGET, preview: { kind: 'records', tableName: 'posts', rows } });
    expect(text).not.toMatch(/Post 11/);
  });
});
