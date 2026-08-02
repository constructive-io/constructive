import { getConnections, PgTestClient } from 'pgsql-test';

import { introspectViews } from '../src/pg/indexes';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  // `security_invoker` is a boolean reloption, so every spelling Postgres
  // accepts for a boolean is legal here and is stored verbatim in reloptions.
  await pg.any(`
    CREATE SCHEMA fx_viewopt;
    CREATE TABLE fx_viewopt.t (id int);
    CREATE VIEW fx_viewopt.v_true  WITH (security_invoker = true)   AS SELECT id FROM fx_viewopt.t;
    CREATE VIEW fx_viewopt.v_quoted WITH (security_invoker = 'true') AS SELECT id FROM fx_viewopt.t;
    CREATE VIEW fx_viewopt.v_on    WITH (security_invoker = on)     AS SELECT id FROM fx_viewopt.t;
    CREATE VIEW fx_viewopt.v_one   WITH (security_invoker = 1)      AS SELECT id FROM fx_viewopt.t;
    CREATE VIEW fx_viewopt.v_yes   WITH (security_invoker = 'yes')  AS SELECT id FROM fx_viewopt.t;
    CREATE VIEW fx_viewopt.v_bare  WITH (security_invoker)          AS SELECT id FROM fx_viewopt.t;
    CREATE VIEW fx_viewopt.v_off   WITH (security_invoker = off)    AS SELECT id FROM fx_viewopt.t;
    CREATE VIEW fx_viewopt.v_none                                   AS SELECT id FROM fx_viewopt.t;

    CREATE SCHEMA fx_viewwrite;
    CREATE TABLE fx_viewwrite.t (id int);
    CREATE TABLE fx_viewwrite.audit (note text);
    -- Auto-updatable: a simple view over one relation.
    CREATE VIEW fx_viewwrite.v_auto AS SELECT id FROM fx_viewwrite.t;
    -- Not updatable: an aggregate has no row to write back.
    CREATE VIEW fx_viewwrite.v_agg AS SELECT count(*) AS n FROM fx_viewwrite.t;
    -- Updatable only through a rule, which pg_get_viewdef does not show.
    CREATE VIEW fx_viewwrite.v_ruled AS SELECT id FROM fx_viewwrite.t;
    CREATE RULE v_ruled_ins AS ON INSERT TO fx_viewwrite.v_ruled
      DO INSTEAD INSERT INTO fx_viewwrite.audit (note) VALUES ('x');
    CREATE RULE v_ruled_del AS ON DELETE TO fx_viewwrite.v_ruled DO INSTEAD NOTHING;
  `);
});

afterAll(async () => {
  if (teardown) await teardown();
});

describe('introspectViews — security_invoker spellings', () => {
  it('reads every boolean spelling, not just the literal string "true"', async () => {
    const views = await introspectViews(pg.client as never, { schemas: ['fx_viewopt'] });
    const invoker = Object.fromEntries(views.map((v) => [v.name, v.securityInvoker]));
    expect(invoker).toEqual({
      v_true: true,
      v_quoted: true,
      v_on: true,
      v_one: true,
      v_yes: true,
      v_bare: true,
      v_off: false,
      v_none: false
    });
  });
});

describe('introspectViews — write paths', () => {
  it('reads updatability and the rules pg_get_viewdef does not show', async () => {
    const views = await introspectViews(pg.client as never, { schemas: ['fx_viewwrite'] });
    const byName = Object.fromEntries(views.map((v) => [v.name, v]));

    expect(byName.v_auto.writable.sort()).toEqual(['DELETE', 'INSERT', 'UPDATE']);
    expect(byName.v_auto.rules).toEqual([]);
    expect(byName.v_auto.insteadOfTriggers).toBe(false);

    expect(byName.v_agg.writable).toEqual([]);

    // The bitmask counts rule-conferred updatability too, which is why the
    // rules have to be read alongside it rather than inferred from it.
    expect(byName.v_ruled.writable).toContain('INSERT');
    expect(byName.v_ruled.rules.map((r) => [r.name, r.event, r.instead]).sort()).toEqual([
      ['v_ruled_del', 'DELETE', true],
      ['v_ruled_ins', 'INSERT', true]
    ]);
    expect(byName.v_ruled.rules[0].definition).toContain('CREATE RULE');
  });
});
