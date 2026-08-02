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
