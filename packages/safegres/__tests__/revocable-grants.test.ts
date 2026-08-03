import { getConnections, PgTestClient } from 'pgsql-test';

import type { RoleRevocable } from '../src/checks/revocable-grants';
import { audit } from '../src/commands/audit';
import { loadConfig } from '../src/config/loader';

jest.setTimeout(300000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

const { config } = loadConfig({ sealed: true, preset: 'recommended' });

/**
 * The constructive-db shape: an exposed API schema (`l21_app`) whose policies,
 * triggers and write-time expressions call check functions living in a private
 * schema (`l21_priv`) the API does not expose. The private schema is *audited*
 * — it is in `schemas` — but it is not part of the exposure surface, so its
 * functions are never direct-call entrypoints: the only way EXECUTE on one is
 * load-bearing is if a policy/trigger/expression closure lands on it.
 *
 * `l21_anon` holds a blanket EXECUTE on every private function, the way
 * `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON FUNCTIONS TO anonymous` hands it
 * out. The rule must sort those grants into the ones a path exercises and the
 * ones nothing does.
 */
const SETUP = `
DROP SCHEMA IF EXISTS l21_app CASCADE;
DROP SCHEMA IF EXISTS l21_priv CASCADE;
CREATE SCHEMA l21_app;
CREATE SCHEMA l21_priv;

DO $$ BEGIN
  CREATE ROLE l21_anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE ROLE l21_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA l21_app, l21_priv TO l21_anon, l21_owner;

-- Reached only through perm_check's body — but perm_check is SECURITY DEFINER,
-- so the closure stops at its boundary and never follows into here. Revocable.
CREATE FUNCTION l21_priv.definer_inner()
RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
ALTER FUNCTION l21_priv.definer_inner() OWNER TO l21_owner;

-- The policy predicate. SECURITY DEFINER: l21_anon needs EXECUTE on it
-- (retained), but not on what its body calls.
CREATE FUNCTION l21_priv.perm_check(owner_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT l21_priv.definer_inner() $$;
ALTER FUNCTION l21_priv.perm_check(bigint) OWNER TO l21_owner;

-- Reached through the trigger body (which runs as l21_anon). Retained.
CREATE FUNCTION l21_priv.limit_check()
RETURNS void LANGUAGE plpgsql AS $$ BEGIN RETURN; END; $$;
ALTER FUNCTION l21_priv.limit_check() OWNER TO l21_owner;

-- An ordinary (SECURITY INVOKER) trigger function. EXECUTE on it is never
-- checked when the trigger fires, so the grant itself is revocable — but its
-- body runs as l21_anon, so what it calls (limit_check) is retained.
CREATE FUNCTION l21_priv.stamp()
RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN PERFORM l21_priv.limit_check(); RETURN NEW; END; $$;
ALTER FUNCTION l21_priv.stamp() OWNER TO l21_owner;

-- CHECK constraint predicate — runs as the writing role. Retained.
CREATE FUNCTION l21_priv.valid_body(b text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT length(b) >= 0 $$;
ALTER FUNCTION l21_priv.valid_body(text) OWNER TO l21_owner;

-- Column default expression — runs as the inserting role. Retained.
CREATE FUNCTION l21_priv.default_owner()
RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'anon'::text $$;
ALTER FUNCTION l21_priv.default_owner() OWNER TO l21_owner;

-- Nothing names it anywhere. Revocable.
CREATE FUNCTION l21_priv.dead_fn()
RETURNS void LANGUAGE sql AS $$ SELECT $$;
ALTER FUNCTION l21_priv.dead_fn() OWNER TO l21_owner;

CREATE TABLE l21_app.docs (
  id bigserial PRIMARY KEY,
  owner_id bigint NOT NULL,
  owner text NOT NULL DEFAULT l21_priv.default_owner(),
  body text NOT NULL CHECK (l21_priv.valid_body(body))
);
ALTER TABLE l21_app.docs OWNER TO l21_owner;
ALTER TABLE l21_app.docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE l21_app.docs FORCE ROW LEVEL SECURITY;

CREATE POLICY docs_visible ON l21_app.docs
  FOR SELECT TO l21_anon USING (l21_priv.perm_check(owner_id));
CREATE POLICY docs_insert ON l21_app.docs
  FOR INSERT TO l21_anon WITH CHECK (true);

CREATE TRIGGER stamp_docs BEFORE INSERT ON l21_app.docs
  FOR EACH ROW EXECUTE FUNCTION l21_priv.stamp();

GRANT SELECT, INSERT ON l21_app.docs TO l21_anon;
GRANT EXECUTE ON FUNCTION
  l21_priv.definer_inner(),
  l21_priv.perm_check(bigint),
  l21_priv.limit_check(),
  l21_priv.stamp(),
  l21_priv.valid_body(text),
  l21_priv.default_owner(),
  l21_priv.dead_fn()
TO l21_anon;
`;

/** The opaque-node schema: a policy predicate that runs dynamic SQL. */
const SETUP_OPAQUE = `
DROP SCHEMA IF EXISTS l21o_app CASCADE;
DROP SCHEMA IF EXISTS l21o_priv CASCADE;
CREATE SCHEMA l21o_app;
CREATE SCHEMA l21o_priv;

DO $$ BEGIN
  CREATE ROLE l21o_anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE ROLE l21o_owner NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA l21o_app, l21o_priv TO l21o_anon, l21o_owner;

-- The policy predicate runs dynamic SQL: the closure cannot see what it
-- touches, so every candidate it could plausibly reach must be retained.
CREATE FUNCTION l21o_priv.opaque_check(owner_id bigint)
RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE ok boolean;
BEGIN
  EXECUTE 'SELECT ' || owner_id::text || ' > 0' INTO ok;
  RETURN ok;
END;
$$;
ALTER FUNCTION l21o_priv.opaque_check(bigint) OWNER TO l21o_owner;

-- Looks dead. Must NOT be reported revocable: the opaque predicate above could
-- reach it, so it is suppressed, not revoked.
CREATE FUNCTION l21o_priv.maybe_dead()
RETURNS void LANGUAGE sql AS $$ SELECT $$;
ALTER FUNCTION l21o_priv.maybe_dead() OWNER TO l21o_owner;

CREATE TABLE l21o_app.docs (
  id bigserial PRIMARY KEY,
  owner_id bigint NOT NULL
);
ALTER TABLE l21o_app.docs OWNER TO l21o_owner;
ALTER TABLE l21o_app.docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE l21o_app.docs FORCE ROW LEVEL SECURITY;

CREATE POLICY docs_visible ON l21o_app.docs
  FOR SELECT TO l21o_anon USING (l21o_priv.opaque_check(owner_id));

GRANT SELECT ON l21o_app.docs TO l21o_anon;
GRANT EXECUTE ON FUNCTION
  l21o_priv.opaque_check(bigint),
  l21o_priv.maybe_dead()
TO l21o_anon;
`;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  await pg.any(SETUP);
  await pg.any(SETUP_OPAQUE);
});

