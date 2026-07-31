import { parseSqlProgram, SchemaRouter, SqlProgram } from '@pgpmjs/transform';

import { excludeSubsystemPrograms, loadModule } from '../src';

beforeAll(async () => {
  await loadModule();
});

// One program per pgpm change, mirroring how apply materialization sees a
// source bundle: the subsystem spans several changes and the app references
// it from another.
const CHANGES: Array<[string, string]> = [
  ['identity/schema', 'CREATE SCHEMA identity;'],
  [
    'identity/users',
    `-- Deploy identity/users to pg
CREATE TABLE identity.users (
  id uuid PRIMARY KEY
);

GRANT SELECT ON TABLE identity.users TO web_user;
`
  ],
  [
    'identity/actor',
    `BEGIN;
CREATE FUNCTION identity.current_actor() RETURNS uuid AS $$
  select nullif(current_setting('request.claims.sub', true), '')::uuid;
$$ LANGUAGE sql STABLE;
COMMIT;
`
  ],
  ['app/schema', 'CREATE SCHEMA app;'],
  [
    'app/posts',
    `CREATE TABLE app.posts (
  id serial PRIMARY KEY,
  owner uuid REFERENCES identity.users(id)
);

COMMENT ON TABLE identity.users IS 'vendor-owned';

CREATE POLICY posts_owner ON app.posts USING (owner = identity.current_actor());
`
  ]
];

const selector = { schemas: ['identity'] };

function programs(): Array<[string, SqlProgram]> {
  return CHANGES.map(([name, sql]) => [name, parseSqlProgram(sql)]);
}

const router = new SchemaRouter({
  identity: {
    relations: { users: { schema: 'app_auth', name: 'users' } },
    functions: { current_actor: { schema: null, name: 'current_user_id' } }
  }
});

describe('excludeSubsystemPrograms', () => {
  it('measures the contract across all programs and tags unsatisfied refs with their program', () => {
    const res = excludeSubsystemPrograms(programs(), selector);

    const required = res.contract.required.map(d => `${d.object.schema}.${d.object.name}`).sort();
    expect(required).toEqual(['identity.current_actor', 'identity.users']);

    expect(res.unsatisfied.map(u => u.program)).toEqual(['app/posts', 'app/posts']);
  });

  it('is satisfied when the router rebinds the full contract', () => {
    const res = excludeSubsystemPrograms(programs(), selector, { rebinds: router });
    expect(res.unsatisfied).toEqual([]);
  });

  it('marks subsystem-only changes fullyExcluded, transaction control included', () => {
    const res = excludeSubsystemPrograms(programs(), selector, { rebinds: router });

    expect(res.programs.get('identity/schema')!.fullyExcluded).toBe(true);
    expect(res.programs.get('identity/users')!.fullyExcluded).toBe(true);
    expect(res.programs.get('identity/actor')!.fullyExcluded).toBe(true);
    expect(res.programs.get('app/schema')!.fullyExcluded).toBe(false);
    expect(res.programs.get('app/posts')!.fullyExcluded).toBe(false);
  });

  it('strips stray subsystem statements from surviving programs, preserving headers', () => {
    const res = excludeSubsystemPrograms(programs(), selector, { rebinds: router });

    const posts = res.programs.get('app/posts')!;
    // the opaque COMMENT ON targets a subsystem object → dropped
    expect(posts.dropped).toEqual([1]);
    expect(posts.sql).not.toMatch(/COMMENT ON/);
    expect(posts.sql).toMatch(/CREATE TABLE app\.posts/);
    expect(posts.sql).toMatch(/CREATE POLICY posts_owner/);

    const users = res.programs.get('identity/users')!;
    expect(users.dropped).toEqual([0, 1]);
  });

  it('returns the unified object graph over the same programs', () => {
    const res = excludeSubsystemPrograms(programs(), selector, { rebinds: router });

    expect(res.graph.objects.has('identity\u0000users')).toBe(true);
    expect(res.graph.programs.size).toBe(CHANGES.length);
  });
});
