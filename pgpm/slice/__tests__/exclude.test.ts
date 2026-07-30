import { SchemaRouter } from '@pgpmjs/transform';

import { excludeSubsystem, loadModule } from '../src';

beforeAll(async () => {
  await loadModule();
});

// A vendor-neutral fixture: an `identity` subsystem the consumer wants to
// replace with its own provider, plus an app that depends on a small part
// of it (one uuid PK table + one accessor function).
const SQL = `
CREATE SCHEMA identity;
CREATE TABLE identity.users (
  id uuid PRIMARY KEY,
  secret_token text,
  recovery_token text
);
CREATE TABLE identity.sessions (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES identity.users(id)
);
CREATE FUNCTION identity.current_actor() RETURNS uuid AS $$
  select nullif(current_setting('request.claims.sub', true), '')::uuid;
$$ LANGUAGE sql STABLE;
CREATE FUNCTION identity.actor_label() RETURNS text AS $$
  select nullif(current_setting('request.claims.label', true), '')::text;
$$ LANGUAGE sql STABLE;
GRANT SELECT ON TABLE identity.users TO web_user;

CREATE SCHEMA app;
CREATE TABLE app.posts (
  id serial PRIMARY KEY,
  owner uuid REFERENCES identity.users(id)
);
CREATE POLICY posts_owner ON app.posts USING (owner = identity.current_actor());
`;

const selector = { schemas: ['identity'] };

describe('excludeSubsystem', () => {
  it('partitions subsystem statements from survivors', () => {
    const res = excludeSubsystem(SQL, selector);

    // schema + 2 tables + 2 functions + grant are inside
    expect(res.excluded).toHaveLength(6);
    // app schema + posts table + policy survive
    expect(res.kept).toHaveLength(3);
  });

  it('measures the external contract: only what survivors actually use', () => {
    const res = excludeSubsystem(SQL, selector);

    const requiredKeys = res.contract.required
      .map(d => `${d.object.schema}.${d.object.name}`)
      .sort();
    expect(requiredKeys).toEqual(['identity.current_actor', 'identity.users']);

    const users = res.contract.required.find(d => d.object.name === 'users');
    expect(users?.fk).toBe(true);
    const actor = res.contract.required.find(d => d.object.name === 'current_actor');
    expect(actor?.fk).toBe(false);

    // implementation detail nothing outside touches
    const internalNames = res.contract.internal.map(o => o.name).sort();
    expect(internalNames).toContain('sessions');
    expect(internalNames).toContain('actor_label');
  });

  it('reports every surviving reference as unsatisfied without rebinds', () => {
    const res = excludeSubsystem(SQL, selector);

    const names = [...new Set(res.unsatisfied.map(u => u.object.name))].sort();
    expect(names).toEqual(['current_actor', 'users']);
    expect(res.unsatisfied.some(u => u.fk)).toBe(true);
  });

  it('is satisfied when a router rebinds the full contract', () => {
    const router = new SchemaRouter({
      identity: {
        relations: { users: { schema: 'app', name: 'users' } },
        functions: { current_actor: { schema: null, name: 'current_user_id' } }
      }
    });
    const res = excludeSubsystem(SQL, selector, { rebinds: router });

    expect(res.unsatisfied).toEqual([]);
    expect(res.contract.required).toHaveLength(2);
  });

  it('stays unsatisfied when the rebind covers only part of the contract', () => {
    const router = new SchemaRouter({
      identity: {
        functions: { current_actor: { schema: null, name: 'current_user_id' } }
      }
    });
    const res = excludeSubsystem(SQL, selector, { rebinds: router });

    expect(res.unsatisfied.map(u => u.object.name)).toEqual(['users']);
  });

  it('accepts a whole-schema route as a resolution', () => {
    const router = new SchemaRouter({ identity: { schema: 'replacement' } });
    const res = excludeSubsystem(SQL, selector, { rebinds: router });
    expect(res.unsatisfied).toEqual([]);
  });

  it('warns on opaque statements instead of guessing', () => {
    const res = excludeSubsystem(
      SQL + "\nCOMMENT ON TABLE identity.users IS 'internal';\n",
      selector
    );
    expect(res.warnings.some(w => w.kind === 'opaque-statement')).toBe(true);
  });

  it('flags dynamic SQL in survivors', () => {
    const res = excludeSubsystem(
      SQL +
        `\nCREATE FUNCTION app.sweep() RETURNS void AS $fn$
BEGIN
  EXECUTE 'delete from ' || 'somewhere';
END;
$fn$ LANGUAGE plpgsql;\n`,
      selector
    );
    expect(res.warnings.some(w => w.kind === 'dynamic-sql')).toBe(true);
  });
});