afterAll(async () => {
  if (teardown) await teardown();
});

function objects(grants: Array<{ schema: string; object: string }>): string[] {
  return grants.map((g) => `${g.schema}.${g.object}`).sort();
}

function reasonsFor(role: RoleRevocable, object: string): string[] {
  const key = object.split('.');
  const hit = role.retained.find((g) => g.schema === key[0] && g.object === key[1]);
  return hit ? hit.reasons : [];
}

describe('L21 revocable grants — reachability closure', () => {
  it('separates revocable grants from the paths that retain them', async () => {
    const report = await audit(pg.client, {
      config,
      schemas: ['l21_app', 'l21_priv'],
      exposure: {
        schemas: ['l21_app'],
        roles: ['l21_anon'],
        anonRoles: ['l21_anon']
      },
      perf: false,
      sealed: true,
      preset: 'recommended'
    });

    const role = report.revocableGrants?.roles.find((r) => r.role === 'l21_anon');
    expect(role).toBeDefined();
    if (!role) return;

    // Nothing opaque here — the analysis is complete.
    expect(role.taint).toEqual([]);
    expect(role.suppressed).toEqual([]);

    // Revocable: the trigger function (its EXECUTE is never checked), the
    // function behind a SECURITY DEFINER boundary, and the genuinely dead one.
    expect(objects(role.revocable)).toEqual([
      'l21_priv.dead_fn',
      'l21_priv.definer_inner',
      'l21_priv.stamp'
    ]);

    // Retained, each by the path that proves it load-bearing.
    expect(objects(role.retained)).toEqual([
      'l21_priv.default_owner',
      'l21_priv.limit_check',
      'l21_priv.perm_check',
      'l21_priv.valid_body'
    ]);
    expect(reasonsFor(role, 'l21_priv.perm_check')).toEqual(['policy-predicate']);
    expect(reasonsFor(role, 'l21_priv.limit_check')).toEqual(['trigger']);
    expect(reasonsFor(role, 'l21_priv.valid_body')).toEqual(['check-constraint']);
    expect(reasonsFor(role, 'l21_priv.default_owner')).toEqual(['default-expression']);

    expect(role.summary.retainedByPolicy).toBe(1);
    expect(role.summary.retainedByTrigger).toBe(1);

    // The finding stream carries one L21 per revocable grant, never for a
    // retained one.
    const l21 = report.findings.filter((f) => f.code === 'L21');
    expect(l21.map((f) => `${f.schema}.${f.table}`).sort()).toEqual([
      'l21_priv.dead_fn',
      'l21_priv.definer_inner',
      'l21_priv.stamp'
    ]);
    expect(l21.every((f) => f.severity === 'info')).toBe(true);
  });

  it('suppresses — never revokes — behind an opaque node, and records why', async () => {
    const report = await audit(pg.client, {
      config,
      schemas: ['l21o_app', 'l21o_priv'],
      exposure: {
        schemas: ['l21o_app'],
        roles: ['l21o_anon'],
        anonRoles: ['l21o_anon']
      },
      perf: false,
      sealed: true,
      preset: 'recommended'
    });

    const role = report.revocableGrants?.roles.find((r) => r.role === 'l21o_anon');
    expect(role).toBeDefined();
    if (!role) return;

    // The dynamic-SQL predicate is recorded as the reason the closure is
    // incomplete.
    expect(role.taint.length).toBeGreaterThan(0);
    expect(role.taint.some((t) => /dynamic SQL/i.test(t.reason))).toBe(true);

    // maybe_dead is not proven unused — it is suppressed, not revoked.
    expect(objects(role.suppressed)).toContain('l21o_priv.maybe_dead');
    expect(role.revocable).toEqual([]);
    expect(report.findings.filter((f) => f.code === 'L21')).toEqual([]);
  });
});
